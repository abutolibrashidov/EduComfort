import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal

def list_tables():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = [row[0] for row in result]
        print("Tables in database:")
        for table in tables:
            print(f" - {table}")
    except Exception as e:
        print(f"Error listing tables: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_tables()
