import json
import os
from collections import defaultdict

def validate_test_file(file_path):
    """Validate a single test file and return issues found."""
    issues = []
    warnings = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return [f"INVALID JSON: {e}"], []
    except Exception as e:
        return [f"ERROR READING FILE: {e}"], []
    
    # Check required top-level fields
    if 'testId' not in data:
        issues.append("Missing 'testId'")
    if 'metadata' not in data:
        issues.append("Missing 'metadata'")
    if 'sections' not in data:
        issues.append("Missing 'sections'")
        return issues, warnings
    
    # Check metadata
    metadata = data.get('metadata', {})
    required_metadata = ['level', 'unit', 'unitName', 'testType', 'variant', 'title', 'source', 'totalMarks', 'estimatedTime', 'sections']
    for field in required_metadata:
        if field not in metadata:
            warnings.append(f"Missing metadata field: {field}")
    
    # Track question types
    question_types = set()
    
    # Check sections
    for section_idx, section in enumerate(data['sections']):
        section_id = section.get('sectionId', f'section_{section_idx}')
        
        if 'questions' not in section:
            issues.append(f"Section '{section_id}' missing 'questions'")
            continue
        
        # Check each question
        for q_idx, question in enumerate(section['questions']):
            q_id = question.get('questionId', f'q_{q_idx}')
            q_type = question.get('type', 'UNKNOWN')
            question_types.add(q_type)
            
            if 'type' not in question:
                issues.append(f"Question {section_id}.{q_id} missing 'type'")
            
            if 'content' not in question:
                issues.append(f"Question {section_id}.{q_id} missing 'content'")
                continue
            
            content = question['content']
            
            # Check for [MISSING] placeholders
            content_str = json.dumps(content)
            if '[MISSING]' in content_str or 'MISSING' in content_str:
                warnings.append(f"Question {section_id}.{q_id} ({q_type}) has [MISSING] placeholder content")
            
            # Type-specific validation
            if q_type == 'multiple-choice':
                if 'questions' in content:
                    for mc_q in content['questions']:
                        if isinstance(mc_q, dict):
                            if 'options' not in mc_q and 'correctAnswer' not in mc_q:
                                warnings.append(f"Question {section_id}.{q_id} ({q_type}) has incomplete multiple-choice structure")
                        
            elif 'fill' in q_type.lower():
                has_content = any(key in content for key in ['sentences', 'text', 'dialogues', 'blanks', 'emailText'])
                if not has_content:
                    warnings.append(f"Question {section_id}.{q_id} ({q_type}) missing expected content fields")
            
            elif q_type == 'error-correction':
                if 'sentences' in content:
                    for sent in content['sentences']:
                        if 'correctAnswers' not in sent and 'correction' not in sent:
                            warnings.append(f"Question {section_id}.{q_id} ({q_type}) sentence missing correction")
    
    return issues, warnings, question_types

