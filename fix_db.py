from sqlalchemy import text
from app.core.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE teacher_ratings RENAME COLUMN student_id TO rater_id;"))
            conn.commit()
            print("Successfully renamed student_id to rater_id.")
        except Exception as e:
            print("Migration failed or already applied:", e)

if __name__ == "__main__":
    migrate()
