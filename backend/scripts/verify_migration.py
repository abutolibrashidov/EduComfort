"""
Verification Script: Check Database Migration
==============================================

Verifies that all required fields were added to the database.

Usage:
    python scripts/verify_migration.py
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.core.database import SessionLocal


def check_column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in SQLite table"""
    db = SessionLocal()
    try:
        result = db.execute(text(f"PRAGMA table_info({table_name})"))
        columns = [row[1] for row in result]
        return column_name in columns
    finally:
        db.close()


def main():
    print("=" * 60)
    print("MIGRATION VERIFICATION")
    print("=" * 60)
    
    checks = [
        ('exams', 'custom_data', 'Stores level, unit, set, variant metadata'),
        ('exams', 'is_imported', 'Flags imported tests'),
        ('exam_questions', 'additional_data', 'Stores acceptableVariants, providedWords, etc.')
    ]
    
    all_good = True
    for table, column, description in checks:
        exists = check_column_exists(table, column)
        status = "✅" if exists else "❌"
        print(f"\n{status} {table}.{column}")
        print(f"   Description: {description}")
        print(f"   Status: {'EXISTS' if exists else 'MISSING'}")
        if not exists:
            all_good = False
    
    print("\n" + "=" * 60)
    if all_good:
        print("✅ All required fields exist!")
        print("\nYou can now run:")
        print("  python scripts/migrate_json_tests.py --help")
    else:
        print("❌ Some fields are missing!")
        print("\nRun the migration script:")
        print("  python scripts/add_json_fields_migration.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
