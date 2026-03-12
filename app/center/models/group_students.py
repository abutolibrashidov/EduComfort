from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from .base import Base


class GroupStudent(Base):
    """
    Association table for many-to-many relationship between Groups and Students
    """
    __tablename__ = "group_students"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Metadata
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    group = relationship("Group", backref=backref("student_enrollments", overlaps="student_groups,students"), overlaps="student_groups,students")
    student = relationship("User", backref=backref("group_enrollments", overlaps="student_groups,students"), overlaps="student_groups,students")

    def __repr__(self):
        return f"<GroupStudent group_id={self.group_id} student_id={self.student_id}>"