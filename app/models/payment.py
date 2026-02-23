from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    commission_amount = Column(Float, default=0.0) # Calculated based on Institution commission_rate
    payment_method = Column(String, nullable=False)  # cash, card, transfer, online
    payment_date = Column(Date, nullable=False)
    status = Column(String, default="completed")  # completed, pending, failed
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship (removed back_populates since User.payments is commented out)
    student = relationship("User")