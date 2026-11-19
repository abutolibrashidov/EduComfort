from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.models.base import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)  # 'salary', 'rent', 'utilities', 'equipment', 'other'
    amount = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    
    # For salary type, link to the user receiving it
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Multi-tenancy
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    
    # Audit
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    recipient = relationship("User", foreign_keys=[recipient_id])
    creator = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<Expense {self.category}: {self.amount}>"
