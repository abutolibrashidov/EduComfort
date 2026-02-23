from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class TeacherRating(Base):
    __tablename__ = "teacher_ratings"

    id = Column(Integer, primary_key=True, index=True)
    rater_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    rater = relationship("User", foreign_keys=[rater_id], backref="ratings_given")
    teacher = relationship("User", foreign_keys=[teacher_id], backref="ratings_received")

    def __repr__(self):
        return f"<TeacherRating {self.rater_id} -> {self.teacher_id}: {self.rating} stars>"

class RatingCycle(Base):
    __tablename__ = "rating_cycles"

    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_processed = Column(Integer, default=0) # 0: False, 1: True
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TeacherAward(Base):
    __tablename__ = "teacher_awards"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cycle_id = Column(Integer, ForeignKey("rating_cycles.id", ondelete="CASCADE"), nullable=False)
    
    award_title = Column(String(255), nullable=False) # e.g., "Top Rated Teacher"
    award_date = Column(DateTime(timezone=True), server_default=func.now())
    certificate_url = Column(String(255), nullable=True) # Path to generated certificate
    
    teacher = relationship("User", foreign_keys=[teacher_id], backref="awards")
    cycle = relationship("RatingCycle", foreign_keys=[cycle_id], backref="awards")
