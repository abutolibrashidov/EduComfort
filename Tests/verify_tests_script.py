import json
import os
import sys

# Mock runner logic to test schema
def validate_schema(data):
    issues = []
    if 'testId' not in data: issues.append("Missing testId")
    if 'metadata' not in data: issues.append("Missing metadata")
    if 'sections' not in data: issues.append("Missing sections")
    
    if issues: return issues

    for section in data['sections']:
        if 'questions' not in section:
            issues.append(f"Section {section.get('sectionId')} missing questions")
            continue
            
        for q in section['questions']:
            q_type = q.get('type', 'unknown')
            content = q.get('content', {})
            
            # Basic checks based on type (simplified)
            if 'fill' in q_type and 'sentences' not in content and 'text' not in content and 'dialogues' not in content:
                # Some fill types allow just 'options' or 'blanks' in content?
                # Check specifics
                pass
            
            if q_type == 'multiple-choice' and 'questions' not in content:
                 issues.append(f"Question {q.get('questionId')} ({q_type}) missing 'questions' list in content")

    return issues

def main():
    test_dir = r"c:\Users\KSM\Desktop\Tests"
    print(f"Scanning {test_dir}...")
    
    for root, dirs, files in os.walk(test_dir):
        for f in files:
            if f.endswith('.json') and f != 'package.json': 
                path = os.path.join(root, f)
                print(f"Checking {f}...", end=" ")
                try:
                    with open(path, 'r', encoding='utf-8') as json_file:
                        data = json.load(json_file)
                    
                    issues = validate_schema(data)
                    if issues:
                        print("ISSUES FOUND:")
                        for i in issues: print(f"  - {i}")
                    else:
                        print("OK")
                except json.JSONDecodeError as e:
                    print(f"INVALID JSON: {e}")
                except Exception as e:
                    print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
