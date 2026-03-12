from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Lesson(Base):
    """Lesson plans and notices created by teachers for specific groups"""
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)  # The notice/message content
    lesson_date = Column(Date, nullable=False)
    
    # Assignment
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    teacher = relationship("User", backref="created_lessons")
    group = relationship("Group", backref="lessons_list")
