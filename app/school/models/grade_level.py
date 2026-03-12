from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.models.base import Base

class GradeLevel(Base):
    __tablename__ = "grade_levels"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False) # e.g. "Grade 1", "Grade 2"
    sequence = Column(Integer, nullable=False) # 1 through 11
    monthly_fee = Column(Float, nullable=True) # Override institution default for this grade
    
    institution = relationship("Institution")