def check_test_runner_support(question_types, test_runner_path):
    """Check if all question types are supported by test_runner.py"""
    unsupported_types = []
    
    # Read test_runner.py to find supported types
    try:
        with open(test_runner_path, 'r', encoding='utf-8') as f:
            runner_content = f.read()
        
        # Map of question types to their handler functions
        type_handlers = {
            'fill-in-blanks-dialogue': 'run_fill_in_blanks_dialogue',
            'verb-conjugation': 'run_verb_conjugation',
            'error-correction': 'run_error_correction',
            'fill-in-blanks-simple': 'run_fill_in_blanks_simple',
            'fill-and-match': 'run_fill_and_match',
            'multiple-choice': 'run_multiple_choice',
            'dialogue-multiple-choice': 'run_dialogue_multiple_choice',
            'true-false-listening': 'run_true_false_listening',
            'gap-fill-matching': 'run_gap_fill_matching',
            'guided-writing': 'run_guided_writing',
            'definition-matching': 'run_definition_matching',
            'multiple-choice-vocabulary': 'run_multiple_choice_vocabulary',
            'fill-in-blanks-conjugation': 'run_fill_in_blanks_conjugation',
            'verb-bank-fill': 'run_verb_bank_fill',
            'rewrite-negative': 'run_rewrite_negative',
            'odd-one-out': 'run_odd_one_out',
            'sentence-ordering': 'run_sentence_ordering',
            'matching': 'run_matching',
            'multiple-choice-gap-fill': 'run_multiple_choice_gap_fill',
            'fill-in-blanks-text': 'run_fill_in_blanks_text',
            'matching-paragraphs': 'run_matching_paragraphs',
            'true-false': 'run_true_false',
            'inline-choice': 'run_inline_choice',
            'text-fill-with-bank': 'run_text_fill_with_bank',
            'first-letter-fill': 'run_first_letter_fill',
            'speaker-matching': 'run_speaker_matching',
        }
        
        for q_type in question_types:
            # Check if handler exists
            handler = type_handlers.get(q_type)
            if handler and handler not in runner_content:
                unsupported_types.append(f"{q_type} (handler: {handler})")
            elif not handler:
                # Check if it's mentioned in the run_test function
                if q_type not in runner_content:
                    unsupported_types.append(f"{q_type} (no known handler)")
    
    except Exception as e:
        return [f"Error checking test runner: {e}"]
    
    return unsupported_types

def main():
    test_dir = r"c:\Users\KSM\Desktop\EduComfort\Tests\Elementary test"
    test_runner_path = r"c:\Users\KSM\Desktop\EduComfort\Tests\test_runner.py"
    
    print("=" * 80)
    print("COMPREHENSIVE TEST FILE VALIDATION")
    print("=" * 80)
    print()
    
    all_issues = {}
    all_warnings = {}
    all_question_types = set()
    
    # Find all JSON test files
    test_files = []
    for root, dirs, files in os.walk(test_dir):
        for f in files:
            if f.endswith('.json'):
                test_files.append(os.path.join(root, f))
    
    print(f"Found {len(test_files)} test files\n")
    
    # Validate each file
    for file_path in sorted(test_files):
        rel_path = os.path.relpath(file_path, test_dir)
        issues, warnings, q_types = validate_test_file(file_path)
        
        all_question_types.update(q_types)
        
        if issues:
            all_issues[rel_path] = issues
        if warnings:
            all_warnings[rel_path] = warnings
    
    # Print results
    print("\n" + "=" * 80)
    print("CRITICAL ISSUES (Must Fix)")
    print("=" * 80)
    if all_issues:
        for file, issues in all_issues.items():
            print(f"\n{file}:")
            for issue in issues:
                print(f"  ❌ {issue}")
    else:
        print("✅ No critical issues found!")
    
    print("\n" + "=" * 80)
    print("WARNINGS (Should Review)")
    print("=" * 80)
    if all_warnings:
        for file, warnings in all_warnings.items():
            print(f"\n{file}:")
            for warning in warnings:
                print(f"  ⚠️  {warning}")
    else:
        print("✅ No warnings!")
    
    print("\n" + "=" * 80)
    print("QUESTION TYPES FOUND")
    print("=" * 80)
    for q_type in sorted(all_question_types):
        print(f"  • {q_type}")
    
    print(f"\nTotal unique question types: {len(all_question_types)}")
    
    # Check test runner support
    print("\n" + "=" * 80)
    print("TEST RUNNER COMPATIBILITY CHECK")
    print("=" * 80)
    unsupported = check_test_runner_support(all_question_types, test_runner_path)
    if unsupported:
        print("⚠️  Potentially unsupported question types:")
        for item in unsupported:
            print(f"  • {item}")
    else:
        print("✅ All question types appear to be supported!")
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total test files: {len(test_files)}")
    print(f"Files with critical issues: {len(all_issues)}")
    print(f"Files with warnings: {len(all_warnings)}")
    print(f"Unique question types: {len(all_question_types)}")
    print("=" * 80)

if __name__ == "__main__":
    main()
