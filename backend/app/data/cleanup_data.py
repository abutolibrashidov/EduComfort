from app.core.database import SessionLocal
from app.core.models.user import User
from app.core.models.institution import Institution
from sqlalchemy import or_

def cleanup_data():
    db = SessionLocal()
    try:
        print("=== FIXING LEARNERS ===")
        # 1. Fix Abduhamid and Lola to be Individual Learners (institution_id = None)
        targets = db.query(User).filter(
            or_(
                User.first_name.ilike("%Abduhamid%"),
                User.first_name.ilike("%Lola%")
            )
        ).all()
        
        for u in targets:
            print(f"Update: Unassigning {u.first_name} {u.last_name} from Inst ID {u.institution_id}")
            u.institution_id = None
        
        db.commit()
        
        print("\n=== CLEANING TEST INSTITUTIONS ===")
        # 2. Delete test institutions
        test_names = ["Center A", "Center B", "Center amvwu", "Center amvwu1", "English center"] 
        # Note: Keeping 'Seven Plus Academy' and 'EduComfort' as they seem real-ish or important
        
        deleted_count = 0
        institutions = db.query(Institution).filter(
            or_(*[Institution.name.ilike(f"%{name}%") for name in test_names])
        ).all()
        
        for inst in institutions:
            print(f"Deleting Institution: {inst.name} (ID: {inst.id})")
            db.delete(inst)
            deleted_count += 1
            
        db.commit()
        print(f"✅ Cleanup Complete. Unassigned {len(targets)} learners. Deleted {deleted_count} institutions.")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_data()
