from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.models.base import Base

class Grade(Base):
    """
    Academic Grade mapping specifically for the Baholar Jurnali (Gradebook).
    Different from GradebookScore which is more gamified/system-specific.
    This links a student's grade to a specific Term and Group/Subject.
    """
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    
    # Required relations
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    term_id = Column(Integer, ForeignKey("terms.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # The actual grade. Usually 1-5 or 0-100 based on institution.grading_system
    value = Column(Float, nullable=False)
    
    # Grading weight/category (e.g., 'IMTIHON', 'NAZORAT_ISHI', 'KUNDALIK')
    weight = Column(String(50), nullable=False, default="KUNDALIK")
    
    # Date the grade was awarded
    date = Column(Date, nullable=False, default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("User")
    term = relationship("Term")
    group = relationship("Group")
