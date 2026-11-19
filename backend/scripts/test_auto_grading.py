"""
Test Script: Auto-Grading Logic
================================

Tests the enhanced auto-grading logic with different scenarios.

Usage:
    python scripts/test_auto_grading.py
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.exam import Exam, ExamQuestion, ExamSubmission, ExamAnswer, ExamStatus, QuestionType, SubmissionStatus
from app.models.user import User
from app.routers.exams import auto_grade_submission
import json


def create_test_data(db):
    """Create test exam with various question types"""
    
    # Get or create a test user
    user = db.query(User).filter(User.email == "test@example.com").first()
    if not user:
        print("❌ No test user found. Please create a user first.")
        return None, None
    
    # Create test exam
    exam = Exam(
        title="Auto-Grading Test Exam",
        subject_id=1,  # Adjust as needed
        created_by_id=user.id,
        institution_id=user.institution_id,
        total_points=40.0,
        passing_score=24.0,  # 60%
        status=ExamStatus.published,
        auto_grade=True,
        is_imported=True
    )
    db.add(exam)
    db.flush()
    
    # Question 1: Exact match test
    q1 = ExamQuestion(
        exam_id=exam.id,
        question_text="What is the past tense of 'go'?",
        question_type=QuestionType.short_answer,
        points=10.0,
        sequence_order=1,
        correct_answer="went"
    )
    
    # Question 2: Acceptable variants test
    q2_additional = json.dumps({
        "acceptableVariants": ["use", "used", "using"]
    })
    q2 = ExamQuestion(
        exam_id=exam.id,
        question_text="Fill in the blank: She didn't ___ the password.",
        question_type=QuestionType.short_answer,
        points=10.0,
        sequence_order=2,
        correct_answer="use",
        additional_data=q2_additional
    )
    
    # Question 3: Fuzzy matching test
    q3 = ExamQuestion(
        exam_id=exam.id,
        question_text="Spell 'running'",
        question_type=QuestionType.short_answer,
        points=10.0,
        sequence_order=3,
        correct_answer="running"
    )
    
    # Question 4: Multiple correct answers
    q4_additional = json.dumps({
        "multipleCorrect": ["happy", "glad", "joyful"]
    })
    q4 = ExamQuestion(
        exam_id=exam.id,
        question_text="Give a synonym for 'happy'",
        question_type=QuestionType.short_answer,
        points=10.0,
        sequence_order=4,
        correct_answer="happy",
        additional_data=q4_additional
    )
    
    db.add_all([q1, q2, q3, q4])
    db.commit()
    
    return exam, user


def test_grading_scenarios(db, exam, user):
    """Test different grading scenarios"""
    
    print("\n" + "=" * 60)
    print("TESTING AUTO-GRADING SCENARIOS")
    print("=" * 60)
    
    # Create submission
    submission = ExamSubmission(
        exam_id=exam.id,
        student_id=user.id,
        status=SubmissionStatus.submitted
    )
    db.add(submission)
    db.flush()
    
    # Get questions
    questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.sequence_order).all()
    
    # Test scenarios
    test_answers = [
        ("went", "Exact match"),
        ("used", "Acceptable variant"),
        ("runing", "Fuzzy match (92% similar)"),
        ("glad", "Multiple correct answer")
    ]
    
    for i, (answer_text, scenario) in enumerate(test_answers):
        answer = ExamAnswer(
            submission_id=submission.id,
            question_id=questions[i].id,
            answer_text=answer_text
        )
        db.add(answer)
    
    db.commit()
    db.refresh(submission)
    
    # Run auto-grading
    print("\n📝 Grading submission...")
    graded_submission = auto_grade_submission(submission, db)
    
    # Display results
    print("\n" + "=" * 60)
    print("GRADING RESULTS")
    print("=" * 60)
    
    for i, (answer_text, scenario) in enumerate(test_answers):
        answer = graded_submission.answers[i]
        question = questions[i]
        
        print(f"\nQuestion {i+1}: {scenario}")
        print(f"  Student Answer: '{answer_text}'")
        print(f"  Correct Answer: '{question.correct_answer}'")
        print(f"  Points: {answer.points_earned}/{question.points}")
        
        if answer.is_correct is True:
            print(f"  Result: ✅ Correct (100%)")
        elif answer.is_correct is None:
            print(f"  Result: ⚠️  Partial Credit (50%)")
        else:
            print(f"  Result: ❌ Wrong (0%)")
    
    print("\n" + "=" * 60)
    print(f"Total Score: {graded_submission.score_obtained}/{graded_submission.total_score}")
    print(f"Percentage: {graded_submission.percentage:.1f}%")
    print(f"Status: {'✅ PASSED' if graded_submission.is_passed else '❌ FAILED'}")
    print("=" * 60)
    
    # Cleanup
    db.delete(submission)
    db.delete(exam)
    db.commit()


def main():
    db = SessionLocal()
    try:
        exam, user = create_test_data(db)
        if exam and user:
            test_grading_scenarios(db, exam, user)
        else:
            print("\n❌ Failed to create test data")
    finally:
        db.close()


if __name__ == "__main__":
    main()
