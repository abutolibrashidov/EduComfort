from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class PaymentBase(BaseModel):
    student_id: int
    amount: float
    payment_method: str
    payment_date: date
    description: Optional[str] = None
    status: str = "completed"


class PaymentCreate(PaymentBase):
    """Schema for creating a new payment"""
    pass


class PaymentUpdate(BaseModel):
    """Schema for updating payment (all fields optional)"""
    status: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    description: Optional[str] = None


class PaymentRead(PaymentBase):
    """Schema for reading payment data"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    student_name: Optional[str] = None  # Added dynamically in router
    commission_amount: float = 0.0

    class Config:
        from_attributes = True  # Allows SQLAlchemy model conversion


class TeacherPaymentRead(BaseModel):
    """Schema for reading teacher payment data"""
    id: int
    teacher_id: int
    amount: float
    payment_date: date
    status: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
