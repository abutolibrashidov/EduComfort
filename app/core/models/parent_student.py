from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.models.base import Base

class ParentStudent(Base):
    """
    Linking table for Parent to Student relationship.
    Allows one parent to have multiple children, and a child to have multiple parents (e.g., mother and father).
    """
    __tablename__ = "parent_students"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # e.g., "Mother", "Father", "Guardian"
    relationship_type = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships are handled via primaryjoin in the User model to avoid overlaps
