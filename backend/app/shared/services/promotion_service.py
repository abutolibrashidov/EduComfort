from sqlalchemy.orm import Session
from fastapi import HTTPException
from loguru import logger

from app.center.models.enrollment import Enrollment
from app.school.models.grade_level import GradeLevel
from app.school.models.academic_year import AcademicYear

def promote_students(
    db: Session, 
    institution_id: int, 
    current_year_id: int, 
    next_year_id: int, 
    grade_level_id: int
) -> dict:
    """
    Promotes all active students in a specific GradeLevel + AcademicYear combination
    to the next sequential GradeLevel for the upcoming AcademicYear.
    If the sequence > 11, they are marked as 'graduated'.
    """
    
    # 1. Validation
    current_grade = db.query(GradeLevel).filter(
        GradeLevel.id == grade_level_id,
        GradeLevel.institution_id == institution_id
    ).first()
    
    if not current_grade:
        raise HTTPException(status_code=404, detail="Current grade level not found")
        
    next_year = db.query(AcademicYear).filter(
        AcademicYear.id == next_year_id,
        AcademicYear.institution_id == institution_id
    ).first()
    
    if not next_year:
        raise HTTPException(status_code=404, detail="Next academic year not found")
        
    # Find next grade level sequence
    next_seq = current_grade.sequence + 1
    next_grade = None
    
    if next_seq <= 11:
        next_grade = db.query(GradeLevel).filter(
            GradeLevel.sequence == next_seq,
            GradeLevel.institution_id == institution_id
        ).first()
        
        if not next_grade:
            # Create it if it doesn't exist to prevent failure
            next_grade = GradeLevel(
                institution_id=institution_id,
                name=f"Level {next_seq}",
                sequence=next_seq
            )
            db.add(next_grade)
            db.commit()
            db.refresh(next_grade)

    # 2. Get active enrollments to promote
    active_enrollments = db.query(Enrollment).filter(
        Enrollment.institution_id == institution_id,
        Enrollment.academic_year_id == current_year_id,
        Enrollment.grade_level_id == grade_level_id,
        Enrollment.status == "active"
    ).all()
    
    if not active_enrollments:
        return {"message": "No active students found to promote", "promoted_count": 0, "graduated_count": 0}
        
    promoted_count = 0
    graduated_count = 0
    
    # 3. Process promotions
    for enrollment in active_enrollments:
        if next_seq > 11:
            # Student graduates
            enrollment.status = "graduated"
            graduated_count += 1
        else:
            # Student is promoted
            enrollment.status = "promoted"
            
            # Create new enrollment for next year
            new_enrollment = Enrollment(
                student_id=enrollment.student_id,
                academic_year_id=next_year_id,
                grade_level_id=next_grade.id,
                institution_id=institution_id,
                status="active"
            )
            db.add(new_enrollment)
            promoted_count += 1
            
    try:
        db.commit()
        logger.info(f"Promoted {promoted_count} and graduated {graduated_count} students from {current_grade.name}")
        return {
            "message": "Promotion successful",
            "promoted_count": promoted_count,
            "graduated_count": graduated_count
        }
    except Exception as e:
        db.rollback()
        logger.exception(f"Error during bulk promotion: {e}")
        raise HTTPException(status_code=500, detail="Failed to process promotion")
