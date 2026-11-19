"""
Script to pre-load all standardized JSON tests into the database.
Run this once to populate the test library for all teachers.

Usage:
    python scripts/preload_tests.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.json_test_importer import batch_import_tests_from_directory
from app.models.user import User
from app.models.subject import Subject


def preload_all_tests():
    """
    Pre-load all standardized tests into the database.
    These will be available for all teachers to assign to their groups.
    """
    db: Session = SessionLocal()
    
    try:
        # Find English subject
        subject = db.query(Subject).filter(Subject.name.ilike('%english%')).first()
        if not subject:
            print("❌ Error: English subject not found. Please create it first.")
            return
        
        print(f"✓ Found subject: {subject.name} (ID: {subject.id})")
        
        # Find a system/admin user to own these tests
        # Use first teacher or create a system user
        system_user = db.query(User).filter(User.role == 'teacher').first()
        if not system_user:
            print("❌ Error: No teacher found. Please create a teacher user first.")
            return
        
        print(f"✓ Using user: {system_user.first_name} {system_user.last_name or ''} (ID: {system_user.id})")
        
        # Directory containing standardized tests
        test_directory = r"c:\Users\KSM\Desktop\EduComfort\Tests\Elementary test"
        
        if not os.path.exists(test_directory):
            print(f"❌ Error: Test directory not found at {test_directory}")
            return
        
        print(f"\n🔄 Pre-loading standardized tests from: {test_directory}")
        print("=" * 60)
        
        # Import only standardized tests (Units 1, 2, 4)
        standardized_units = ['UNIT 1', 'UNIT 2', 'UNIT 4']
        imported_count = 0
        
        for unit_folder in standardized_units:
            unit_path = os.path.join(test_directory, unit_folder)
            if not os.path.exists(unit_path):
                print(f"⚠️  Skipping {unit_folder} - folder not found")
                continue
            
            print(f"\n📁 Processing {unit_folder}...")
            
            # Find all JSON files in this unit
            for root, dirs, files in os.walk(unit_path):
                for file in files:
                    if file.endswith('.json') and 'Short Test' in file:
                        file_path = os.path.join(root, file)
                        try:
                            print(f"   Importing: {file}...", end=" ")
                            
                            from app.services.json_test_importer import import_json_test
                            
                            exam = import_json_test(
                                json_file_path=file_path,
                                subject_id=subject.id,
                                institution_id=system_user.institution_id,
                                created_by_id=system_user.id,
                                db=db
                            )
                            
                            print(f"✓ (Exam ID: {exam.id})")
                            imported_count += 1
                            
                        except Exception as e:
                            print(f"✗ Failed: {str(e)[:50]}")
                            continue
        
        print("\n" + "=" * 60)
        print(f"✅ Pre-loading complete!")
        print(f"   Total tests imported: {imported_count}")
        print(f"\n📚 These tests are now available in the test library.")
        print(f"   Teachers can browse and assign them to their groups.")
        
    except Exception as e:
        print(f"\n❌ Error during pre-loading: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Pre-loading Standardized Tests into Database")
    print("=" * 60)
    print("\nThis will import all standardized tests (Units 1, 2, 4)")
    print("into the database for teachers to use.\n")
    
    confirm = input("Continue? (yes/no): ").strip().lower()
    
    if confirm == 'yes':
        preload_all_tests()
    else:
        print("Cancelled.")
