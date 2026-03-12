from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.billing.models.payment import Payment
from app.core.models.user import User
from app.billing.models.teacher_payment import TeacherPayment
from app.center.models.group import Group
from app.center.models.group_students import GroupStudent
from pydantic import BaseModel
from app.billing.schemas.payment import PaymentCreate, PaymentRead, PaymentUpdate, TeacherPaymentRead

router = APIRouter()


@router.post("/", response_model=PaymentRead)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a new payment (Admin / Staff only)"""

    # ✅ FIX Bug #3: Only admins/staff can create payments
    allowed_roles = ["super_admin", "admin", "staff"]
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    if user_role not in allowed_roles and not current_user.is_platform_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Verify student exists
    student = db.query(User).filter(User.id == payment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    # ✅ Institution isolation: staff can only record payments for students in their institution
    if not current_user.is_platform_admin and current_user.institution_id:
        if student.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Bu talaba sizning markazingizga tegishli emas")

    # Create payment
    payment_data = payment.dict()

    # Calculate Commission based on Institution
    commission_amount = 0.0
    if student.institution_id:
        from app.core.models.institution import Institution
        institution = db.query(Institution).filter(Institution.id == student.institution_id).first()
        if institution:
            rate = institution.commission_rate if institution.commission_rate is not None else 0.10
            commission_amount = payment.amount * rate

    payment_data["commission_amount"] = commission_amount

    db_payment = Payment(**payment_data)
    db.add(db_payment)

    # ✅ Update student billing fields
    import calendar
    def add_one_month(dt):
        month = dt.month
        year = dt.year + month // 12
        month = month % 12 + 1
        day = min(dt.day, calendar.monthrange(year, month)[1])
        return dt.replace(year=year, month=month, day=day)

    student.is_active = True
    if student.next_payment_date:
        student.next_payment_date = add_one_month(student.next_payment_date)
    else:
        # If no previous date, set to the 10th of the current or next month
        now = datetime.utcnow()
        if now.day <= 10:
            student.next_payment_date = now.replace(day=10, hour=0, minute=0, second=0, microsecond=0)
        else:
            student.next_payment_date = add_one_month(now.replace(day=10, hour=0, minute=0, second=0, microsecond=0))
    
    # Save the payment amount as their monthly fee if not set (or optionally overwrite)
    if not student.monthly_fee or student.monthly_fee == 0:
        student.monthly_fee = payment.amount

    db.commit()
    db.refresh(db_payment)

    # Attach student name for response
    db_payment.student_name = f"{student.first_name} {student.last_name}"

    return db_payment


@router.get("/", response_model=list[PaymentRead])
def read_payments(
    status: Optional[str] = None,
    student_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all payments with optional filters"""
    
    query = db.query(Payment)
    
    # Encryption/Multi-tenancy
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            # Filter payments where student belongs to institution
            # Assuming Payment doesn't have institution_id directly, join with User
            query = query.join(User, Payment.student_id == User.id).filter(User.institution_id == current_user.institution_id)
        else:
            # Individual student sees only their own payments
            query = query.filter(Payment.student_id == current_user.id)
    
    # Apply filters
    
    # Apply filters
    if status:
        query = query.filter(Payment.status == status)
    if student_id:
        query = query.filter(Payment.student_id == student_id)
    
    payments = query.offset(skip).limit(limit).all()
    
    # Attach student names
    for payment in payments:
        student = db.query(User).filter(User.id == payment.student_id).first()
        if student:
            payment.student_name = f"{student.first_name} {student.last_name}"
    
    return payments


