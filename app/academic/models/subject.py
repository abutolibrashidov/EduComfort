from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True, index=True)
    
    # Identification
    code = Column(String(50), index=True, nullable=True)  # e.g. MATH, ENG
    color = Column(String(20), default="#1890ff")
    
    # Multilingual Names
    name = Column(String(100), nullable=False)  # English/Default
    name_uz = Column(String(100), nullable=True)
    name_ru = Column(String(100), nullable=True)
    
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    institution = relationship("Institution", back_populates="subjects")
    # courses = relationship("Course", back_populates="subject")

    def __repr__(self):
        return f"<Subject {self.name}>"