"""
Individual Learning Domain — Models

Tracks self-study learner progress outside of institution classrooms.
Individual learners:
  - Have user_type = 'individual' on the User model
  - Can purchase courses directly via the Marketplace
  - Have their own XP engine (IndividualGamificationEngine)
  - Are NOT linked to groups, branches, or institutions

Tables:
    individual_enrollments       — a learner's active subscription to a course
    individual_lesson_progress   — per-lesson completion tracking
    individual_course_progress   — per-course aggregated progress summary
"""
from sqlalchemy import (
    Column, Integer, BigInteger, String, Float,
    Boolean, DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.models.base import Base


class IndividualEnrollment(Base):
    """
    An individual learner's enrollment in an online course.

    Created automatically when a MarketplaceOrder for a course is completed,
    OR directly for free courses.

    status values:
        'active', 'completed', 'dropped', 'suspended'
    """
    __tablename__ = "individual_enrollments"

    id                      = Column(Integer, primary_key=True, index=True)
    user_id                 = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # Link to the online course (via online_courses.id)
    course_id               = Column(
        Integer,
        ForeignKey("online_courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # Optional: trace back to the marketplace order that granted access
    order_id                = Column(
        BigInteger,
        ForeignKey("marketplace_orders.id", ondelete="SET NULL"),
        nullable=True
    )

    # Enrollment state
    status                  = Column(String(20), nullable=False, default="active")

    # Progress snapshot (updated by IndividualGamificationEngine)
    completion_percentage   = Column(Float, default=0.0)
    lessons_completed       = Column(Integer, default=0)
    total_lessons           = Column(Integer, default=0)

    # Certificate
    certificate_earned      = Column(Boolean, default=False)
    certificate_issued_at   = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    enrolled_at             = Column(DateTime(timezone=True), server_default=func.now())
    completed_at            = Column(DateTime(timezone=True), nullable=True)
    last_activity_at        = Column(DateTime(timezone=True), nullable=True)
    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user                    = relationship("User", foreign_keys=[user_id])
    lesson_progress         = relationship(
        "IndividualLessonProgress",
        back_populates="enrollment",
        cascade="all, delete-orphan"
    )
    course_progress         = relationship(
        "IndividualCourseProgress",
        back_populates="enrollment",
        uselist=False,
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        # A user can only enroll once per course
        UniqueConstraint("user_id", "course_id", name="uq_individual_enrollment_user_course"),
        Index("idx_individual_enrollment_user_status", "user_id", "status"),
    )

    def __repr__(self):
        return f"<IndividualEnrollment user={self.user_id} course={self.course_id} {self.completion_percentage:.0f}%>"


class IndividualLessonProgress(Base):
    """
    Tracks whether an individual learner has completed a specific lesson.
    Created on first lesson access; updated when completed.

    Completion of a lesson triggers:
        → IndividualGamificationEngine.on_lesson_complete()
        → XP awarded (daily cap checked)
        → IndividualEnrollment.completion_percentage updated
    """
    __tablename__ = "individual_lesson_progress"

    id                      = Column(Integer, primary_key=True, index=True)
    enrollment_id           = Column(
        Integer,
        ForeignKey("individual_enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    lesson_id               = Column(
        Integer,
        ForeignKey("course_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id                 = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )  # Denormalized for fast per-user queries

    is_completed            = Column(Boolean, default=False, nullable=False)
    completion_percentage   = Column(Float, default=0.0)

    started_at              = Column(DateTime(timezone=True), nullable=True)
    completed_at            = Column(DateTime(timezone=True), nullable=True)
    time_spent_minutes      = Column(Integer, default=0)

    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    enrollment              = relationship("IndividualEnrollment", back_populates="lesson_progress")
    user                    = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("enrollment_id", "lesson_id", name="uq_individual_lesson_progress"),
        Index("idx_ind_lesson_progress_user", "user_id", "is_completed"),
    )

    def __repr__(self):
        return f"<IndividualLessonProgress user={self.user_id} lesson={self.lesson_id} done={self.is_completed}>"


class IndividualCourseProgress(Base):
    """
    Aggregated progress summary for an individual learner in a course.
    One row per enrollment. Updated whenever a lesson is completed.

    Used for dashboard display and certificate eligibility checks.
    """
    __tablename__ = "individual_course_progress"

    id                          = Column(Integer, primary_key=True, index=True)
    enrollment_id               = Column(
        Integer,
        ForeignKey("individual_enrollments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    # Counters (maintained by the service layer on each lesson completion)
    modules_completed           = Column(Integer, default=0)
    total_modules               = Column(Integer, default=0)
    lessons_completed           = Column(Integer, default=0)
    total_lessons               = Column(Integer, default=0)
    assignments_submitted       = Column(Integer, default=0)
    total_assignments           = Column(Integer, default=0)

    # Performance
    average_assignment_score    = Column(Float, nullable=True)
    overall_score               = Column(Float, nullable=True)   # percentage

    # XP earned specifically within this course (from xp_ledger reference)
    xp_earned_in_course         = Column(Integer, default=0)

    last_updated                = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    enrollment                  = relationship("IndividualEnrollment", back_populates="course_progress")

    def __repr__(self):
        return (
            f"<IndividualCourseProgress enrollment={self.enrollment_id} "
            f"lessons={self.lessons_completed}/{self.total_lessons}>"
        )
