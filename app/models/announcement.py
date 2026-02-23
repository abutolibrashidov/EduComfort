from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_audience = Column(String, default="all") # 'all', 'teachers', 'students', 'group:ID'
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", backref="authored_announcements")
