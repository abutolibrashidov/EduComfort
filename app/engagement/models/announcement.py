from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_audience = Column(String, default="all")  # 'all', 'teachers', 'students'
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", backref="authored_announcements")
    institution = relationship("app.models.institution.Institution")
