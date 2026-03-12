from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.models.base import Base

class LeaderboardEvent(Base):
    __tablename__ = "leaderboard_events"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    
    start_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    teacher = relationship("User", foreign_keys=[teacher_id])
    group = relationship("Group", foreign_keys=[group_id])
    ratings = relationship("StudentRatingLog", back_populates="event", cascade="all, delete-orphan")
    winners = relationship("LeaderboardWinner", back_populates="event", cascade="all, delete-orphan")

class StudentRatingLog(Base):
    __tablename__ = "student_rating_logs"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("leaderboard_events.id", ondelete="CASCADE"), nullable=False)
    
    points = Column(Integer, nullable=False)
    reason = Column(String(50), nullable=False) # e.g., 'Performance', 'Homework', 'Test'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    teacher = relationship("User", foreign_keys=[teacher_id])
    student = relationship("User", foreign_keys=[student_id])
    event = relationship("LeaderboardEvent", back_populates="ratings")

class LeaderboardWinner(Base):
    __tablename__ = "leaderboard_winners"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("leaderboard_events.id", ondelete="CASCADE"), nullable=False)
    
    rank = Column(Integer, nullable=False) # 1, 2, 3
    total_points = Column(Integer, nullable=False)
    certificate_url = Column(String(255), nullable=True)
    prize_awarded = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    event = relationship("LeaderboardEvent", back_populates="winners")
