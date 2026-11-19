from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from loguru import logger

from app.core.database import get_db
from app.core.models.user import User
from app.core.schemas.auth import LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.core.security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM
from app.auth.dependencies import get_current_user
from app.constants.roles import Role
from jose import JWTError

from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _password_fingerprint(user: User) -> str:
    import hashlib
    return hashlib.sha256((user.password_hash or "").encode()).hexdigest()[:16]


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
            "institution_type": user.institution.institution_type if user.institution else "CENTER",
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
                "institution_type": user.institution.institution_type if user.institution else "CENTER",
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
        if is_platform_owner(target_user) or target_user.is_platform_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot impersonate Platform Owner")

    logger.warning(f"Impersonation: user_id={current_user.id} -> user_id={target_user.id}")

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
        "institution_type": target_user.institution.institution_type if target_user.institution else "CENTER",
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
    from app.core.models.institution import Institution
    from app.school.models.academic_year import AcademicYear
    from app.school.models.grade_level import GradeLevel
    from app.school.models.term import Term
    import secrets
    import string

    role = data.get("role", "student")
    # Self-registration may only create a learner or a new center/school owner.
    # Every other role is assigned by an admin of the institution.
    if role not in ("student", "super_admin"):
        raise HTTPException(status_code=403, detail="This role cannot be self-registered")
    email = data.get("email")
    phone = data.get("phone_number")
    password = data.get("password")
    full_name = data.get("full_name", "")
    institution_type = str(data.get("institution_type") or "CENTER").upper() # "CENTER" or "SCHOOL"

    if not phone and not email:
        raise HTTPException(status_code=400, detail="Phone or Email required")
    if not password or not isinstance(password, str) or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

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

    # Never trust a client-supplied institution_id: owners get a fresh institution,
    # learners register unattached and are linked by an institution admin later.
    institution_id = None
    new_inst = None
    if institution_type not in ("CENTER", "SCHOOL"):
        raise HTTPException(status_code=400, detail="institution_type must be CENTER or SCHOOL")

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

            new_inst = Institution(
                name=inst_name, 
                brand_name=inst_name, 
                subdomain=subdomain,
                institution_type=institution_type
            )
            db.add(new_inst)
            db.commit()
            db.refresh(new_inst)
            institution_id = new_inst.id
            
            # If it's a SCHOOL, seed default Academic Year and Grade Levels
            if institution_type == "SCHOOL":
                logger.info(f"Seeding Academic Year and Grade Levels for School {institution_id}")
                
                # Seed Academic Year
                current_year = datetime.utcnow().year
                new_academic_year = AcademicYear(
                    institution_id=institution_id,
                    name=f"{current_year}-{current_year + 1}",
                    start_date=datetime(current_year, 9, 1).date(),
                    end_date=datetime(current_year + 1, 6, 30).date(),
                    is_active=True
                )
                db.add(new_academic_year)
                db.flush()
                
                # Seed Grade Levels 1 through 11
                for grade_num in range(1, 12):
                    new_grade = GradeLevel(
                        institution_id=institution_id,
                        name=f"Level {grade_num}",
                        sequence=grade_num
                    )
                    db.add(new_grade)
                
                # Seed 4 Terms (Quarters/Chorak)
                term_data = [
                    ("1-chorak", 1, datetime(current_year, 9, 1).date(), datetime(current_year, 10, 31).date()),
                    ("2-chorak", 2, datetime(current_year, 11, 5).date(), datetime(current_year, 12, 28).date()),
                    ("3-chorak", 3, datetime(current_year, 1, 10).date(), datetime(current_year, 3, 20).date()),
                    ("4-chorak", 4, datetime(current_year, 4, 1).date(), datetime(current_year, 5, 25).date()),
                ]
                for name, seq, start, end in term_data:
                    # Adjust years for term 3 & 4 (since they cross the calendar year)
                    s_date = start if seq < 3 else start.replace(year=current_year + 1)
                    e_date = end if seq < 3 else end.replace(year=current_year + 1)
                    new_term = Term(
                        institution_id=institution_id,
                        academic_year_id=new_academic_year.id,
                        name=name,
                        sequence=seq,
                        start_date=s_date,
                        end_date=e_date,
                        is_active=(seq == 1) # Set 1st chorak as active by default
                    )
                    db.add(new_term)
                
                db.commit()
                
        except Exception as e:
            db.rollback()
            logger.exception(f"Error creating institution: {e}")
            raise HTTPException(status_code=500, detail="Failed to register center/school")

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

        # Generate student_token for students to link with Parents
        if role == "student":
            # 6-character alphanumeric token
            token_chars = string.ascii_uppercase + string.digits
            while True:
                token = ''.join(secrets.choice(token_chars) for _ in range(6))
                if not db.query(User).filter(User.student_token == token).first():
                    new_user.student_token = token
                    break

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"User created: {new_user.id} ({role})")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {e}")
        if new_inst is not None:
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

        raise HTTPException(status_code=500, detail="Registration failed")

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
        "institution_type": new_user.institution.institution_type if new_user.institution else "CENTER",
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
            "institution_type": new_user.institution.institution_type if new_user.institution else "CENTER",
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
        "institution_type": current_user.institution.institution_type if current_user.institution else "CENTER",
        "is_super_admin": current_user.is_super_admin,
        "is_platform_admin": current_user.is_platform_admin,
        "is_active": current_user.is_active,
        "student_token": current_user.student_token
    }


