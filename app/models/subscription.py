from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base

class SubscriptionPlan(str, enum.Enum):
    BRONZE = "bronze" # Management only
    SILVER = "silver" # Management + Gamification (No marketplace)
    GOLD = "gold"     # Full Scale (Everything)

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    TRIAL = "trial"

class InstitutionSubscription(Base):
    __tablename__ = "institution_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    plan = Column(SqlEnum(SubscriptionPlan), default=SubscriptionPlan.SILVER)
    status = Column(SqlEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True) # If null, maybe lifetime or indefinite? But user asked for monthly.
    next_billing_date = Column(DateTime, nullable=True)
    
    auto_renew = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="subscription")
