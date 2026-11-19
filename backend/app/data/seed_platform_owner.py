from app.core.database import SessionLocal
from app.core.models.user import User
from app.core.security import get_password_hash
from app.constants.roles import Role

def seed_platform_owner():
    db = SessionLocal()
    try:
        email = "owner@educomfort.com"
        # Check if exists
        idx = db.query(User).filter(User.email == email).first()
        if idx:
            print(f"⚠️ Platform owner already exists: {email}")
            # Update role just in case
            if idx.role != Role.PLATFORM_OWNER:
                idx.role = Role.PLATFORM_OWNER
                idx.institution_id = None # Ensure it's null
                db.commit()
                print(f"🔄 Updated {email} to PLATFORM_OWNER role")
            return

        owner = User(
            email=email,
            phone_number="+998901234567", # Placeholder
            first_name="Platform",
            last_name="Owner",
            password_hash=get_password_hash("EduOwner2026!"), # Change this after login
            role=Role.PLATFORM_OWNER, # "platform_owner"
            institution_id=None,
            is_active=True,
            is_super_admin=True, # Also super admin technically
            is_platform_admin=True
        )
        
        db.add(owner)
        db.commit()
        print(f"✅ Created Platform Owner: {email} / EduOwner2026!")
        
    except Exception as e:
        print(f"❌ Error seeding platform owner: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Seeding Platform Owner...")
    seed_platform_owner()
