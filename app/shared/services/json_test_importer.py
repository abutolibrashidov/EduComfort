import json
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.exam import Exam, ExamQuestion, ExamStatus, QuestionType


def import_json_test(
    json_file_path: str,
    subject_id: int,
    institution_id: int,
    created_by_id: int,
    group_id: Optional[int] = None,
    db: Session = None
) -> Exam:
    """
    Import a standardized JSON test file into the database.
    
    Args:
        json_file_path: Path to the JSON test file
        subject_id: ID of the subject (e.g., English)
        institution_id: ID of the institution
        created_by_id: ID of the teacher creating the exam
        group_id: Optional group ID to assign the test to
        db: Database session
    
    Returns:
        Created Exam object
    """
    # Read JSON file
    with open(json_file_path, 'r', encoding='utf-8') as f:
        test_data = json.load(f)
    
    metadata = test_data.get('metadata', {})
    
    # Create exam record
    exam = Exam(
        title=metadata.get('title', 'Imported Test'),
        description=f"Level: {metadata.get('level', 'N/A')}, Source: {metadata.get('source', 'N/A')}",
        subject_id=subject_id,
        group_id=group_id,
        created_by_id=created_by_id,
        institution_id=institution_id,
        total_points=float(metadata.get('totalMarks', 100)),
        duration_minutes=metadata.get('estimatedTime', 30),
        passing_score=50.0,  # Default 50%
        auto_grade=True,
        show_answers=True,
        status=ExamStatus.draft,
        is_imported=True,
        custom_data=json.dumps({
            'level': metadata.get('level'),
            'unit': metadata.get('unit'),
            'unitName': metadata.get('unitName'),
            'testType': metadata.get('testType'),
            'variant': metadata.get('variant'),
            'source': metadata.get('source'),
            'testId': test_data.get('testId')
        })
    )
    
    db.add(exam)
    db.flush()  # Get exam.id
    
    # Process sections and questions
    sequence_order = 1
    sections = test_data.get('sections', [])
    
    for section in sections:
        section_name = section.get('sectionName', 'Section')
        questions = section.get('questions', [])
        
        for q_data in questions:
            question = _create_question_from_json(
                q_data=q_data,
                exam_id=exam.id,
                section_name=section_name,
                sequence_order=sequence_order
            )
            db.add(question)
            sequence_order += 1
    
    db.commit()
    db.refresh(exam)
    
    return exam


def _create_question_from_json(
    q_data: Dict,
    exam_id: int,
    section_name: str,
    sequence_order: int
) -> ExamQuestion:
    """
    Create an ExamQuestion from JSON question data.
    Maps various JSON question types to database format.
    """
    question_type = q_data.get('type')
    content = q_data.get('content', {})
    instructions = q_data.get('instructions', '')
    marks = float(q_data.get('marks', 1.0))
    
    # Base question data
    question = ExamQuestion(
        exam_id=exam_id,
        sequence_order=sequence_order,
        points=marks,
        question_text=f"[{section_name}] {instructions}",
        requires_teacher_grading=False,
        correct_answer="See additional details" # Default fallback for NOT NULL constraint
    )
    
    # Map question types
    if question_type == 'fill-in-blanks-simple':
        _map_fill_in_blanks_simple(question, content, instructions)
    
    elif question_type == 'rewrite-sentence':
        _map_rewrite_sentence(question, content, instructions)
    
    elif question_type == 'rewrite-negative':
        _map_rewrite_negative(question, content, instructions)
    
    elif question_type == 'sentence-ordering':
        _map_sentence_ordering(question, content, instructions)
    
    elif question_type == 'error-correction':
        _map_error_correction(question, content, instructions)
    
    elif question_type == 'multiple-choice-vocabulary':
        _map_multiple_choice_vocabulary(question, content, instructions)
    
    elif question_type == 'word-bank-fill':
        _map_word_bank_fill(question, content, instructions)
    
    else:
        # Fallback for unknown types
        question.question_type = QuestionType.short_answer
        question.question_text = f"{instructions}\n\n{json.dumps(content, indent=2)}"
    
    return question


