from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.models.base import Base

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String, default="general") # e.g. 'bug', 'enhancement', 'general'
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="feedbacks")
