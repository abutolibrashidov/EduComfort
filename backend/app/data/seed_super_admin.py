from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.models.user import User
from app.constants.roles import Role
from app.core.security import get_password_hash  # ✅ Import from security


def seed_super_admin(db: Session):
    """
    Create the platform owner account if it does not exist.
    Credentials come from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PHONE / SUPER_ADMIN_PASSWORD
    in .env — never from source code. Safe to run multiple times.
    """

    if not (settings.SUPER_ADMIN_EMAIL and settings.SUPER_ADMIN_PASSWORD):
        print("[INFO] SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set — skipping Super Admin seeding")
        return

    # 🔹 Check if super admin already exists
    existing_admin = db.query(User).filter(
        User.email == settings.SUPER_ADMIN_EMAIL
    ).first()

    if existing_admin:
        print("[INFO] Super Admin already exists")
        return

    # 🔹 Create super admin
    try:
        super_admin = User(
            email=settings.SUPER_ADMIN_EMAIL,
            phone_number=settings.SUPER_ADMIN_PHONE or settings.SUPER_ADMIN_EMAIL,
            first_name="Platform",
            last_name="Owner",
            role=Role.PLATFORM_OWNER, # Correct role for Platform Owner
            institution_id=None, # Platform Admins are not tied to an institution
            is_super_admin=True,
            is_platform_admin=True, # ✅ THIS IS CRITICAL for Multi-Tenancy Bypass
            is_active=True,
            password_hash=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
        )
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)

        print(f"[INFO] Super Admin created: {settings.SUPER_ADMIN_EMAIL}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to create Super Admin: {e}")
