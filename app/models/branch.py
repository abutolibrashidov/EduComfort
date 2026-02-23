from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    
    # Institution association
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    institution = relationship("Institution")
    users = relationship("User", back_populates="branch", lazy="joined")
    
    # Unique constraint: branch name must be unique within an institution
    __table_args__ = (
        UniqueConstraint('institution_id', 'name', name='uq_institution_branch_name'),
    )