@router.get("/me/children")
def get_my_children(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch basic info, attendance, and grades for all children linked to this parent"""
    from app.core.models.parent_student import ParentStudent
    from app.academic.models.attendance import Attendance
    from app.academic.models.grade import Grade
    from app.school.models.academic_year import AcademicYear
    from app.center.models.enrollment import Enrollment
    role_str = getattr(current_user.role, 'value', current_user.role)
    if role_str != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")

    # Get all student links for this parent
    links = db.query(ParentStudent).filter(ParentStudent.parent_id == current_user.id).all()
    
    results = []
    for link in links:
        student = link.student
        if not student:
            continue
            
        # Get active enrollment and current GradeLevel for Schools
        current_grade = "N/A"
        active_year = db.query(AcademicYear).filter(
            AcademicYear.institution_id == student.institution_id,
            AcademicYear.status == "active"
        ).first()
        
        if active_year:
            from app.center.models.enrollment import Enrollment
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == student.id,
                Enrollment.academic_year_id == active_year.id,
                Enrollment.status == "active"
            ).first()
            if enrollment and enrollment.grade_level:
                current_grade = enrollment.grade_level.name

        # Get Recent Attendance (last 10 records)
        recent_attendance = db.query(Attendance).filter(
            Attendance.student_id == student.id
        ).order_by(Attendance.date.desc()).limit(10).all()
        
        attendance_summary = []
        for att in recent_attendance:
            attendance_summary.append({
                "date": att.date,
                "status": att.status,
                "group_name": att.group.name if att.group else "N/A"
            })

        # Get Recent Grades (last 10 records)
        recent_grades = db.query(Grade).filter(
            Grade.student_id == student.id
        ).order_by(Grade.date.desc()).limit(10).all()
        
        grade_summary = []
        for g in recent_grades:
            grade_summary.append({
                "date": g.date,
                "value": g.value,
                "weight": g.weight,
                "group_name": g.group.name if g.group else "N/A"
            })

        results.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "avatar": student.avatar,
            "relationship": link.relationship_type,
            "current_grade_level": current_grade,
            "attendance": attendance_summary,
            "grades": grade_summary
        })
        
    return results


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
            data={"sub": str(user.id), "purpose": "password_reset", "pwf": _password_fingerprint(user)},
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
@limiter.limit("5/minute")
def reset_password(
    request: Request,
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
    # pwf ties the link to the current password, so it stops working once used
    if not user or payload.get("pwf") != _password_fingerprint(user):
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


@router.post("/register-parent")
@limiter.limit("5/minute")
def register_parent(request: Request, data: dict, db: Session = Depends(get_db)):
    """
    Register a PARENT and link them to a STUDENT via student_token.
    """
    from app.core.models.parent_student import ParentStudent
    from app.core.security import get_password_hash

    token = data.get("student_token")
    email = data.get("email")
    phone = data.get("phone_number")
    password = data.get("password")
    full_name = data.get("full_name", "")
    relationship = data.get("relationship", "Parent")

    if not token:
        raise HTTPException(status_code=400, detail="Student Token is required")
    if not phone and not email:
        raise HTTPException(status_code=400, detail="Phone or Email required")
    if not password:
        raise HTTPException(status_code=400, detail="Password required")

    # 1. Find Student
    student = db.query(User).filter(User.student_token == token.upper()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Invalid Student Token. Please check with the school.")

    # 2. Check if Parent exists
    filters = []
    if phone: filters.append(User.phone_number == phone)
    if email: filters.append(User.email == email)
    
    from sqlalchemy import or_
    existing = db.query(User).filter(or_(*filters)).first()
    if existing:
        # If user exists, just ensure they are a parent or allow linking
        # For simplicity in this phase, we require a new account or existing one must be 'parent'
        if existing.role != Role.PARENT:
            raise HTTPException(status_code=400, detail="User already exists with a different role.")
        # Linking to an existing parent account requires that account's password
        if not verify_password(password, existing.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        parent = existing
    else:
        # Create new Parent
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        parent = User(
            email=email,
            phone_number=phone,
            password_hash=get_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            role=Role.PARENT,
            institution_id=student.institution_id,
            is_active=True
        )
        db.add(parent)
        db.commit()
        db.refresh(parent)

    # 3. Create Link
    existing_link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent.id,
        ParentStudent.student_id == student.id
    ).first()

    if not existing_link:
        new_link = ParentStudent(
            parent_id=parent.id,
            student_id=student.id,
            relationship_type=relationship
        )
        db.add(new_link)
        db.commit()

    return {"message": "Parent account registered and linked successfully"}