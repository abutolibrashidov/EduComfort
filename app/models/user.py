from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum,
    ForeignKey,
    Boolean,
    DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base
from app.constants.roles import Role


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # 🔹 Identity
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)

    # 🔹 Contact (PRIMARY LOGIN)
    phone_number = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    parent_phone_number = Column(
        String(20),
        nullable=True
    )

    parent_name = Column(
        String(100),
        nullable=True
    )

    address = Column(
        String(255),
        nullable=True
    )

    bio = Column(
        String(500),
        nullable=True
    )

    employee_id = Column(
        String(50),
        nullable=True
    )

    department = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(20),
        default="active"
    )

    # 🔹 Optional email
    email = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True
    )

    # 🔹 Authentication
    password_hash = Column(String(255), nullable=False)

    # 🔹 Authorization
    # Changed from Enum to String to support lowercase roles in SQLite
    role = Column(
        String(50),
        nullable=False,
        default="student"
    )

    is_super_admin = Column(
        Boolean,
        default=False
    )
    
    is_platform_admin = Column(
        Boolean,
        default=False,
        index=True
    )  # EduComfort staff who can manage all institutions

    # 🔹 Organization
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=True,  # Nullable for platform admins
        index=True
    )
    
    branch_id = Column(
        Integer,
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True
    )

    institution = relationship("Institution", foreign_keys="User.institution_id")
    branch = relationship("Branch", back_populates="users")

    # 🔹 Groups Relationship is defined via backref from Group.students

    # 🔹 Payments Relationship (COMMENTED OUT - uncomment when Payment model exists)
    # payments = relationship("Payment", back_populates="student", cascade="all, delete-orphan")

    # 🔹 Status
    is_active = Column(Boolean, default=True)

    # 🔹 Auditing
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now()
    )

    # 🔹 Gamification
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_days = Column(Integer, default=0)
    last_activity_date = Column(DateTime(timezone=True), nullable=True)

    # 🔹 Stats
    profile_views = Column(Integer, default=0)
    avatar = Column(String(255), nullable=True)
    
    # Relationships
    achievements = relationship("app.models.achievement.UserAchievement", back_populates="user")

    def __repr__(self):
        return f"<User {self.phone_number} ({self.role})>"