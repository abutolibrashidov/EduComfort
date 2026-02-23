"""
Test script to verify JSON test import functionality.
Run this script to test importing a standardized JSON test file.

Usage:
    python test_json_import.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.json_test_importer import import_json_test
from app.models.user import User
from app.models.subject import Subject


def test_import_unit1_short_test_2a():
    """Test importing Unit 1 Short Test 2A"""
    db: Session = SessionLocal()
    
    try:
        # Find English subject (adjust ID as needed)
        subject = db.query(Subject).filter(Subject.name.ilike('%english%')).first()
        if not subject:
            print("❌ Error: English subject not found. Please create it first.")
            return
        
        print(f"✓ Found subject: {subject.name} (ID: {subject.id})")
        
        # Find a teacher user (adjust as needed)
        teacher = db.query(User).filter(User.role == 'teacher').first()
        if not teacher:
            print("❌ Error: No teacher found. Please create a teacher user first.")
            return
        
        print(f"✓ Found teacher: {teacher.first_name} {teacher.last_name or ''} (ID: {teacher.id})")


        
        # Path to test file
        test_file_path = r"c:\Users\KSM\Desktop\EduComfort\Tests\Elementary test\UNIT 1\SET 2\Unit 1 Short Test 2A.json"
        
        if not os.path.exists(test_file_path):
            print(f"❌ Error: Test file not found at {test_file_path}")
            return
        
        print(f"✓ Found test file: {test_file_path}")
        print("\n🔄 Importing test...")
        
        # Import the test
        exam = import_json_test(
            json_file_path=test_file_path,
            subject_id=subject.id,
            institution_id=teacher.institution_id,
            created_by_id=teacher.id,
            db=db
        )
        
        print(f"\n✅ SUCCESS! Test imported successfully!")
        print(f"   Exam ID: {exam.id}")
        print(f"   Title: {exam.title}")
        print(f"   Total Points: {exam.total_points}")
        print(f"   Duration: {exam.duration_minutes} minutes")
        print(f"   Questions: {len(exam.questions)}")
        print(f"   Status: {exam.status}")
        
        # Display question details
        print("\n📝 Questions imported:")
        for i, q in enumerate(exam.questions, 1):
            print(f"   {i}. Type: {q.question_type}, Points: {q.points}")
            if q.additional_data:
                import json
                data = json.loads(q.additional_data)
                q_type = data.get('questionType', 'unknown')
                print(f"      Original Type: {q_type}")
        
        print("\n✅ Test import completed successfully!")
        print(f"   You can now publish this exam (ID: {exam.id}) to make it available to students.")
        
    except Exception as e:
        print(f"\n❌ Error during import: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_batch_import():
    """Test batch importing all standardized tests"""
    db: Session = SessionLocal()
    
    try:
        # Find English subject
        subject = db.query(Subject).filter(Subject.name.ilike('%english%')).first()
        if not subject:
            print("❌ Error: English subject not found.")
            return
        
        # Find a teacher
        teacher = db.query(User).filter(User.role == 'teacher').first()
        if not teacher:
            print("❌ Error: No teacher found.")
            return
        
        print(f"✓ Subject: {subject.name} (ID: {subject.id})")
        print(f"✓ Teacher: {teacher.first_name} {teacher.last_name or ''} (ID: {teacher.id})")
        
        # Directory containing tests
        test_directory = r"c:\Users\KSM\Desktop\EduComfort\Tests\Elementary test"
        
        if not os.path.exists(test_directory):
            print(f"❌ Error: Test directory not found at {test_directory}")
            return
        
        print(f"\n🔄 Batch importing tests from: {test_directory}")
        
        from app.services.json_test_importer import batch_import_tests_from_directory
        
        exams = batch_import_tests_from_directory(
            directory_path=test_directory,
            subject_id=subject.id,
            institution_id=teacher.institution_id,
            created_by_id=teacher.id,
            db=db
        )
        
        print(f"\n✅ Batch import completed!")
        print(f"   Total tests imported: {len(exams)}")
        
        # Group by unit
        from collections import defaultdict
        import json
        
        by_unit = defaultdict(list)
        for exam in exams:
            if exam.custom_data:
                data = json.loads(exam.custom_data)
                unit = data.get('unit', 'Unknown')
                by_unit[unit].append(exam)
        
        print("\n📊 Tests by Unit:")
        for unit in sorted(by_unit.keys()):
            print(f"   Unit {unit}: {len(by_unit[unit])} tests")
        
    except Exception as e:
        print(f"\n❌ Error during batch import: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("JSON Test Import - Test Script")
    print("=" * 60)
    print("\nChoose an option:")
    print("1. Import single test (Unit 1 Short Test 2A)")
    print("2. Batch import all tests")
    print("3. Exit")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        test_import_unit1_short_test_2a()
    elif choice == "2":
        test_batch_import()
    elif choice == "3":
        print("Exiting...")
    else:
        print("Invalid choice. Exiting...")
