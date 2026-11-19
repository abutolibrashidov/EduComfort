from app.core.database import engine
from sqlalchemy import text

def fix_schema():
    print("Attempting to drop 'announcements' table...")
    with engine.connect() as conn:
        try:
            conn.execute(text("DROP TABLE IF EXISTS announcements"))
            conn.commit()
            print("Successfully dropped 'announcements' table.")
            print("Please restart your backend server. The table will be recreated automatically with the new schema.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    fix_schema()