def _map_fill_in_blanks_simple(question: ExamQuestion, content: Dict, instructions: str):
    """Map fill-in-blanks-simple to gap_filling type"""
    question.question_type = QuestionType.gap_filling
    
    sentences = content.get('sentences', [])
    provided_words = content.get('providedWords', [])
    
    # Build question text with all sentences
    question_parts = []
    if provided_words:
        question_parts.append(f"Word Bank: {', '.join(provided_words)}")
    
    for i, sentence in enumerate(sentences, 1):
        text = sentence.get('text', '')
        question_parts.append(f"{i}. {text}")
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    # Store all correct answers and variants in additional_data
    all_answers = []
    for sentence in sentences:
        all_answers.append({
            'sentenceId': sentence.get('sentenceId'),
            'correctAnswers': sentence.get('correctAnswers', []),
            'acceptableVariants': sentence.get('acceptableVariants', [])
        })
    
    question.additional_data = json.dumps({
        'providedWords': provided_words,
        'sentences': all_answers,
        'questionType': 'fill-in-blanks-simple'
    })
    
    # Set first correct answer as primary
    if sentences and sentences[0].get('correctAnswers'):
        question.correct_answer = sentences[0]['correctAnswers'][0]


def _map_rewrite_sentence(question: ExamQuestion, content: Dict, instructions: str):
    """Map rewrite-sentence to short_answer type"""
    question.question_type = QuestionType.short_answer
    
    items = content.get('items', [])
    
    # Build question text
    question_parts = []
    for i, item in enumerate(items, 1):
        original = item.get('original', '')
        question_parts.append(f"{i}. {original}")
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    # Store all answers
    all_answers = []
    for item in items:
        all_answers.append({
            'itemId': item.get('itemId'),
            'original': item.get('original'),
            'correctAnswer': item.get('correctAnswer'),
            'acceptableVariants': item.get('acceptableVariants', [])
        })
    
    question.additional_data = json.dumps({
        'items': all_answers,
        'questionType': 'rewrite-sentence'
    })
    
    if items and items[0].get('correctAnswer'):
        question.correct_answer = items[0]['correctAnswer']


def _map_rewrite_negative(question: ExamQuestion, content: Dict, instructions: str):
    """Map rewrite-negative to short_answer type"""
    question.question_type = QuestionType.short_answer
    
    items = content.get('items', [])
    
    question_parts = []
    for i, item in enumerate(items, 1):
        original = item.get('original', '')
        question_parts.append(f"{i}. {original}")
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    all_answers = []
    for item in items:
        all_answers.append({
            'itemId': item.get('itemId'),
            'original': item.get('original'),
            'correctAnswer': item.get('correctAnswer'),
            'acceptableVariants': item.get('acceptableVariants', [])
        })
    
    question.additional_data = json.dumps({
        'items': all_answers,
        'questionType': 'rewrite-negative'
    })
    
    if items and items[0].get('correctAnswer'):
        question.correct_answer = items[0]['correctAnswer']


def _map_sentence_ordering(question: ExamQuestion, content: Dict, instructions: str):
    """Map sentence-ordering to ordering type"""
    question.question_type = QuestionType.ordering
    
    items = content.get('items', [])
    
    question_parts = []
    for i, item in enumerate(items, 1):
        words = item.get('words', [])
        question_parts.append(f"{i}. Words: {' / '.join(words)}")
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    # Store items for ordering
    items_to_order = []
    correct_sequences = []
    
    for item in items:
        items_to_order.append({
            'id': item.get('id'),
            'words': item.get('words', [])
        })
        correct_sequences.append(item.get('correctSentence', ''))
    
    question.items_to_order = json.dumps(items_to_order)
    question.correct_sequence = json.dumps(correct_sequences)
    
    question.additional_data = json.dumps({
        'items': items,
        'questionType': 'sentence-ordering'
    })
    
    if items and items[0].get('correctSentence'):
        question.correct_answer = items[0]['correctSentence']


