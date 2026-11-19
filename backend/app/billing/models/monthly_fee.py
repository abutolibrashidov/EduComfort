from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.models.base import Base

class MonthlyFee(Base):
    """
    Represents an expected monthly payment (invoice) for a student.
    Generated automatically upon enrollment or via monthly background jobs.
    """
    __tablename__ = "monthly_fees"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    amount = Column(Float, nullable=False)
    billing_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # month and year for the billing cycle
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    
    status = Column(String(20), default="pending")  # pending, paid, overdue, cancelled
    due_date = Column(Date, nullable=True)  # e.g. 2026-03-15 (payment_day of that month)
    paid_at = Column(DateTime(timezone=True), nullable=True)  # When it was actually paid
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)  # Linked payment record
    notes = Column(String(500), nullable=True)
    
    # Optional reference to group or grade level that triggered this
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    grade_level_id = Column(Integer, ForeignKey("grade_levels.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    student = relationship("User")
    institution = relationship("Institution")
    group = relationship("Group")
    grade_level = relationship("GradeLevel")

    def __repr__(self):
        return f"<MonthlyFee student_id={self.student_id} amount={self.amount} status={self.status}>"
