from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import List

from app.center.models.group import Group
from app.center.models.group_students import GroupStudent
from app.academic.models.lesson import Lesson
from app.academic.models.exam import Exam, ExamStatus
from app.engagement.models.rating import TeacherRating
from app.academic.services.stats_service import calculate_attendance_rate

from app.academic.routers.teacher import (
    TeacherDashboardResponse, DashboardKPIs, TodayLesson, UpcomingExam, StudentProgressSnapshot
)

def get_teacher_dashboard_data(db: Session, target_teacher_id: int, groups: List[Group]) -> TeacherDashboardResponse:
    group_ids = [g.id for g in groups]
    
    # Calculate KPIs
    total_groups = len(groups)
    active_groups = len([g for g in groups if g.status == "active"])
    
    # Count total students across all groups
    total_students = db.query(func.count(GroupStudent.id)).filter(
        GroupStudent.group_id.in_(group_ids) if group_ids else False,
        GroupStudent.is_active
    ).scalar() or 0
    
    # Upcoming lessons
    upcoming_lessons_query = db.query(Lesson).filter(
        Lesson.teacher_id == target_teacher_id,
        Lesson.lesson_date >= date.today()
    ).order_by(Lesson.lesson_date.asc()).all()
    upcoming_lessons_count = len(upcoming_lessons_query)
    
    # Upcoming exams (REAL)
    upcoming_exams_db = db.query(Exam).filter(
        Exam.created_by_id == target_teacher_id,
        Exam.status.in_([ExamStatus.published, ExamStatus.in_progress]),
        Exam.end_date >= datetime.utcnow()
    ).all()
    upcoming_exams_count = len(upcoming_exams_db)
    
    # Average rating (REAL)
    avg_rating = db.query(func.avg(TeacherRating.rating)).filter(
        TeacherRating.teacher_id == target_teacher_id
    ).scalar() or 0.0
    average_rating = round(avg_rating, 1)
    
    kpis = DashboardKPIs(
        total_groups=total_groups,
        total_students=total_students,
        active_courses=active_groups,
        upcoming_lessons=upcoming_lessons_count,
        upcoming_exams=upcoming_exams_count,
        average_rating=average_rating
    )
    
    # Today's lessons or next upcoming
    todays_lessons = []
    
    for i in range(8): # Check today + next 7 days
        target_date = date.today() + timedelta(days=i)
        day_name = target_date.strftime("%A")[:3]  # Mon, Tue, etc.
        
        # Real lessons for target date from Lesson model
        target_lessons_db = [l for l in upcoming_lessons_query if l.lesson_date == target_date]
        for l in target_lessons_db:
            todays_lessons.append(TodayLesson(
                group_id=l.group_id,
                group_name=l.group.name,
                subject=l.group.subject.name,
                time=str(l.group.start_time) if l.group.start_time else "TBD",
                topic=l.title,
                lesson_date=target_date.strftime("%Y-%m-%d")
            ))
        
        # Also include scheduled groups if no specific lesson planned
        planned_group_ids = [l.group_id for l in target_lessons_db]
        for group in groups:
            if group.id not in planned_group_ids and group.days_of_week and day_name in group.days_of_week:
                todays_lessons.append(TodayLesson(
                    group_id=group.id,
                    group_name=group.name,
                    subject=group.subject.name,
                    time=str(group.start_time) if group.start_time else "TBD",
                    topic=None,
                    lesson_date=target_date.strftime("%Y-%m-%d")
                ))
                
        if todays_lessons:
            # Sort by time
            todays_lessons.sort(key=lambda x: x.time)
            break # Found lessons for this day, stop searching further days
    
    # Upcoming exams (REAL)
    upcoming_exams = []
    for ex in upcoming_exams_db:
        upcoming_exams.append(UpcomingExam(
            exam_id=ex.id,
            exam_name=ex.title,
            group_name=ex.group.name if ex.group else "Multiple",
            date=ex.start_date.strftime("%Y-%m-%d %H:%M") if ex.start_date else "Flexible",
            type=ex.subject.name if ex.subject else "General"
        ))
    
    # Progress snapshot
    attendance_rate = calculate_attendance_rate(db, teacher_id=target_teacher_id)
    
    progress_snapshot = StudentProgressSnapshot(
        average_completion=75.0, # Placeholder
        attendance_percentage=attendance_rate,
        assignment_submission=82.0 # Placeholder
    )
    
    # Quick notes
    quick_notes = [
        "Review Group A's homework submissions",
        "Prepare materials for Wednesday's lesson",
        "Follow up with 3 absent students"
    ]
    
    return TeacherDashboardResponse(
        kpis=kpis,
        todays_lessons=todays_lessons,
        upcoming_exams=upcoming_exams,
        progress_snapshot=progress_snapshot,
        quick_notes=quick_notes
    )
