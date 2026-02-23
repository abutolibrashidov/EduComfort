import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal

def clear_assignments():
    db = SessionLocal()
    try:
        # It seems there is no explicit 'exam_assignments' table.
        # Assignments are likely handled by linking exams to groups via 'group_id' in the 'exams' table.
        # To clear assignments, we set group_id to NULL for all exams.
        
        # Also clearing any individual assignments if they exist in a many-to-many table we missed,
        # but for now, the primary mechanism seems to be the 'exams.group_id' field based on the schema.
        
        db.execute(text("UPDATE exams SET group_id = NULL"))
        db.commit()
        print("Successfully cleared group assignments from all exams.")
    except Exception as e:
        print(f"Error clearing assignments: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_assignments()
