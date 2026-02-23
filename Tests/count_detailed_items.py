import json
import os

def count_items_in_question(question):
    """Count the number of actual scorable items/sub-questions in a question block."""
    q_type = question.get('type', '')
    content = question.get('content', {})
    
    # List of common keys that hold the list of items
    item_keys = [
        'sentences', 
        'questions', 
        'items', 
        'blanks', 
        'statements', 
        'descriptions', 
        'dialogues', # Special case, usually nested
        'exchanges',
        'definitions'
    ]
    
    count = 0
    
    # Handle nested dialogues specifically
    if 'dialogues' in content:
        for dialogue in content['dialogues']:
            for exchange in dialogue.get('exchanges', []):
                count += len(exchange.get('blanks', []))
        return count

    # Handle verb conjugation with blank1/blank2
    if q_type == 'verb-conjugation' and 'sentences' in content:
        c = 0
        for s in content['sentences']:
            if 'blank1' in s: c += 1
            if 'blank2' in s: c += 1
        return c

    # Generic check for lists
    found_list = False
    for key in item_keys:
        if key in content and isinstance(content[key], list):
            count += len(content[key])
            found_list = True
            # Don't break immediately, some might have multiple? Usually not, but let's be safe.
            # actually usually it's just one main list per question type.
            # let's break to avoid double counting if schema is weird
            break
            
    if not found_list:
        # Fallback: check metadata marks vs question marks ?? 
        # Or maybe it's a single item question?
        # Verify if content itself implies items
        pass
        
    return count if count > 0 else 1 # Default to 1 if structure is unclear but it exists

def analyze_test_items(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        total_items = 0
        section_details = []
        
        for section in data.get('sections', []):
            section_items = 0
            for q in section.get('questions', []):
                section_items += count_items_in_question(q)
            
            total_items += section_items
            section_details.append(f"{section.get('sectionName')}: {section_items}")
            
        return total_items, section_details, data.get('metadata', {})
    except Exception as e:
        return 0, [f"Error: {e}"], {}

def main():
    test_dir = r"c:\Users\KSM\Desktop\EduComfort\Tests\Elementary test"
    print(f"{'FILE':<50} | {'TYPE':<10} | {'MARKS':<5} | {'ITEMS':<5} | {'STATUS'}")
    print("-" * 100)
    
    units = {}
    
    for root, dirs, files in os.walk(test_dir):
        for f in files:
            if f.endswith('.json'):
                path = os.path.join(root, f)
                rel_path = os.path.join(os.path.basename(root), f)
                
                count, details, meta = analyze_test_items(path)
                
                test_type = meta.get('testType', '?')
                marks = meta.get('totalMarks', '?')
                
                # Determine status
                target = 70 if str(marks) == '70' else 20
                if str(marks) == '?' and 'short' in f.lower(): target = 20
                if str(marks) == '?' and 'progress' in f.lower(): target = 70
                
                status = "✅" if count == target else f"❌ ({count}/{target})"
                if count == 0: status = "⚠️ Empty/Error"
                
                print(f"{rel_path:<50} | {test_type:<10} | {marks:<5} | {count:<5} | {status}")

if __name__ == "__main__":
    main()
