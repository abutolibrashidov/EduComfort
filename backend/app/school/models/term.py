from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from app.core.models.base import Base

class Term(Base):
    """
    Represents an academic quarter (chorak) within an academic year.
    Used for breaking down the academic calendar for SCHOOL institutions.
    """
    __tablename__ = "terms"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id = Column(
        Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(50), nullable=False) # e.g. "1-chorak", "2-chorak"
    sequence = Column(Integer, nullable=False, default=1) # 1, 2, 3, 4
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    institution = relationship("Institution")
    academic_year = relationship("AcademicYear", backref="terms")
