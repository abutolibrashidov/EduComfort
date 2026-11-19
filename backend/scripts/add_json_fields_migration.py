"""
Database Migration Script: Add JSON Fields for Test Import
============================================================

This script adds the following fields to support JSON test migration:
- Exam.custom_data (Text/JSON) - stores metadata like level, unit, set, variant
- Exam.is_imported (Boolean) - flags imported tests
- ExamQuestion.additional_data (Text/JSON) - stores acceptableVariants, provided_words, etc.

Usage:
    python scripts/add_json_fields_migration.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models.exam import Exam, ExamQuestion


def check_column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in SQLite table"""
    db = SessionLocal()
    try:
        result = db.execute(text(f"PRAGMA table_info({table_name})"))
        columns = [row[1] for row in result]
        return column_name in columns
    finally:
        db.close()


def add_exam_fields():
    """Add custom_data and is_imported fields to Exam table"""
    db = SessionLocal()
    try:
        # Check if columns already exist
        has_custom_data = check_column_exists('exams', 'custom_data')
        has_is_imported = check_column_exists('exams', 'is_imported')
        
        if not has_custom_data:
            print("📝 Adding Exam.custom_data column...")
            db.execute(text("ALTER TABLE exams ADD COLUMN custom_data TEXT"))
            db.commit()
            print("✅ Exam.custom_data added successfully")
        else:
            print("⏭️  Exam.custom_data already exists")
        
        if not has_is_imported:
            print("📝 Adding Exam.is_imported column...")
            db.execute(text("ALTER TABLE exams ADD COLUMN is_imported BOOLEAN DEFAULT 0"))
            db.commit()
            print("✅ Exam.is_imported added successfully")
        else:
            print("⏭️  Exam.is_imported already exists")
            
    except Exception as e:
        print(f"❌ Error adding Exam fields: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def add_question_fields():
    """Add additional_data field to ExamQuestion table"""
    db = SessionLocal()
    try:
        has_additional_data = check_column_exists('exam_questions', 'additional_data')
        
        if not has_additional_data:
            print("📝 Adding ExamQuestion.additional_data column...")
            db.execute(text("ALTER TABLE exam_questions ADD COLUMN additional_data TEXT"))
            db.commit()
            print("✅ ExamQuestion.additional_data added successfully")
        else:
            print("⏭️  ExamQuestion.additional_data already exists")
            
    except Exception as e:
        print(f"❌ Error adding ExamQuestion fields: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def verify_migration():
    """Verify all columns were added successfully"""
    print("\n🔍 Verifying migration...")
    
    checks = [
        ('exams', 'custom_data'),
        ('exams', 'is_imported'),
        ('exam_questions', 'additional_data')
    ]
    
    all_good = True
    for table, column in checks:
        exists = check_column_exists(table, column)
        status = "✅" if exists else "❌"
        print(f"{status} {table}.{column}: {'EXISTS' if exists else 'MISSING'}")
        if not exists:
            all_good = False
    
    return all_good


def main():
    print("=" * 60)
    print("DATABASE MIGRATION: Add JSON Fields for Test Import")
    print("=" * 60)
    print()
    
    try:
        # Add fields
        add_exam_fields()
        add_question_fields()
        
        # Verify
        if verify_migration():
            print("\n✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Update app/models/exam.py to include new fields")
            print("2. Run scripts/migrate_json_tests.py to import tests")
        else:
            print("\n❌ Migration verification failed!")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
