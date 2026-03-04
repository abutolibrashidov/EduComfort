from sqlalchemy.orm import Session

from app.models.user import User
from app.constants.roles import Role
from app.core.security import get_password_hash  # ✅ Import from security


def seed_super_admin(db: Session):
    """
    Create Super Admin if it does not exist.
    Safe to run multiple times.
    """

    SUPER_ADMIN_EMAIL = "abduhamidmahmudov1@gmail.com"
    SUPER_ADMIN_PHONE = "+998993093430"
    SUPER_ADMIN_PASSWORD = "1abutolib1"

    # 🔹 Check if super admin already exists
    existing_admin = db.query(User).filter(
        User.email == SUPER_ADMIN_EMAIL
    ).first()

    if existing_admin:
        print("[INFO] Super Admin already exists")
        return

    # 🔹 Create super admin
    try:
        super_admin = User(
            email=SUPER_ADMIN_EMAIL,
            phone_number=SUPER_ADMIN_PHONE,
            first_name="James",
            last_name="Korsh",
            role=Role.PLATFORM_OWNER, # Correct role for Platform Owner
            institution_id=None, # Platform Admins are not tied to an institution
            is_super_admin=True,
            is_platform_admin=True, # ✅ THIS IS CRITICAL for Multi-Tenancy Bypass
            is_active=True,
            password_hash=get_password_hash(SUPER_ADMIN_PASSWORD),
        )
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)

        print("[INFO] Super Admin created successfully")
        print(f"📧 Email: {SUPER_ADMIN_EMAIL}")
        print(f"📞 Phone: {SUPER_ADMIN_PHONE}")
        print(f"🔑 Role: {super_admin.role}")
        print("[WARN] CHANGE PASSWORD AFTER FIRST LOGIN")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to create Super Admin: {e}")