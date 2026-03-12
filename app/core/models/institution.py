"""
Institution Model - Represents tenant organizations in the multi-tenant system
Each institution is a separate entity (like Seven Plus Academy) that uses the EduComfort platform
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String(200), nullable=False, index=True)
    subdomain = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "sevenplusacademy"
    
    # Contact Information
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    
    # Branding
    logo_url = Column(String(500), nullable=True)  # Path to uploaded logo
    brand_name = Column(String(200), nullable=True) # Display name if different from 'name'
    primary_color = Column(String(7), default="#1890ff")  # Hex color code
    secondary_color = Column(String(7), default="#52c41a")  # Hex color code
    
    # Subscription & Status
    subscription_tier = Column(String(50), default="basic")  # basic, premium, enterprise
    commission_rate = Column(Float, default=0.10) # Platform commission rate (e.g., 0.10 = 10%)
    ai_credits_balance = Column(Float, default=0.0) # Available credits for AI processing
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - Using lazy loading to avoid circular dependencies
    # These will be populated via back_populates from the related models
    # branches = relationship("Branch", back_populates="institution", cascade="all, delete-orphan")
    # users = relationship("User", back_populates="institution", foreign_keys="User.institution_id")
    # courses = relationship("Course", back_populates="institution", cascade="all, delete-orphan")
    # groups = relationship("Group", back_populates="institution", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="institution", cascade="all, delete-orphan")
    subscription = relationship("InstitutionSubscription", back_populates="institution", uselist=False, cascade="all, delete-orphan")

    
    def __repr__(self):
        return f"<Institution {self.name} ({self.subdomain})>"
