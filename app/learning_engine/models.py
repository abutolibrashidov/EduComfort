from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, BigInteger, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.models.base import Base

class LearningLevel(Base):
    """
    Represents a major milestone or difficulty tier. (e.g., A1, A2, B1)
    """
    __tablename__ = "learning_levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sequence_order = Column(Integer, default=0, index=True)
    is_active = Column(Boolean, default=True)
    
    modules = relationship("LearningModule", back_populates="level", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LearningLevel {self.name}>"

class LearningModule(Base):
    """
    A unit of study within a LearningLevel. Contains lessons.
    """
    __tablename__ = "learning_modules"

    id = Column(Integer, primary_key=True, index=True)
    level_id = Column(Integer, ForeignKey("learning_levels.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sequence_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    level = relationship("LearningLevel", back_populates="modules")
    lessons = relationship("LearningLesson", back_populates="module", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LearningModule {self.title}>"

class LearningLesson(Base):
    """
    An individual learning lesson or activity inside a Module.
    """
    __tablename__ = "learning_lessons"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)  # Core content payload (HTML, Markdown, or JSON specific blocks)
    sequence_order = Column(Integer, default=0)
    xp_reward = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)

    module = relationship("LearningModule", back_populates="lessons")

    def __repr__(self):
        return f"<LearningLesson {self.title}>"

class LearningLessonProgress(Base):
    """
    Tracks a user's progress through a specific lesson.
    """
    __tablename__ = "learning_lesson_progress"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id = Column(Integer, ForeignKey("learning_lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    
    is_completed = Column(Boolean, default=False, index=True)
    score = Column(Float, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    lesson = relationship("LearningLesson", foreign_keys=[lesson_id])

    __table_args__ = (
        Index("idx_learning_lesson_prog_user_lesson", "user_id", "lesson_id", unique=True),
    )

    def __repr__(self):
        return f"<LearningLessonProgress user={self.user_id} lesson={self.lesson_id} completed={self.is_completed}>"

class LearningExamResult(Base):
    """
    Results of milestone exams: placement, end-of-module, end-of-level.
    """
    __tablename__ = "learning_exam_results"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Optional links depending on the scope of the exam
    level_id = Column(Integer, ForeignKey("learning_levels.id", ondelete="CASCADE"), nullable=True, index=True)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=True, index=True)
    
    exam_type = Column(String(50), nullable=False, index=True)  # 'placement', 'module', 'level'
    score = Column(Float, nullable=False)
    passed = Column(Boolean, default=False)
    
    taken_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    level = relationship("LearningLevel", foreign_keys=[level_id])
    module = relationship("LearningModule", foreign_keys=[module_id])

    def __repr__(self):
        return f"<LearningExamResult user={self.user_id} type={self.exam_type} score={self.score}>"

class LearningCertificate(Base):
    """
    Issued when a learner successfully completes a LearningLevel.
    """
    __tablename__ = "learning_certificates"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    level_id = Column(Integer, ForeignKey("learning_levels.id", ondelete="CASCADE"), nullable=False, index=True)
    
    certificate_url = Column(String(500), nullable=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    level = relationship("LearningLevel", foreign_keys=[level_id])

    __table_args__ = (
        Index("idx_learning_cert_user_level", "user_id", "level_id", unique=True),
    )

    def __repr__(self):
        return f"<LearningCertificate user={self.user_id} level={self.level_id}>"
