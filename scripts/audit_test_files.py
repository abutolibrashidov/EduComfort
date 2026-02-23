import sys
import os
import json
import glob
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.exam import Exam

def audit_files():
    db = SessionLocal()
    try:
        base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Tests", "Elementary test")
        print(f"Auditing: {base_path}")
        
        json_files = glob.glob(os.path.join(base_path, "**", "*.json"), recursive=True)
        print(f"{'FILE PATH':<60} | {'UNIT':<5} | {'SET':<5} | {'QUES':<5} | {'DB STATUS':<15}")
        print("-" * 110)
        
        issues_found = 0
        
        for file_path in sorted(json_files):
            rel_path = os.path.relpath(file_path, base_path)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if not content.strip():
                        print(f"{rel_path[:58]:<60} | {'-':<5} | {'-':<5} | {'0':<5} | EMPTY FILE")
                        issues_found += 1
                        continue
                    data = json.loads(content)
                
                metadata = data.get('metadata', {})
                title = metadata.get('title') or os.path.basename(file_path).replace('.json', '')
                unit = metadata.get('unit', '-')
                
                # Count questions
                q_count = 0
                for sec in data.get('sections', []):
                    q_count += len(sec.get('questions', []))
                
                # Check DB
                exam = db.query(Exam).filter(Exam.title == title, Exam.is_imported == True).first()
                if exam:
                    db_status = "IMPORTED"
                    # Check if DB has questions
                    if not exam.questions:
                        db_status = "DB_EMPTY"
                        issues_found += 1
                    
                    # Check Set assignment in DB custom_data
                    db_set = '-'
                    if exam.custom_data:
                        try:
                            cd = json.loads(exam.custom_data)
                            db_set = cd.get('set', '-')
                        except:
                            pass
                else:
                    db_status = "MISSING"
                    db_set = '-'
                    issues_found += 1
                
                print(f"{rel_path[:58]:<60} | {str(unit):<5} | {str(db_set):<5} | {str(q_count):<5} | {db_status}")

            except Exception as e:
                print(f"{rel_path[:58]:<60} | ERROR: {str(e)}")
                issues_found += 1

        print("-" * 110)
        print(f"Total Files: {len(json_files)}")
        print(f"Issues Found: {issues_found}")

    finally:
        db.close()

if __name__ == "__main__":
    audit_files()
