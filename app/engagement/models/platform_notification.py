"""
Platform Notifications — lightweight in-app notifications for the platform owner.
These are separate from institution-scoped announcements.

Examples:
  - "New institution 'ABC Academy' registered"
  - "Institution 'XYZ' subscription expired"
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from datetime import datetime
from app.models.base import Base


class PlatformNotification(Base):
    __tablename__ = "platform_notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="info")  # info, warning, success
    is_read = Column(Boolean, default=False)
    related_institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
