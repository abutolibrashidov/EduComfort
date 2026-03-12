from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.billing.models.expense import Expense

router = APIRouter(prefix="/expenses", tags=["Expenses"])

class ExpenseBase(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None
    recipient_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseRead(ExpenseBase):
    id: int
    created_by_id: int
    institution_id: Optional[int]
    recipient_name: Optional[str]

    class Config:
        from_attributes = True


@router.post("/", response_model=ExpenseRead)
@router.post("", response_model=ExpenseRead, include_in_schema=False)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a new expense (Admin only)"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Ensure UTC date if none provided
    expense_data = expense.dict()
    if expense_data.get("date") is None:
        expense_data["date"] = datetime.utcnow()

    db_expense = Expense(
        **expense_data,
        created_by_id=current_user.id,
        institution_id=current_user.institution_id
    )
    db.add(db_expense)
    
    # Attach recipient name for response if it's a salary AND sync TeacherPayment if applicable
    db_expense.recipient_name = None
    if db_expense.recipient_id:
        recipient = db.query(User).filter(User.id == db_expense.recipient_id).first()
        if recipient:
            db_expense.recipient_name = f"{recipient.first_name} {recipient.last_name}"
            
            # If this is a teacher salary, sync it to the teacher_payments table automatically
            if expense_data.get("category") == "salary" and recipient.role == "teacher":
                from app.billing.models.teacher_payment import TeacherPayment
                teacher_payment = TeacherPayment(
                    teacher_id=recipient.id,
                    amount=expense_data["amount"],
                    payment_date=expense_data["date"],
                    description=expense_data.get("description", "Maosh (Admin tomonidan to'langan)"),
                    status="completed",
                    created_by_id=current_user.id
                )
                db.add(teacher_payment)

    db.commit()
    db.refresh(db_expense)

    return db_expense

@router.get("/", response_model=List[ExpenseRead])
@router.get("", response_model=List[ExpenseRead], include_in_schema=False)
def read_expenses(
    category: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List expenses with filters (Admin only)"""
    print(f"[DEBUG] read_expenses: user={current_user.email}, role={current_user.role}")
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Expense)
    if current_user.institution_id:
        query = query.filter(Expense.institution_id == current_user.institution_id)
    
    if category:
        query = query.filter(Expense.category == category)

    expenses = query.order_by(Expense.date.desc()).all()
    
    # Initialize recipient_name for schema compatibility
    for e in expenses:
        if e.recipient:
            e.recipient_name = f"{e.recipient.first_name} {e.recipient.last_name}"
        else:
            e.recipient_name = None

    print(f"[DEBUG] read_expenses: returning {len(expenses)} expenses")
    return expenses

@router.get("/my-salary", response_model=List[ExpenseRead])
def read_my_salary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's salary history (accessible by any role)"""
    expenses = db.query(Expense).filter(
        Expense.category == "salary",
        Expense.recipient_id == current_user.id
    ).order_by(Expense.date.desc()).all()
    
    for e in expenses:
        e.recipient_name = f"{current_user.first_name} {current_user.last_name}"
        
    return expenses

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an expense record (Admin only)"""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Xarajat topilmadi")

    if current_user.institution_id and expense.institution_id != current_user.institution_id:
         raise HTTPException(status_code=403, detail="Access denied")

    db.delete(expense)
    db.commit()

    return {"message": "Xarajat o'chirildi"}
