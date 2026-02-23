from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.models.institution import Institution
from sqlalchemy import or_

def debug_data():
    db = SessionLocal()
    try:
        print("=== DEBUGGING LEARNERS ===")
        # Search for the specific users mentioned by the user
        targets = db.query(User).filter(
            or_(
                User.first_name.ilike("%Abduhamid%"),
                User.first_name.ilike("%Lola%"),
                User.last_name.ilike("%Mahmudov%")
            )
        ).all()
        
        if not targets:
            print("❌ No users found with names matching Abduhamid or Lola.")
        else:
            for u in targets:
                print(f"User: {u.first_name} {u.last_name}")
                print(f"  - ID: {u.id}")
                print(f"  - Role: {u.role}")
                print(f"  - Institution ID: {u.institution_id}")
                print(f"  - Is Active: {u.is_active}")
                print("-------------------------")

        print("\n=== DEBUGGING INSTITUTIONS ===")
        institutions = db.query(Institution).all()
        print(f"Total Institutions: {len(institutions)}")
        for i in institutions:
            print(f"Institution: {i.name} (ID: {i.id})")
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_data()
