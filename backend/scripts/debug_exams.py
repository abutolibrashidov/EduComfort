import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.exam import Exam

def debug_exams():
    db = SessionLocal()
    try:
        exams = db.query(Exam).filter(Exam.is_imported == True).all()
        print(f"Found {len(exams)} imported exams.")
        
        for exam in exams[:5]:
            print(f"ID: {exam.id}, Title: {exam.title}")
            print(f"Custom Data: {exam.custom_data}")
            if exam.custom_data:
                try:
                    data = json.loads(exam.custom_data)
                    print(f"Parsed Unit: {data.get('unit')}, Set: {data.get('set')}")
                except:
                    print("JSON Parse Error")
            print("-" * 20)
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_exams()
