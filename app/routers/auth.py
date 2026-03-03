from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from loguru import logger

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.core.security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM
from app.auth.dependencies import get_current_user
from app.constants.roles import Role
from jose import jwt, JWTError

from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email OR phone number (5 attempts per minute per IP)"""
    login_val = data.login.strip()
    logger.info(f"Login attempt: '{login_val}'")

    try:
        user = (
            db.query(User)
            .filter((User.email == login_val) | (User.phone_number == login_val))
            .first()
        )

        if not user:
            logger.warning(f"Login failed: user not found for '{login_val}'")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not verify_password(data.password, user.password_hash):
            logger.warning(f"Login failed: password mismatch for '{login_val}'")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not user.is_active:
            logger.warning(f"Login failed: inactive user '{login_val}'")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

        role_value = user.role if isinstance(user.role, str) else user.role.value

        access_token = create_access_token({
            "sub": str(user.id),
            "user_id": user.id,
            "role": role_value,
            "email": user.email,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "branch_id": user.branch_id,
            "institution_id": user.institution_id,
            "institution_name": user.institution.name if user.institution else None,
            "institution_logo": user.institution.logo_url if user.institution else None,
            "is_super_admin": user.is_super_admin,
            "is_platform_admin": user.is_platform_admin,
            "is_active": user.is_active
        })

        logger.info(f"Login successful for user_id={user.id} role={role_value}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "phone_number": user.phone_number,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role_value,
                "branch_id": user.branch_id,
                "institution_id": user.institution_id,
                "institution_name": user.institution.name if user.institution else None,
                "institution_logo": user.institution.logo_url if user.institution else None,
                "is_super_admin": user.is_super_admin,
                "is_active": user.is_active
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login critical error for '{data.login}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to an internal error"
        )


@router.post("/impersonate/{user_id}")
def impersonate_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Super Admin or Platform Owner can impersonate any user"""
    from app.security.permissions import is_super_admin, is_platform_owner
    is_platform_owner_check = is_platform_owner(current_user)
    is_inst_admin = is_super_admin(current_user)

    if not is_platform_owner_check and not is_inst_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to impersonate")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not is_platform_owner_check:
        if target_user.institution_id != current_user.institution_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot impersonate user from another institution")
        if target_user.role == Role.PLATFORM_OWNER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot impersonate Platform Owner")

    role_value = target_user.role if isinstance(target_user.role, str) else target_user.role.value

    access_token = create_access_token({
        "sub": str(target_user.id),
        "user_id": target_user.id,
        "role": role_value,
        "email": target_user.email,
        "phone_number": target_user.phone_number,
        "first_name": target_user.first_name,
        "last_name": target_user.last_name,
        "branch_id": target_user.branch_id,
        "institution_id": target_user.institution_id,
        "institution_name": target_user.institution.name if target_user.institution else None,
        "institution_logo": target_user.institution.logo_url if target_user.institution else None,
        "is_super_admin": target_user.is_super_admin,
        "is_platform_admin": target_user.is_platform_admin,
        "is_active": target_user.is_active
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "phone_number": target_user.phone_number,
            "first_name": target_user.first_name,
            "last_name": target_user.last_name,
            "role": role_value,
        }
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register(request: Request, data: dict, db: Session = Depends(get_db)):
    """
    Register a new user.
    - If role is 'super_admin', creates a new Institution (Center).
    - If role is 'student', registers as Individual Learner.
    """
    from app.core.security import get_password_hash
    from app.models.institution import Institution

    role = data.get("role", "student")
    email = data.get("email")
    phone = data.get("phone_number")
    password = data.get("password")
    full_name = data.get("full_name", "")

    if not phone and not email:
        raise HTTPException(status_code=400, detail="Phone or Email required")
    if not password:
        raise HTTPException(status_code=400, detail="Password required")

    filters = []
    if phone:
        filters.append(User.phone_number == phone)
    if email:
        filters.append(User.email == email)

    if filters:
        from sqlalchemy import or_
        existing = db.query(User).filter(or_(*filters)).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")

    parts = full_name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    institution_id = data.get("institution_id")

    if role == "super_admin":
        inst_name = data.get("institution_name")
        if not inst_name:
            raise HTTPException(status_code=400, detail="Institution Name required for Center Owners")

        try:
            import re
            base_subdomain = re.sub(r'[^a-z0-9]', '', inst_name.lower())
            if not base_subdomain:
                base_subdomain = "inst" + str(int(datetime.utcnow().timestamp()))

            subdomain = base_subdomain
            counter = 1
            while db.query(Institution).filter(Institution.subdomain == subdomain).first():
                subdomain = f"{base_subdomain}{counter}"
                counter += 1

            new_inst = Institution(name=inst_name, brand_name=inst_name, subdomain=subdomain)
            db.add(new_inst)
            db.commit()
            db.refresh(new_inst)
            institution_id = new_inst.id
        except Exception as e:
            db.rollback()
            logger.exception(f"Error creating institution: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to register center: {str(e)}")

    if role in ["admin", "super_admin"] and not institution_id:
        logger.error(f"Registration Attempt Failed: Role={role} but institution_id={institution_id}")
        raise HTTPException(status_code=400, detail="Admins must have an institution. Please provide institution_name.")

    try:
        new_user = User(
            email=email,
            phone_number=phone,
            password_hash=get_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            role=role,
            institution_id=institution_id,
            is_active=True,
            is_super_admin=(role == "super_admin"),
            is_platform_admin=False
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"User created: {new_user.id} ({role})")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {e}")
        if role in ["admin", "super_admin"] and institution_id and data.get("institution_name"):
            try:
                db.delete(new_inst)
                db.commit()
            except:
                pass

        error_msg = str(e).lower()
        if "unique" in error_msg or "integrity" in error_msg:
            if "email" in error_msg:
                raise HTTPException(status_code=400, detail="Email already registered")
            if "phone" in error_msg:
                raise HTTPException(status_code=400, detail="Phone number already registered")

        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    role_value = new_user.role if isinstance(new_user.role, str) else new_user.role.value

    access_token = create_access_token({
        "sub": str(new_user.id),
        "user_id": new_user.id,
        "role": role_value,
        "email": new_user.email,
        "phone_number": new_user.phone_number,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "branch_id": new_user.branch_id,
        "institution_id": new_user.institution_id,
        "institution_name": new_user.institution.name if new_user.institution else None,
        "institution_logo": new_user.institution.logo_url if new_user.institution else None,
        "is_super_admin": new_user.is_super_admin,
        "is_platform_admin": new_user.is_platform_admin,
        "is_active": new_user.is_active
    })

    return {
        "message": "User registered successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "phone_number": new_user.phone_number,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "role": role_value,
            "branch_id": new_user.branch_id,
            "institution_id": new_user.institution_id,
            "institution_name": new_user.institution.name if new_user.institution else None,
            "institution_logo": new_user.institution.logo_url if new_user.institution else None,
            "is_super_admin": new_user.is_super_admin,
            "is_active": new_user.is_active
        }
    }


