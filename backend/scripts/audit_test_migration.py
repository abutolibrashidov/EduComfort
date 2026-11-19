import sys
import os
import json
import argparse
from pathlib import Path
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Add parent directory to path to import app modules if needed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import from app context if possible, otherwise define minimal models here for standalone script
try:
    from app.core.database import SessionLocal
    from app.models.exam import Exam, ExamQuestion
    print("✅ Loaded app context successfully")
except ImportError:
    print("⚠️  Could not import app context. Using standalone definitions.")
    pass


def count_questions_in_json(file_path: Path) -> int:
    """Recursively count questions in JSON structure"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        count = 0
        sections = data.get("sections", [])
        if not sections:
            # Maybe flat structure?
            pass
            
        for section in sections:
            for q_group in section.get("questions", []):
                # Check for nested content questions (like reading comprehension)
                content = q_group.get("content", {})
                if "questions" in content:
                    # e.g. Reading passage with 5 sub-questions
                    count += len(content["questions"])
                else:
                    # Single question
                    count += 1
        return count
    except Exception as e:
        print(f"❌ Error reading {file_path.name}: {e}")
        return 0

def audit_tests(tests_dir: str):
    """Compare local JSON files against Database records"""
    
    tests_path = Path(tests_dir)
    if not tests_path.exists():
        print(f"❌ Directory not found: {tests_dir}")
        print("   Please create a folder named 'json_tests' in EduComfort and copy your JSON files there.")
        return

    print(f"\n🔍 Scanning tests in directory: {tests_dir}")
    json_files = list(tests_path.rglob("*.json"))
    
    if not json_files:
        print("❌ No JSON files found in directory.")
        return
        
    print(f"📂 Found {len(json_files)} JSON files.\n")
    
    db = SessionLocal()
    try:
        # Load all imported exams
        # We assume 'custom_data' contains {"original_file": "filename.json"}
        db_exams = db.query(Exam).filter(Exam.is_imported == True).all()
        
        # Map filename -> {exam_id, db_question_count}
        db_map = {}
        for exam in db_exams:
            if not exam.custom_data:
                continue
            try:
                data = json.loads(exam.custom_data)
                original_file = data.get("original_file")
                if original_file:
                    q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).count()
                    db_map[original_file] = {
                        "id": exam.id,
                        "count": q_count,
                        "title": exam.title
                    }
            except:
                continue
                
        # Header
        print(f"{'FILE NAME':<40} | {'JSON Qs':<8} | {'DB Qs':<8} | {'STATUS':<15}")
        print("-" * 80)
        
        matches = 0
        mismatches = 0
        missing = 0
        
        for json_file in sorted(json_files, key=lambda p: p.name):
            filename = json_file.name
            
            # 1. Count JSON questions
            json_count = count_questions_in_json(json_file)
            
            # 2. Check DB
            if filename in db_map:
                db_info = db_map[filename]
                db_count = db_info["count"]
                
                if json_count == db_count:
                    status = "✅ MATCH"
                    matches += 1
                else:
                    status = f"❌ DIFF ({json_count} vs {db_count})"
                    mismatches += 1
            else:
                db_count = "N/A"
                status = "⚠️ MISSING IN DB"
                missing += 1
            
            print(f"{filename[:38]:<40} | {json_count:<8} | {str(db_count):<8} | {status:<15}")
            
        print("-" * 80)
        print(f"SUMMARY:")
        print(f"  Matched: {matches}")
        print(f"  Mismatched (Count): {mismatches}")
        print(f"  Missing in DB: {missing}")
        print("-" * 80)
        
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="json_tests", help="Path to JSON tests folder")
    args = parser.parse_args()
    
    audit_tests(args.dir)
