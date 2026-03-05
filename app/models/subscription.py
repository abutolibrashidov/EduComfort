from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum as SqlEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base

class SubscriptionPlan(str, enum.Enum):
    SMALL = "small"           # Up to 50 students
    MEDIUM = "medium"         # 51-150 students
    LARGE = "large"           # 151-300 students
    ENTERPRISE = "enterprise" # 300+ students

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    TRIAL = "trial"

class InstitutionSubscription(Base):
    __tablename__ = "institution_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    plan = Column(SqlEnum(SubscriptionPlan, values_callable=lambda obj: [e.value for e in obj]), default=SubscriptionPlan.SMALL)
    status = Column(SqlEnum(SubscriptionStatus, values_callable=lambda obj: [e.value for e in obj]), default=SubscriptionStatus.ACTIVE)
    
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    next_billing_date = Column(DateTime, nullable=True)
    
    # --- Haqiqiy hisob-kitob maydonlari ---
    monthly_price = Column(Float, default=0.0)         # Oylik to'lov miqdori (so'm)
    contact_phone = Column(String(20), nullable=True)  # SMS qaysi raqamga borishini
    last_notified_at = Column(DateTime, nullable=True) # Oxirgi ogohlantirish SMS vaqti
    payment_received_at = Column(DateTime, nullable=True) # Oxirgi to'lov qabul qilingan vaqt
    blocked_at = Column(DateTime, nullable=True)       # Qachon bloklanganligi
    
    auto_renew = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="subscription")
