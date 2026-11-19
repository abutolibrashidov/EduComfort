import sys
import os
import json
import glob
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.exam import Exam

def fix_sets():
    db = SessionLocal()
    try:
        base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Tests", "Elementary test")
        print(f"Scanning: {base_path}")
        
        json_files = glob.glob(os.path.join(base_path, "**", "*.json"), recursive=True)
        updated_count = 0
        
        for file_path in json_files:
            # Determine Set based on filename logic, effectively ignoring folder if it contradicts
            # Logic:
            # - Short Test 1A/1B -> Set 1
            # - Short Test 2A/2B -> Set 2
            # - Progress Test A -> Set 1
            # - Progress Test B -> Set 2
            
            filename = os.path.basename(file_path).lower()
            set_num = 1 # Default
            
            if "short test 1" in filename:
                set_num = 1
            elif "short test 2" in filename:
                set_num = 2
            elif "progress test a" in filename:
                set_num = 1
            elif "progress test b" in filename:
                set_num = 2
            else:
                # Fallback to folder name
                match = re.search(r'SET\s*(\d+)', file_path, re.IGNORECASE)
                if match:
                    set_num = int(match.group(1))
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = data.get('metadata', {})
            title = metadata.get('title') or os.path.basename(file_path).replace('.json', '')
            
            # Find exam
            exam = db.query(Exam).filter(Exam.title == title, Exam.is_imported == True).first()
            if exam:
                try:
                    current_data = json.loads(exam.custom_data) if exam.custom_data else {}
                except:
                    current_data = metadata
                    
                # Update Set
                current_data['set'] = set_num
                
                # Also ensure 'unit' is present
                if 'unit' not in current_data:
                    # Try extract from path
                    unit_match = re.search(r'UNIT\s*(\d+)', file_path, re.IGNORECASE)
                    if unit_match:
                         current_data['unit'] = int(unit_match.group(1))

                exam.custom_data = json.dumps(current_data)
                updated_count += 1
                print(f"Updated {title} -> Unit {current_data.get('unit')} Set {set_num}")
            else:
                print(f"Exam not found in DB: {title}")
        
        db.commit()
        print(f"Total updated: {updated_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_sets()
