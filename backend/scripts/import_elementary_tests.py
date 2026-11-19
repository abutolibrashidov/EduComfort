import sys
import os
import json
import glob

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.exam import Exam, ExamQuestion, QuestionType, ExamStatus
from app.models.user import User
from app.models.subject import Subject
from app.models.institution import Institution

QUESTION_TYPE_MAPPING = {
    "fill-in-blanks-dialogue": QuestionType.gap_filling,
    "verb-conjugation": QuestionType.gap_filling,
    "error-correction": QuestionType.short_answer,
    "fill-in-blanks-simple": QuestionType.gap_filling,
    "fill-and-match": QuestionType.matching,
    "multiple-choice": QuestionType.multiple_choice,
    "dialogue-multiple-choice": QuestionType.multiple_choice,
    "true-false-listening": QuestionType.true_false,
    "gap-fill-matching": QuestionType.matching,
    "guided-writing": QuestionType.essay,
    "reading-matching": QuestionType.matching,
    # Unit 9 specific types
    "present-perfect-negative": QuestionType.gap_filling,
    "present-perfect-questions-yet": QuestionType.short_answer,
    "multiple-choice-verbs": QuestionType.gap_filling, 
    "word-bank-fill": QuestionType.gap_filling,
    "correct-from-list": QuestionType.gap_filling,
}

def get_or_create_subject(db, name):
    subject = db.query(Subject).filter(Subject.name == name).first()
    if not subject:
        print(f"Creating subject: {name}")
        subject = Subject(name=name, name_uz=name, name_ru=name, code=name[:3].upper())
        db.add(subject)
        db.commit()
        db.refresh(subject)
    return subject

def import_exams():
    db = SessionLocal()
    try:
        # 1. Setup Prerequisites
        admin = db.query(User).filter(User.role == "super_admin").first() or db.query(User).first()
        if not admin:
            print("No users found in database. Cannot create exams.")
            return

        institution = db.query(Institution).first()
        if not institution:
             if admin.institution_id:
                 institution = db.query(Institution).filter(Institution.id == admin.institution_id).first()
        
        if not institution:
             print("No institution found. Using ID 1 as placeholder if needed, or creating default.")
             imported_inst = Institution(name="Imported Content", type="school")
             db.add(imported_inst)
             db.commit()
             db.refresh(imported_inst)
             institution = imported_inst

        subject = get_or_create_subject(db, "English")

        # 2. Find Files
        base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Tests", "Elementary test")
        print(f"Searching in: {base_path}")
        
        json_files = glob.glob(os.path.join(base_path, "**", "*.json"), recursive=True)
        print(f"Found {len(json_files)} JSON files.")

        count_created = 0
        count_skipped = 0

        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                metadata = data.get('metadata', {})
                title = metadata.get('title') or os.path.basename(file_path).replace('.json', '')
                
                # Check duplicate
                existing = db.query(Exam).filter(Exam.title == title, Exam.is_imported == True).first()
                if existing:
                    # Cleanup incomplete imports (0 questions)
                    if not existing.questions:
                        print(f"Deleting incomplete exam: {title}")
                        db.delete(existing)
                        db.commit()
                    else:
                        print(f"Skipping existing: {title}")
                        count_skipped += 1
                        continue

                # Create Exam
                exam = Exam(
                    title=title,
                    description=f"Imported from {metadata.get('source', 'Unknown source')}",
                    subject_id=subject.id,
                    created_by_id=admin.id,
                    institution_id=institution.id,
                    total_points=metadata.get('totalMarks', 100),
                    duration_minutes=metadata.get('estimatedTime', 60),
                    passing_score=50, # Default
                    status=ExamStatus.published, # Publish immediately for library
                    auto_grade=True,
                    is_imported=True,
                    custom_data=json.dumps(metadata)
                )
                db.add(exam)
                db.commit()
                db.refresh(exam)

                # Create Questions
                sections = data.get('sections', [])
                seq_order = 1
                
                for section in sections:
                    questions = section.get('questions', [])
                    for q in questions:
                        q_type_str = q.get('type')
                        mapped_type = QUESTION_TYPE_MAPPING.get(q_type_str, QuestionType.short_answer)
                        
                        question_text = q.get('instructions')
                        # Fallback for question text if instructions are missing
                        if not question_text:
                            content = q.get('content', {})
                            if isinstance(content, dict):
                                question_text = content.get('prompt') or content.get('title') or "Answer the following question:"
                        
                        # Store full content in additional_data for the frontend to render
                        additional_data = q.get('content', {})
                        # Also store the original type so frontend can choose specific component
                        additional_data['original_type'] = q_type_str
                        
                        # Fix for NOT NULL constraint on correct_answer
                        # We provide a placeholder or extract a simple answer if possible
                        correct_answer_val = "[See Additional Data]" 
                        
                        db_question = ExamQuestion(
                            exam_id=exam.id,
                            question_text=question_text or "Question",
                            question_type=mapped_type,
                            points=q.get('marks', 1),
                            sequence_order=seq_order,
                            additional_data=json.dumps(additional_data),
                            requires_teacher_grading=True if mapped_type == QuestionType.essay else False,
                            correct_answer=correct_answer_val 
                        )
                        db.add(db_question)
                        seq_order += 1
                
                db.commit()
                print(f"Imported: {title} ({seq_order-1} questions)")
                count_created += 1

            except Exception as e:
                print(f"Error processing {file_path}: {e}")
                db.rollback()

        print(f"\nSummary: {count_created} created, {count_skipped} skipped.")

    finally:
        db.close()

if __name__ == "__main__":
    import_exams()