def _map_error_correction(question: ExamQuestion, content: Dict, instructions: str):
    """Map error-correction to short_answer type"""
    question.question_type = QuestionType.short_answer
    
    sentences = content.get('sentences', [])
    
    question_parts = []
    for i, sentence in enumerate(sentences, 1):
        text = sentence.get('sentence', '')
        question_parts.append(f"{i}. {text}")
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    all_answers = []
    for sentence in sentences:
        all_answers.append({
            'sentenceId': sentence.get('sentenceId'),
            'sentence': sentence.get('sentence'),
            'incorrectPart': sentence.get('incorrectPart'),
            'correction': sentence.get('correction'),
            'acceptableVariants': sentence.get('acceptableVariants', [])
        })
    
    question.additional_data = json.dumps({
        'sentences': all_answers,
        'questionType': 'error-correction'
    })
    
    if sentences and sentences[0].get('correction'):
        question.correct_answer = sentences[0]['correction']


def _map_multiple_choice_vocabulary(question: ExamQuestion, content: Dict, instructions: str):
    question.question_type = QuestionType.multiple_choice
    
    questions_list = content.get('questions', [])
    
    question_parts = []
    for i, q in enumerate(questions_list, 1):
        sentence = q.get('sentence', '')
        raw_options = q.get('options', [])
        
        # Normalize options to strings
        options_display = []
        for opt in raw_options:
            if isinstance(opt, dict):
                # Try 'value' or 'text' or 'label'
                val = opt.get('value') or opt.get('text') or opt.get('label') or str(opt)
                options_display.append(val)
            else:
                options_display.append(str(opt))
                
        question_parts.append(f"{i}. {sentence}")
        question_parts.append(f"   Options: {', '.join(options_display)}")
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    # For first question, set options
    if questions_list:
        first_q = questions_list[0]
        raw_options = first_q.get('options', [])
        
        # Normalize for DB columns
        options_db = []
        for opt in raw_options:
            if isinstance(opt, dict):
                val = opt.get('value') or opt.get('text') or opt.get('label') or str(opt)
                options_db.append(val)
            else:
                options_db.append(str(opt))
        
        if len(options_db) >= 1:
            question.option_a = options_db[0]
        if len(options_db) >= 2:
            question.option_b = options_db[1]
        if len(options_db) >= 3:
            question.option_c = options_db[2]
        if len(options_db) >= 4:
            question.option_d = options_db[3]
        
        question.correct_answer = first_q.get('correctAnswer', '')
    
    question.additional_data = json.dumps({
        'questions': questions_list,
        'questionType': 'multiple-choice-vocabulary'
    })


def _map_word_bank_fill(question: ExamQuestion, content: Dict, instructions: str):
    """Map word-bank-fill (email/text) to gap_filling type"""
    question.question_type = QuestionType.gap_filling
    
    provided_words = content.get('providedWords', [])
    email_text = content.get('emailText', content.get('text', ''))
    blanks = content.get('blanks', [])
    
    question_parts = []
    if provided_words:
        question_parts.append(f"Word Bank: {', '.join(provided_words)}")
    
    question_parts.append("\n" + email_text)
    
    question.question_text = f"{instructions}\n\n" + "\n".join(question_parts)
    
    question.additional_data = json.dumps({
        'providedWords': provided_words,
        'emailText': email_text,
        'blanks': blanks,
        'questionType': 'word-bank-fill'
    })
    
    if blanks and blanks[0].get('correctAnswers'):
        question.correct_answer = blanks[0]['correctAnswers'][0]


def batch_import_tests_from_directory(
    directory_path: str,
    subject_id: int,
    institution_id: int,
    created_by_id: int,
    db: Session
) -> List[Exam]:
    """
    Scan directory for JSON test files and import all.
    
    Args:
        directory_path: Root directory containing test files
        subject_id: Subject ID (e.g., English)
        institution_id: Institution ID
        created_by_id: Teacher ID
        db: Database session
    
    Returns:
        List of created Exam objects
    """
    from pathlib import Path
    
    imported_exams = []
    test_dir = Path(directory_path)
    
    # Find all JSON files
    json_files = list(test_dir.rglob('*.json'))
    
    for json_file in json_files:
        try:
            print(f"Importing: {json_file.name}")
            exam = import_json_test(
                json_file_path=str(json_file),
                subject_id=subject_id,
                institution_id=institution_id,
                created_by_id=created_by_id,
                db=db
            )
            imported_exams.append(exam)
            print(f"✓ Successfully imported: {exam.title} (ID: {exam.id})")
        except Exception as e:
            print(f"✗ Failed to import {json_file.name}: {str(e)}")
            continue
    
    return imported_exams
