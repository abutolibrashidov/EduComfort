"""
Quick fix: add user_type column to users table with a safe default.
This is needed because the gamification Phase 1 (a001/a002) migration
added user_type to the User model but the column never got applied to
the live database.
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'institution'"
    ))
    db.commit()
    print("SUCCESS: user_type column added to users table")

    # Update platform admins to 'platform' type
    result = db.execute(text(
        "UPDATE users SET user_type = 'platform' WHERE is_platform_admin = true AND user_type = 'institution'"
    ))
    db.commit()
    print(f"Updated {result.rowcount} platform admin user_type to 'platform'")
except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
