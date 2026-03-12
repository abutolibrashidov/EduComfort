from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from app.core.models.base import Base

class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(50), nullable=False) # e.g. "2024-2025"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    institution = relationship("Institution")
