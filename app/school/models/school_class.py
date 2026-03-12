from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.models.base import Base

class SchoolClass(Base):
    __tablename__ = "school_classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)  # e.g. "1-A", "5-B"
    max_students = Column(Integer, default=30)
    status = Column(String(50), default="active")  # active, disabled, graduated
    
    # Relationships
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    grade_level_id = Column(Integer, ForeignKey("grade_levels.id", ondelete="CASCADE"), nullable=False, index=True)
    homeroom_teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Sinf rahbari

    institution = relationship("Institution")
    academic_year = relationship("AcademicYear")
    grade_level = relationship("GradeLevel")
    homeroom_teacher = relationship("User", foreign_keys=[homeroom_teacher_id])
    
    # We will likely want to link this to enrollments, or create a school_class_students table.
    
    __table_args__ = (
        UniqueConstraint("institution_id", "academic_year_id", "name", name="uix_school_class_name_per_year"),
    )
