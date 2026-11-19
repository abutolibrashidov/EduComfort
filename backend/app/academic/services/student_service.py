from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, date
from typing import List, Optional

from app.core.models.user import User
from app.center.models.group import Group
from app.center.models.group_students import GroupStudent
from app.billing.models.payment import Payment
from app.engagement.models.conversation import Conversation, ConversationType
from app.academic.models.material import Material
from app.academic.models.gradebook import GradebookLevel, GradebookExam, GradebookScore
from app.academic.models.lesson import Lesson
from app.academic.models.exam import Exam, ExamStatus
from app.academic.services.stats_service import calculate_attendance_rate, calculate_course_completion_rate

# Assuming these schemas are imported from where they live. To avoid circular imports, we could just import them from routers.student for now, or move them to a dedicated schemas file.
# Since the codebase currently defines schemas in the router, we'll import them from there.
from app.academic.routers.student import (
    StudentDashboardResponse, DashboardStats, GroupInfo, PaymentInfo,
    LessonInfo, MaterialInfo, ExamDashboardInfo, GradebookLevelDashboardInfo,
    GradebookScoreDashboardInfo
)

def get_student_dashboard_data(db: Session, target_student_id: int) -> StudentDashboardResponse:
    # Get enrolled groups
    enrollments = db.query(GroupStudent).filter(
        GroupStudent.student_id == target_student_id,
        GroupStudent.is_active
    ).all()
    
    group_ids = [e.group_id for e in enrollments]
    
    groups = db.query(Group).filter(
        Group.id.in_(group_ids) if group_ids else False
    ).all()
    
    # Build group info
    enrolled_groups = []
    active_groups = 0
    
    for group in groups:
        if group.status == "active":
            active_groups += 1
        
        enrolled_groups.append(GroupInfo(
            id=group.id,
            name=group.name,
            subject_name=group.subject.name,
            teacher_name=f"{group.teacher.first_name} {group.teacher.last_name}",
            level=group.level.value if group.level else "N/A",
            days_of_week=group.days_of_week,
            start_time=str(group.start_time) if group.start_time else None,
            end_time=str(group.end_time) if group.end_time else None,
            start_date=str(group.start_date) if group.start_date else None,
            end_date=str(group.end_date) if group.end_date else None,
            current_students=group.current_students,
            max_students=group.max_students
        ))
    
    # Get payments
    payments = db.query(Payment).filter(
        Payment.student_id == target_student_id
    ).order_by(Payment.payment_date.desc()).limit(5).all()
    
    total_payments = db.query(func.sum(Payment.amount)).filter(
        Payment.student_id == target_student_id,
        Payment.status == "completed"
    ).scalar() or 0.0
    
    pending_payments = db.query(func.sum(Payment.amount)).filter(
        Payment.student_id == target_student_id,
        Payment.status == "pending"
    ).scalar() or 0.0
    
    recent_payments = [
        PaymentInfo(
            id=p.id,
            amount=p.amount,
            payment_method=p.payment_method,
            payment_date=str(p.payment_date),
            status=p.status,
            description=p.description
        )
        for p in payments
    ]
    
    # Count group chats available
    group_chats = db.query(Conversation).filter(
        Conversation.type == ConversationType.GROUP,
        Conversation.group_id.in_(group_ids) if group_ids else False
    ).count()

    # Get upcoming lessons for student's groups
    upcoming_lessons_query = db.query(Lesson).filter(
        Lesson.group_id.in_(group_ids) if group_ids else False,
        Lesson.lesson_date >= date.today()
    ).order_by(Lesson.lesson_date.asc()).limit(5).all()

    upcoming_lessons = [
        LessonInfo(
            id=l.id,
            title=l.title,
            description=l.description,
            lesson_date=str(l.lesson_date),
            group_name=l.group.name,
            teacher_name=f"{l.teacher.first_name} {l.teacher.last_name}"
        )
        for l in upcoming_lessons_query
    ]

    # Get recent materials for student's groups or from their teachers
    teacher_ids = [g.teacher_id for g in groups]
    
    recent_materials_query = db.query(Material).filter(
        or_(
            Material.group_id.in_(group_ids) if group_ids else False,
            Material.teacher_id.in_(teacher_ids) if teacher_ids else False
        )
    ).order_by(Material.created_at.desc()).limit(10).all()

    recent_materials = [
        MaterialInfo(
            id=m.id,
            title=m.title,
            description=m.description,
            file_path=m.file_path,
            file_name=m.file_name,
            file_type=m.file_type,
            created_at=m.created_at,
            group_name=m.group.name if m.group else "Global"
        )
        for m in recent_materials_query
    ]

    # Get upcoming exams
    upcoming_exams_query = db.query(Exam).filter(
        Exam.group_id.in_(group_ids) if group_ids else False,
        Exam.status == ExamStatus.published,
        or_(Exam.end_date >= datetime.utcnow(), Exam.end_date.is_(None))
    ).order_by(Exam.start_date.asc()).limit(5).all()

    upcoming_exams = [
        ExamDashboardInfo(
            id=e.id,
            title=e.title,
            subject_name=e.subject.name,
            total_points=e.total_points,
            duration_minutes=e.duration_minutes,
            start_date=e.start_date,
            end_date=e.end_date
        )
        for e in upcoming_exams_query
    ]
    
    # Get Gradebook data
    gradebook_data = []
    if group_ids:
        levels = db.query(GradebookLevel).filter(
            GradebookLevel.group_id.in_(group_ids),
            GradebookLevel.is_active
        ).all()
        
        for lvl in levels:
            exams_in_level = db.query(GradebookExam).filter(GradebookExam.level_id == lvl.id).all()
            level_exams = []
            total_earned = 0.0
            total_possible = 0.0
            
            for ex in exams_in_level:
                score = db.query(GradebookScore).filter(
                    GradebookScore.exam_id == ex.id,
                    GradebookScore.student_id == target_student_id
                ).first()
                
                if score:
                    total_earned += score.score
                    total_possible += ex.max_score
                    
                level_exams.append(GradebookScoreDashboardInfo(
                    exam_title=ex.title,
                    max_score=ex.max_score,
                    score=score.score if score else None,
                    comment=score.comment if score else None,
                    date=ex.exam_date.strftime("%Y-%m-%d") if ex.exam_date else ""
                ))
            
            student_percentage = (total_earned / max(total_possible, 1.0)) * 100 if total_possible > 0 else 0
            is_passing = student_percentage >= lvl.passing_percentage
            if total_possible == 0:
                is_passing = True
                
            gradebook_data.append(GradebookLevelDashboardInfo(
                level_id=lvl.id,
                level_title=lvl.title,
                group_name=lvl.group.name if lvl.group else "Unknown Group",
                passing_percentage=lvl.passing_percentage,
                total_exams=len(exams_in_level),
                student_score_percentage=round(student_percentage, 1),
                is_passing=is_passing,
                exams=level_exams
            ))
    
    completion_rate = calculate_course_completion_rate(db, student_id=target_student_id)
    attendance_rate = calculate_attendance_rate(db, student_id=target_student_id)
    
    stats = DashboardStats(
        total_groups=len(groups),
        active_groups=active_groups,
        total_payments=total_payments,
        pending_payments=pending_payments,
        completion_rate=completion_rate,
        attendance_rate=attendance_rate
    )
    
    return StudentDashboardResponse(
        stats=stats,
        enrolled_groups=enrolled_groups,
        recent_payments=recent_payments,
        upcoming_lessons=upcoming_lessons,
        recent_materials=recent_materials,
        upcoming_exams=upcoming_exams,
        gradebooks=gradebook_data,
        group_chats_available=group_chats
    )
