from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.gradebook import GradebookLevel, GradebookExam, GradebookScore
from app.schemas.gradebook import (
    GradebookLevelCreate, GradebookLevelResponse, GradebookLevelDetailResponse,
    GradebookExamCreate, GradebookExamResponse, GradebookExamWithScoresResponse,
    GradebookBulkScoreInput, GradebookScoreResponse
)
from app.security.permissions import is_teacher, is_admin_or_higher, is_super_admin

router = APIRouter(prefix="/gradebook", tags=["Gradebook"])

# ============ LEVEL ENDPOINTS ============

@router.post("/levels", response_model=GradebookLevelResponse)
def create_gradebook_level(
    level_in: GradebookLevelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new Gradebook Level for a group (Teacher/Admin only)"""
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    group = db.query(Group).filter(Group.id == level_in.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if is_teacher(current_user) and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create levels for your own groups")
        
    db_level = GradebookLevel(
        institution_id=current_user.institution_id,
        group_id=level_in.group_id,
        created_by_id=current_user.id,
        title=level_in.title,
        description=level_in.description,
        passing_percentage=level_in.passing_percentage,
        expected_exams=level_in.expected_exams
    )
    db.add(db_level)
    db.commit()
    db.refresh(db_level)
    return db_level


@router.get("/groups/{group_id}/levels", response_model=List[GradebookLevelDetailResponse])
def get_group_levels(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all gradebook levels for a specific group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Security check: Teacher of group, Admin of institution, or Student in group
    has_access = False
    if is_admin_or_higher(current_user) and current_user.institution_id == group.institution_id:
        has_access = True
    elif is_teacher(current_user) and group.teacher_id == current_user.id:
        has_access = True
    else:
        # Check if student is in group
        is_student_in_group = any(s.id == current_user.id for s in group.students)
        if is_student_in_group:
            has_access = True
            
    if not has_access and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this group's gradebook")
        
    levels = db.query(GradebookLevel).filter(GradebookLevel.group_id == group_id).all()
    return levels


# ============ EXAM & SCORE ENDPOINTS ============

@router.post("/levels/{level_id}/exams", response_model=GradebookExamResponse)
def create_gradebook_exam(
    level_id: int,
    exam_in: GradebookExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new manual exam column to a gradebook level"""
    level = db.query(GradebookLevel).filter(GradebookLevel.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail="Level not found")
        
    if is_teacher(current_user) and level.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this level")
        
    db_exam = GradebookExam(
        level_id=level_id,
        title=exam_in.title,
        max_score=exam_in.max_score,
        exam_date=exam_in.exam_date or datetime.utcnow()
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam


@router.post("/exams/{exam_id}/scores", response_model=List[GradebookScoreResponse])
def bulk_update_scores(
    exam_id: int,
    scores_in: GradebookBulkScoreInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk create or update student scores for an exam"""
    exam = db.query(GradebookExam).filter(GradebookExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    level = exam.level
    if is_teacher(current_user) and level.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this exam")
        
    # Get existing scores to update instead of duplicate
    existing_scores = {s.student_id: s for s in exam.scores}
    
    updated_records = []
    
    for score_data in scores_in.scores:
        if score_data.student_id in existing_scores:
            # Update existing
            db_score = existing_scores[score_data.student_id]
            db_score.score = score_data.score
            db_score.comment = score_data.comment
            updated_records.append(db_score)
        else:
            # Create new
            db_score = GradebookScore(
                exam_id=exam_id,
                student_id=score_data.student_id,
                score=score_data.score,
                comment=score_data.comment
            )
            db.add(db_score)
            updated_records.append(db_score)
            
    db.commit()
    
    # Reload the exam to get the full updated score list
    db.refresh(exam)
    return exam.scores

@router.get("/exams/{exam_id}/details")
def get_exam_details(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get exam details along with all students in the group and their scores"""
    exam = db.query(GradebookExam).filter(GradebookExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    level = exam.level
    group = level.group
    
    # Security check
    has_access = False
    if is_admin_or_higher(current_user) and current_user.institution_id == group.institution_id:
        has_access = True
    elif is_teacher(current_user) and group.teacher_id == current_user.id:
        has_access = True
        
    if not has_access and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this exam")
        
    # Map existing scores
    existing_scores = {s.student_id: s for s in exam.scores}
    
    # Build student list
    students_data = []
    for student in group.students:
        score_record = existing_scores.get(student.id)
        students_data.append({
            "student_id": student.id,
            "name": f"{student.first_name} {student.last_name}".strip() or student.username,
            "score": score_record.score if score_record else None,
            "comment": score_record.comment if score_record else ""
        })
        
    # Sort students alphabetically
    students_data.sort(key=lambda x: x["name"])
        
    return {
        "id": exam.id,
        "title": exam.title,
        "max_score": exam.max_score,
        "passing_score": level.passing_percentage,
        "level_title": level.title,
        "students": students_data
    }
