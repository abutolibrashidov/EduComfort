from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models.base import Base

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id = Column(
        Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True
    )
    grade_level_id = Column(
        Integer, ForeignKey("grade_levels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id = Column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = Column(String(50), nullable=False, default="active") # active, graduated, transferred
    
    school_class_id = Column(
        Integer, ForeignKey("school_classes.id", ondelete="SET NULL"), nullable=True, index=True
    )

    student = relationship("User", foreign_keys=[student_id])
    academic_year = relationship("AcademicYear")
    grade_level = relationship("GradeLevel")
    institution = relationship("Institution")
    school_class = relationship("SchoolClass")
