import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal

def unpublish_exams():
    db = SessionLocal()
    try:
        # Set all exams to 'draft' status
        # This will hide them from the student dashboard which filters by 'published'
        db.execute(text("UPDATE exams SET status = 'draft'"))
        db.commit()
        print("Successfully unpublished all exams (status set to 'draft').")
    except Exception as e:
        print(f"Error unpublishing exams: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    unpublish_exams()