@router.get("/{payment_id}", response_model=PaymentRead)
def read_payment(
    payment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific payment by ID"""
    
    query = db.query(Payment).filter(Payment.id == payment_id)
    
    # Multi-tenancy filter
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            # Filter payments where student belongs to institution
            query = query.join(User, Payment.student_id == User.id).filter(User.institution_id == current_user.institution_id)
        else:
            # Individual student sees only their own payments
            query = query.filter(Payment.student_id == current_user.id)
    
    payment = query.first()
    if not payment:
        raise HTTPException(status_code=404, detail="To'lov topilmadi")
    
    # Attach student name
    student = db.query(User).filter(User.id == payment.student_id).first()
    if student:
        payment.student_name = f"{student.first_name} {student.last_name}"
    
    return payment


@router.patch("/{payment_id}", response_model=PaymentRead)
def update_payment_status(
    payment_id: int,
    update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update payment status or other fields"""
    
    query = db.query(Payment).filter(Payment.id == payment_id)
    
    # Multi-tenancy filter
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            # Filter payments where student belongs to institution
            query = query.join(User, Payment.student_id == User.id).filter(User.institution_id == current_user.institution_id)
        else:
            # Individual students cannot update payments
            raise HTTPException(status_code=403, detail="Access denied")
    
    payment = query.first()
    if not payment:
        raise HTTPException(status_code=404, detail="To'lov topilmadi")
    
    # Update only provided fields
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(payment, key, value)
    
    db.commit()
    db.refresh(payment)
    
    # Attach student name
    student = db.query(User).filter(User.id == payment.student_id).first()
    if student:
        payment.student_name = f"{student.first_name} {student.last_name}"
    
    return payment


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a payment record"""
    
    query = db.query(Payment).filter(Payment.id == payment_id)
    
    # Multi-tenancy filter
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            # Filter payments where student belongs to institution
            query = query.join(User, Payment.student_id == User.id).filter(User.institution_id == current_user.institution_id)
        else:
            # Individual students cannot delete payments
            raise HTTPException(status_code=403, detail="Access denied")
    
    payment = query.first()
    if not payment:
        raise HTTPException(status_code=404, detail="To'lov topilmadi")
    
    db.delete(payment)
    db.commit()
    
    return {"message": "To'lov muvoqiyatli o'chirildi", "id": payment_id}


# TEACHER SPECIFIC ENDPOINTS

@router.get("/teacher/salary", response_model=list[TeacherPaymentRead])
def get_teacher_salary(
    teacher_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get salary history for current teacher"""
    target_id = current_user.id
    role_str = getattr(current_user.role, 'value', current_user.role)
    
    if role_str not in ["teacher", "admin", "super_admin"] and not getattr(current_user, 'is_platform_admin', False):
         raise HTTPException(status_code=403, detail="Access denied")
         
    if teacher_id:
        if role_str in ["admin", "super_admin"] or getattr(current_user, 'is_platform_admin', False):
            target_id = teacher_id
        elif teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
            
    payments = db.query(TeacherPayment).filter(TeacherPayment.teacher_id == target_id).all()
    return payments


@router.get("/teacher/students")
def get_teacher_student_payments(
    teacher_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payments from students in groups taught by the teacher"""
    target_id = current_user.id
    role_str = getattr(current_user.role, 'value', current_user.role)
    
    if role_str not in ["teacher", "admin", "super_admin"] and not getattr(current_user, 'is_platform_admin', False):
         raise HTTPException(status_code=403, detail="Access denied")
         
    if teacher_id:
        if role_str in ["admin", "super_admin"] or getattr(current_user, 'is_platform_admin', False):
            target_id = teacher_id
        elif teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # 1. Find groups where current_user is the teacher
    # Assuming Group model has 'teacher_id'
    groups = db.query(Group).filter(Group.teacher_id == target_id).all()
    group_ids = [g.id for g in groups]
    
    if not group_ids:
        return []

    # 2. Find students in these groups
    # Join Payment -> User -> GroupStudent -> Group
    # Ideally we want payments from students WHO ARE IN THE TEACHER'S GROUPS
    
    # Simplified: Get all students in teacher's groups, then get their payments
    # A more precise query would filter payments related to the specific course/group if payment has that linkage,
    # but current Payment model is just Student <-> Payment. 
    # So we show ALL payments from students currently in teacher's class.
    
    student_ids_query = db.query(GroupStudent.student_id).filter(
        GroupStudent.group_id.in_(group_ids)
    )
    
    payments = db.query(Payment).filter(
        Payment.student_id.in_(student_ids_query)
    ).order_by(Payment.payment_date.desc()).all()
    
    # Attach student details
    for p in payments:
        student = db.query(User).filter(User.id == p.student_id).first()
        if student:
             p.student_name = f"{student.first_name} {student.last_name}"
             
    return payments


# ADMIN ENDPOINTS

class TeacherPaymentCreate(BaseModel):
    teacher_id: int
    amount: float
    payment_date: datetime
    description: Optional[str] = None

@router.post("/teacher/salary", response_model=TeacherPaymentRead)
def create_teacher_salary(
    payment: TeacherPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a teacher salary payment (Admin only)"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    db_payment = TeacherPayment(**payment.dict())
    db_payment.created_by_id = current_user.id
    db.add(db_payment)

    # ✅ FIX Bug #2: Also write to Expenses so Finance panel totals stay accurate.
    # Without this, salary paid here was invisible to the Finance Management stats.
    from app.billing.models.expense import Expense
    teacher = db.query(User).filter(User.id == payment.teacher_id).first()
    expense = Expense(
        category="salary",
        amount=payment.amount,
        date=payment.payment_date,
        description=payment.description or "Maosh (O'qituvchi to'lovlari sahifasidan)",
        recipient_id=payment.teacher_id,
        created_by_id=current_user.id,
        institution_id=teacher.institution_id if teacher else current_user.institution_id,
    )
    db.add(expense)

    db.commit()
    db.refresh(db_payment)

    return db_payment

@router.get("/admin/teachers/{teacher_id}/salaries", response_model=list[TeacherPaymentRead])
def get_specific_teacher_salaries(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get salary history for a specific teacher (Admin only)"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # ✅ FIX Bug #4: Institution isolation — prevent cross-institution data access
    if not current_user.is_platform_admin and current_user.institution_id:
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher or teacher.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Bu o'qituvchi sizning markazingizga tegishli emas")

    payments = db.query(TeacherPayment).filter(TeacherPayment.teacher_id == teacher_id).order_by(TeacherPayment.payment_date.desc()).all()
    return payments

@router.get("/admin/teachers/{teacher_id}/student-payments")
def get_specific_teacher_student_payments(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payments of students who are in groups taught by specific teacher (Admin only)"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # ✅ FIX Bug #4: Institution isolation
    if not current_user.is_platform_admin and current_user.institution_id:
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher or teacher.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Bu o'qituvchi sizning markazingizga tegishli emas")

    groups = db.query(Group).filter(Group.teacher_id == teacher_id).all()
    group_ids = [g.id for g in groups]
    
    if not group_ids:
        return []

    student_ids_query = db.query(GroupStudent.student_id).filter(
        GroupStudent.group_id.in_(group_ids)
    )
    
    payments = db.query(Payment).filter(
        Payment.student_id.in_(student_ids_query)
    ).order_by(Payment.payment_date.desc()).all()
    
    for p in payments:
        student = db.query(User).filter(User.id == p.student_id).first()
        if student:
             p.student_name = f"{student.first_name} {student.last_name}"
             
    return payments

@router.put("/admin/teacher-payment/{id}")
def update_teacher_payment_amount(
    id: int,
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a teacher salary payment amount"""
    if current_user.role not in ["super_admin", "admin"]:
         raise HTTPException(status_code=403, detail="Access denied")
         
    payment = db.query(TeacherPayment).filter(TeacherPayment.id == id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    payment.amount = amount
    db.commit()
    db.refresh(payment)
    return payment