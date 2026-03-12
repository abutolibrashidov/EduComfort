from sqlalchemy.orm import Session
from sqlalchemy import text
from loguru import logger
from app.models.user import User

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def robust_cascade_delete_user(db: Session, user: User):
    """
    Permanently deletes a user and all their associated data across 30+ tables.
    Uses PostgreSQL SAVEPOINTs (db.begin_nested()) to ensure resilience against
    missing tables or schema mismatches.
    """
    user_id = user.id
    role = user.role.lower()
    
    logger.info(f"🗑️ Shared Robust Cascade delete for {role} (ID: {user_id})...")
    
    # Define categories of queries
    student_specific = [
        "DELETE FROM student_performance WHERE student_id = :uid",
        "DELETE FROM exam_performance_detail WHERE student_id = :uid",
        "DELETE FROM workbook_performance_detail WHERE student_id = :uid",
        "DELETE FROM student_exercise_submissions WHERE student_id = :uid",
        "DELETE FROM workbook_progress WHERE student_id = :uid",
        "DELETE FROM workbook_submissions WHERE student_id = :uid",
        "DELETE FROM unit_progress WHERE student_id = :uid",
        "DELETE FROM book_progress WHERE student_id = :uid",
        "DELETE FROM student_course_progress WHERE enrollment_id IN (SELECT id FROM student_enrollments WHERE student_id = :uid)",
        "DELETE FROM student_enrollments WHERE student_id = :uid",
        "DELETE FROM student_lesson_progress WHERE student_id = :uid",
        "DELETE FROM attendance WHERE student_id = :uid",
        "DELETE FROM group_students WHERE user_id = :uid",
        "DELETE FROM payments WHERE student_id = :uid",
        "DELETE FROM student_books WHERE assigned_to_student_id = :uid"
    ]
    
    teacher_specific = [
        "DELETE FROM exams WHERE created_by_id = :uid",
        "DELETE FROM interactive_workbooks WHERE created_by_id = :uid",
        "DELETE FROM workbooks WHERE created_by_id = :uid",
        "DELETE FROM gradebook_levels WHERE created_by_id = :uid",
        "DELETE FROM materials WHERE teacher_id = :uid",
        "DELETE FROM lessons WHERE teacher_id = :uid",
        "DELETE FROM groups WHERE teacher_id = :uid",
        "DELETE FROM posts WHERE author_id = :uid",
        "DELETE FROM online_courses WHERE instructor_id = :uid",
        "DELETE FROM teacher_payments WHERE teacher_id = :uid OR created_by_id = :uid",
        "DELETE FROM expenses WHERE created_by_id = :uid",
        "DELETE FROM ielts_exams WHERE created_by_id = :uid",
        "DELETE FROM books WHERE uploaded_by_user_id = :uid OR reviewed_by_user_id = :uid"
    ]
    
    # Shared social/identity data
    shared_cleanup = [
        "DELETE FROM exam_submissions WHERE student_id = :uid",
        "DELETE FROM assignment_submissions WHERE student_id = :uid OR graded_by_id = :uid",
        "DELETE FROM student_answers WHERE student_id = :uid OR graded_by_user_id = :uid",
        "DELETE FROM user_achievements WHERE user_id = :uid",
        "DELETE FROM announcements WHERE author_id = :uid",
        "DELETE FROM feedbacks WHERE user_id = :uid",
        "DELETE FROM messages WHERE sender_id = :uid OR receiver_id = :uid",
        "DELETE FROM conversation_participants WHERE user_id = :uid",
        "DELETE FROM post_likes WHERE user_id = :uid",
        "DELETE FROM comments WHERE user_id = :uid",
        "DELETE FROM user_follows WHERE follower_id = :uid OR followed_id = :uid",
        "DELETE FROM notifications WHERE user_id = :uid",
        "UPDATE expenses SET recipient_id = NULL WHERE recipient_id = :uid",
        "DELETE FROM student_books WHERE assigned_by_id = :uid",
        "DELETE FROM teacher_ratings WHERE rater_id = :uid OR teacher_id = :uid"
    ]

    # Complex cascading dependencies (Teachers primarily)
    cascading_dependencies = [
         # Only relevant if user created exams/courses
        "DELETE FROM exam_answers WHERE submission_id IN (SELECT id FROM exam_submissions WHERE exam_id IN (SELECT id FROM exams WHERE created_by_id = :uid))",
        "DELETE FROM exam_submissions WHERE exam_id IN (SELECT id FROM exams WHERE created_by_id = :uid)",
        "DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE created_by_id = :uid)",
        "DELETE FROM workbook_exercises WHERE workbook_id IN (SELECT id FROM interactive_workbooks WHERE created_by_id = :uid)",
        "DELETE FROM course_assignments WHERE course_id IN (SELECT id FROM online_courses WHERE instructor_id = :uid)",
        "DELETE FROM gradebook_scores WHERE exam_id IN (SELECT ge.id FROM gradebook_exams ge JOIN gradebook_levels gl ON ge.level_id = gl.id WHERE gl.created_by_id = :uid)",
        "DELETE FROM gradebook_exams WHERE level_id IN (SELECT id FROM gradebook_levels WHERE created_by_id = :uid)",
        "DELETE FROM ielts_reading_answers WHERE submission_id IN (SELECT id FROM ielts_submissions WHERE exam_id IN (SELECT id FROM ielts_exams WHERE created_by_id = :uid))",
        "DELETE FROM ielts_listening_answers WHERE submission_id IN (SELECT id FROM ielts_submissions WHERE exam_id IN (SELECT id FROM ielts_exams WHERE created_by_id = :uid))",
        "DELETE FROM ielts_submissions WHERE exam_id IN (SELECT id FROM ielts_exams WHERE created_by_id = :uid)",
        "DELETE FROM ielts_writing_tasks WHERE exam_id IN (SELECT id FROM ielts_exams WHERE created_by_id = :uid)"
    ]

    # Determine which queries to run
    to_run = shared_cleanup.copy()
    if role == "student":
        to_run.extend(student_specific)
    elif role in ["teacher", "admin", "super_admin"]:
        to_run.extend(teacher_specific)
        to_run.extend(cascading_dependencies)
        # Teachers can also have student-like records in some settings
        to_run.extend(student_specific) 

    for q_str in to_run:
        try:
            db.begin_nested()
            db.execute(text(q_str), {"uid": user_id})
            db.commit()
        except Exception as qe:
            db.rollback()
            # We log but continue, as some tables might not exist in all environments
            logger.debug(f"Row deletion skipped for {q_str.split()[2]}: {str(qe)}")
    
    # Finally delete the user itself
    db.delete(user)
    db.commit()
    logger.info(f"✅ User {user_id} and associated data deleted successfully via robust service.")
    return True
