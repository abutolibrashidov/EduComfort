from sqlalchemy import text
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine

def add_column():
    print("Checking for ai_credits_balance column...")
    with engine.connect() as conn:
        try:
            # Check if column exists (PostgreSQL/SQLite specific check might vary, but raw try/except is robust)
            # SQLite doesn't support IF NOT EXISTS in ADD COLUMN standardly in all versions, 
            # but we can try to selecting it first.
            try:
                conn.execute(text("SELECT ai_credits_balance FROM institutions LIMIT 1"))
                print("✅ Column 'ai_credits_balance' already exists.")
            except Exception:
                print("⚠️ Column not found. Adding it...")
                # SQLite syntax
                conn.execute(text("ALTER TABLE institutions ADD COLUMN ai_credits_balance FLOAT DEFAULT 0.0"))
                conn.commit()
                print("✅ Column 'ai_credits_balance' added successfully.")
        except Exception as e:
            print(f"❌ Error adding column: {e}")

if __name__ == "__main__":
    add_column()
