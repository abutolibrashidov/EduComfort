from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.models.base import Base

class TeacherPayment(Base):
    __tablename__ = "teacher_payments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    status = Column(String, default="completed")  # completed, pending
    description = Column(String, nullable=True)  # e.g. "January 2024 Salary"
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who created it

    teacher = relationship("User", foreign_keys=[teacher_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
