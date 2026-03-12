"""
Monthly Fee management router.
Handles marking fees as paid, updating fee status, etc.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.billing.models.monthly_fee import MonthlyFee
from app.billing.models.payment import Payment
from app.security.permissions import is_admin_or_higher, is_platform_owner

router = APIRouter(prefix="/admin/monthly-fees", tags=["Monthly Fees"])


class PayFeeRequest(BaseModel):
    amount: float
    payment_method: str = "cash"  # cash, card, transfer, online
    notes: Optional[str] = None


class UpdateFeeRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    amount: Optional[float] = None


@router.get("/{fee_id}")
def get_fee(
    fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fee = db.query(MonthlyFee).filter(MonthlyFee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    if not is_platform_owner(current_user) and fee.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return fee


@router.post("/{fee_id}/pay")
def pay_fee(
    fee_id: int,
    data: PayFeeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a monthly fee as paid and create a Payment record.
    If the student has OLDER unpaid fees, show a warning but still allow.
    """
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    fee = db.query(MonthlyFee).filter(MonthlyFee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    if not is_platform_owner(current_user) and fee.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if fee.status == "paid":
        raise HTTPException(status_code=400, detail="Bu to'lov allaqachon to'langan")

    # Check for older unpaid fees (debt warning — but don't block)
    older_unpaid = db.query(MonthlyFee).filter(
        MonthlyFee.student_id == fee.student_id,
        MonthlyFee.group_id == fee.group_id,
        MonthlyFee.status != "paid",
        MonthlyFee.status != "cancelled",
        # Older months
        (MonthlyFee.year * 100 + MonthlyFee.month) <
        (fee.year * 100 + fee.month),
    ).count()

    # Create Payment record
    payment = Payment(
        student_id=fee.student_id,
        amount=data.amount,
        payment_method=data.payment_method,
        payment_date=datetime.utcnow().date(),
        description=f"{fee.year}-yil {fee.month}-oy to'lovi. {data.notes or ''}".strip(),
        status="completed",
    )
    db.add(payment)
    db.flush()  # Get the payment.id

    # Mark fee as paid
    fee.status = "paid"
    fee.paid_at = datetime.utcnow()
    fee.payment_id = payment.id
    if data.notes:
        fee.notes = data.notes

    db.commit()

    return {
        "message": "To'lov muvaffaqiyatli qayd etildi",
        "payment_id": payment.id,
        "older_debt_count": older_unpaid,
        "warning": (
            f"Diqqat: {older_unpaid} ta oldingi oy to'lanmagan!"
            if older_unpaid > 0 else None
        ),
    }


@router.patch("/{fee_id}")
def update_fee(
    fee_id: int,
    data: UpdateFeeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a fee's status or notes (e.g., mark as overdue)."""
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    fee = db.query(MonthlyFee).filter(MonthlyFee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    if not is_platform_owner(current_user) and fee.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if data.status:
        fee.status = data.status
    if data.notes is not None:
        fee.notes = data.notes
    if data.amount is not None:
        fee.amount = data.amount

    db.commit()
    return {"message": "Yangilandi", "fee_id": fee_id}


@router.get("/student/{student_id}")
def get_student_fees(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all monthly fees for a given student."""
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    fees = db.query(MonthlyFee).filter(
        MonthlyFee.student_id == student_id
    ).order_by(MonthlyFee.year, MonthlyFee.month).all()

    total_debt = sum(f.amount for f in fees if f.status != "paid")
    return {
        "fees": fees,
        "total_debt": total_debt,
        "total_paid": sum(f.amount for f in fees if f.status == "paid"),
    }
