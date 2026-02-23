import json
import os
from collections import defaultdict

def count_questions_in_test(file_path):
    """Count total questions in a test file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        total_questions = 0
        question_details = []
        
        for section in data.get('sections', []):
            section_name = section.get('sectionName', 'Unknown')
            section_questions = len(section.get('questions', []))
            total_questions += section_questions
            question_details.append({
                'section': section_name,
                'count': section_questions
            })
        
        return {
            'total': total_questions,
            'details': question_details,
            'metadata': data.get('metadata', {})
        }
    except Exception as e:
        return {'error': str(e)}

def main():
    test_dir = r"c:\Users\KSM\Desktop\EduComfort\Tests\Elementary test"
    
    print("=" * 100)
    print("QUESTION COUNT PER TEST SET")
    print("=" * 100)
    print()
    
    # Organize by unit
    units = {}
    
    for root, dirs, files in os.walk(test_dir):
        for f in files:
            if f.endswith('.json'):
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, test_dir)
                
                # Extract unit from path
                parts = rel_path.split(os.sep)
                if len(parts) > 0:
                    unit = parts[0]
                    if unit not in units:
                        units[unit] = []
                    
                    result = count_questions_in_test(file_path)
                    units[unit].append({
                        'file': f,
                        'path': rel_path,
                        'result': result
                    })
    
    # Print results organized by unit
    for unit in sorted(units.keys()):
        print(f"\n{'=' * 100}")
        print(f"📚 {unit}")
        print('=' * 100)
        
        total_unit_questions = 0
        
        for test_info in sorted(units[unit], key=lambda x: x['file']):
            result = test_info['result']
            
            if 'error' in result:
                print(f"\n❌ {test_info['file']}")
                print(f"   Error: {result['error']}")
                continue
            
            metadata = result['metadata']
            test_type = metadata.get('testType', 'unknown')
            variant = metadata.get('variant', '?')
            total_marks = metadata.get('totalMarks', '?')
            
            print(f"\n📝 {test_info['file']}")
            print(f"   Type: {test_type.upper()} | Variant: {variant} | Total Marks: {total_marks}")
            print(f"   Total Questions: {result['total']}")
            print(f"   Breakdown by section:")
            
            for detail in result['details']:
                print(f"      • {detail['section']}: {detail['count']} questions")
            
            total_unit_questions += result['total']
        
        print(f"\n   🔢 UNIT TOTAL: {total_unit_questions} questions across {len(units[unit])} test files")
    
    # Overall summary
    print(f"\n\n{'=' * 100}")
    print("📊 OVERALL SUMMARY")
    print('=' * 100)
    
    grand_total = 0
    total_files = 0
    
    for unit in sorted(units.keys()):
        unit_total = sum(test['result']['total'] for test in units[unit] if 'total' in test['result'])
        file_count = len(units[unit])
        grand_total += unit_total
        total_files += file_count
        
        avg_per_test = unit_total / file_count if file_count > 0 else 0
        print(f"{unit:20} | Files: {file_count:2} | Questions: {unit_total:3} | Avg per test: {avg_per_test:.1f}")
    
    print(f"\n{'=' * 100}")
    print(f"GRAND TOTAL: {grand_total} questions across {total_files} test files")
    print('=' * 100)

if __name__ == "__main__":
    main()