@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user details"""
    role_value = current_user.role if isinstance(current_user.role, str) else current_user.role.value

    return {
        "id": current_user.id,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": role_value,
        "branch_id": current_user.branch_id,
        "institution_id": current_user.institution_id,
        "institution_name": current_user.institution.name if current_user.institution else None,
        "institution_logo": current_user.institution.logo_url if current_user.institution else None,
        "is_super_admin": current_user.is_super_admin,
        "is_platform_admin": current_user.is_platform_admin,
        "is_active": current_user.is_active
    }


# ---------------------------------------------------------------------------
# Password Reset — Forgot Password
# ---------------------------------------------------------------------------

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Send a password-reset link to the user's email.
    Always returns 200 to prevent user-enumeration attacks.
    """
    from app.utils.email import send_email, password_reset_email
    from app.core.config import settings as app_settings

    login_val = data.login.strip()
    user = (
        db.query(User)
        .filter((User.email == login_val) | (User.phone_number == login_val))
        .first()
    )

    if user and user.email:
        reset_token = create_access_token(
            data={"sub": str(user.id), "purpose": "password_reset"},
            expires_delta=timedelta(hours=1),
        )

        # ✅ FIX: Use FRONTEND_URL from settings — not CORS_ORIGINS
        # Development:  FRONTEND_URL=http://localhost:5173  (in .env)
        # Production:   FRONTEND_URL=https://educomfort.uz  (in VPS .env)
        reset_url = app_settings.FRONTEND_URL + "/reset-password?token=" + reset_token

        send_email(
            to=user.email,
            subject="EduComfort — Password Reset",
            html=password_reset_email(reset_url, user.first_name or "User"),
        )
        logger.info(f"Password reset email sent to user_id={user.id}")
    else:
        logger.warning(f"Password reset requested for unknown login: '{login_val}'")

    return {"message": "If an account with that email exists, a reset link has been sent."}


# ---------------------------------------------------------------------------
# Password Reset — Confirm New Password
# ---------------------------------------------------------------------------

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Validate the reset token and set a new password."""
    from jose import jwt as jose_jwt

    bad_token = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token",
    )

    try:
        payload = jose_jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        purpose = payload.get("purpose")
        if purpose != "password_reset" or not user_id:
            raise bad_token
    except JWTError:
        raise bad_token

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise bad_token

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    user.password_hash = get_password_hash(data.new_password)
    db.commit()
    logger.info(f"Password reset successful for user_id={user.id}")
    return {"message": "Password updated successfully. You can now log in."}