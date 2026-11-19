from sqlalchemy.orm import Session
from datetime import datetime
from app.billing.models.monthly_fee import MonthlyFee
from app.core.models.user import User
from app.core.models.institution import Institution
from app.school.models.grade_level import GradeLevel
from app.center.models.group import Group

def create_student_invoice(db: Session, student_id: int, institution_id: int, grade_level_id: int = None, group_id: int = None):
    """
    Creates a MonthlyFee record for a student based on their enrollment.
    Pulls price from Group (if CENTER), GradeLevel (if SCHOOL), or Institution default.
    """
    # 1. Determine the price
    amount = 0.0
    
    if group_id:
        group = db.query(Group).filter(Group.id == group_id).first()
        if group and group.monthly_fee is not None:
            amount = group.monthly_fee
            
    if amount == 0.0 and grade_level_id:
        grade = db.query(GradeLevel).filter(GradeLevel.id == grade_level_id).first()
        if grade and grade.monthly_fee is not None:
            amount = grade.monthly_fee
            
    if amount == 0.0:
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if inst:
            amount = inst.default_monthly_fee or 0.0
            
    # 2. Check if invoice for this month already exists
    now = datetime.utcnow()
    existing = db.query(MonthlyFee).filter(
        MonthlyFee.student_id == student_id,
        MonthlyFee.month == now.month,
        MonthlyFee.year == now.year,
        MonthlyFee.status != "cancelled"
    ).first()
    
    if existing:
        return existing
        
    # 3. Create invoice
    invoice = MonthlyFee(
        student_id=student_id,
        institution_id=institution_id,
        amount=amount,
        month=now.month,
        year=now.year,
        grade_level_id=grade_level_id,
        group_id=group_id,
        status="pending"
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice
