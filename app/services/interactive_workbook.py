"""
Interactive Workbook Service - Full Solutions Book Structure
Supports Levels, Books, Units, Lessons, Exercises, Auto-checking, Student Submissions, and Progress
"""

from datetime import datetime
from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app.models.interactive_workbook import (
    InteractiveWorkbook,
    WorkbookExercise,
    StudentExerciseSubmission,
    WorkbookProgress,
    ExerciseTypeEnum,
)
from app.models.user import User
from app.schemas.interactive_workbook import (
    InteractiveWorkbookCreate,
    InteractiveWorkbookUpdate,
    WorkbookExerciseCreate,
    StudentExerciseSubmissionCreate,
)

# ----------------------------- BOOK / LEVEL / UNIT / LESSON OPERATIONS -----------------------------

def create_workbook(db: Session, workbook_in: InteractiveWorkbookCreate, created_by: User) -> InteractiveWorkbook:
    """
    Create a workbook (represents a Student Book or Workbook)
    """
    workbook = InteractiveWorkbook(
        title=workbook_in.title,
        description=workbook_in.description,
        subject_id=workbook_in.subject_id,
        level=workbook_in.level,
        difficulty_level=workbook_in.difficulty_level,
        created_by_id=created_by.id,
        status="draft"
    )
    db.add(workbook)
    db.commit()
    db.refresh(workbook)
    return workbook


def update_workbook(db: Session, workbook: InteractiveWorkbook, workbook_in: InteractiveWorkbookUpdate) -> InteractiveWorkbook:
    for field, value in workbook_in.dict(exclude_unset=True).items():
        setattr(workbook, field, value)
    db.commit()
    db.refresh(workbook)
    return workbook


def delete_workbook(db: Session, workbook: InteractiveWorkbook):
    db.delete(workbook)
    db.commit()


def get_workbook(db: Session, workbook_id: int) -> Optional[InteractiveWorkbook]:
    return db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()


def list_workbooks(db: Session, subject_id: Optional[int] = None, level: Optional[str] = None) -> List[InteractiveWorkbook]:
    query = db.query(InteractiveWorkbook)
    if subject_id:
        query = query.filter(InteractiveWorkbook.subject_id == subject_id)
    if level:
        query = query.filter(InteractiveWorkbook.level == level)
    return query.all()


# ----------------------------- EXERCISE / LESSON OPERATIONS -----------------------------

def add_exercise(
    db: Session,
    workbook: InteractiveWorkbook,
    unit_name: str,
    lesson_name: str,
    exercise_in: WorkbookExerciseCreate
) -> WorkbookExercise:
    """
    Add an exercise inside a specific Unit and Lesson
    """
    exercise = WorkbookExercise(
        workbook_id=workbook.id,
        exercise_number=exercise_in.exercise_number,
        exercise_type=exercise_in.exercise_type.value,
        exercise_text=exercise_in.exercise_text,
        instructions=exercise_in.instructions,
        options=exercise_in.options,
        correct_answer=exercise_in.correct_answer,
        correct_answers_list=exercise_in.correct_answers_list,
        case_sensitive=exercise_in.case_sensitive,
        accept_partial=exercise_in.accept_partial,
        points=exercise_in.points,
        unit_name=unit_name,
        lesson_name=lesson_name
    )
    workbook.total_exercises += 1
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    db.refresh(workbook)
    return exercise


def update_exercise(db: Session, exercise: WorkbookExercise, exercise_in: WorkbookExerciseCreate) -> WorkbookExercise:
    for field, value in exercise_in.dict(exclude_unset=True).items():
        setattr(exercise, field, value)
    db.commit()
    db.refresh(exercise)
    return exercise


def delete_exercise(db: Session, exercise: WorkbookExercise):
    workbook = exercise.workbook
    workbook.total_exercises -= 1 if workbook.total_exercises > 0 else 0
    db.delete(exercise)
    db.commit()
    db.refresh(workbook)


# ------------------------- STUDENT SUBMISSION & AUTO-CHECK -------------------------

def submit_exercise(
    db: Session,
    student_id: int,
    exercise: WorkbookExercise,
    submission_in: StudentExerciseSubmissionCreate
) -> StudentExerciseSubmission:
    """
    Handle student submission with auto-check
    """
    student_answer = submission_in.student_answer.strip()
    correct_answers = [exercise.correct_answer]
    if exercise.correct_answers_list:
        correct_answers.extend(exercise.correct_answers_list)

    is_correct = False
    for ans in correct_answers:
        ans_check = ans.strip()
        if not exercise.case_sensitive:
            ans_check = ans_check.lower()
            student_check = student_answer.lower()
        else:
            student_check = student_answer

        if exercise.accept_partial:
            if student_check in ans_check or ans_check in student_check:
                is_correct = True
                break
        else:
            if student_check == ans_check:
                is_correct = True
                break

    points_earned = exercise.points if is_correct else 0.0

    submission = StudentExerciseSubmission(
        workbook_id=exercise.workbook_id,
        exercise_id=exercise.id,
        student_id=student_id,
        student_answer=submission_in.student_answer,
        is_correct=is_correct,
        points_earned=points_earned,
        submitted_at=datetime.utcnow()
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Update student progress
    update_workbook_progress(db, student_id, exercise.workbook_id)

    return submission


# ------------------------- WORKBOOK PROGRESS TRACKING -------------------------

def update_workbook_progress(db: Session, student_id: int, workbook_id: int) -> WorkbookProgress:
    """
    Update or create student's progress for a workbook
    """
    progress = db.query(WorkbookProgress).filter(
        WorkbookProgress.student_id == student_id,
        WorkbookProgress.workbook_id == workbook_id
    ).first()
    if not progress:
        progress = WorkbookProgress(student_id=student_id, workbook_id=workbook_id)
        db.add(progress)
        db.commit()
        db.refresh(progress)

    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    total_exercises = len(workbook.exercises)
    submissions = db.query(StudentExerciseSubmission).filter(
        StudentExerciseSubmission.student_id == student_id,
        StudentExerciseSubmission.workbook_id == workbook_id
    ).all()

    exercises_completed = len(submissions)
    exercises_correct = sum(1 for s in submissions if s.is_correct)
    total_points = sum(e.points for e in workbook.exercises)
    points_earned = sum(s.points_earned for s in submissions)
    completion_percentage = (exercises_completed / total_exercises * 100) if total_exercises else 0

    progress.total_exercises = total_exercises
    progress.exercises_completed = exercises_completed
    progress.exercises_correct = exercises_correct
    progress.total_points = total_points
    progress.points_earned = points_earned
    progress.completion_percentage = completion_percentage
    progress.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(progress)
    return progress


# ----------------------------- PDF EXTRACTION / EXERCISES CREATION -----------------------------

def create_exercises_from_pdf(
    db: Session,
    workbook: InteractiveWorkbook,
    exercises_data: List[Dict],
    unit_name: str,
    lesson_name: str
) -> List[WorkbookExercise]:
    """
    Convert extracted PDF exercises into database exercises
    exercises_data: List of dicts containing exercise_number, exercise_type, exercise_text, options, correct_answer
    """
    created_exercises = []
    for data in exercises_data:
        exercise_in = WorkbookExerciseCreate(**data)
        ex = add_exercise(db, workbook, unit_name, lesson_name, exercise_in)
        created_exercises.append(ex)
    return created_exercises
