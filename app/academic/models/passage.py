"""
Passage model for reading passages in exams
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models.base import Base


class Passage(Base):
    """Reading passage or context for exam questions"""
    __tablename__ = "passages"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    
    # Passage content
    title = Column(String(255), nullable=True)
    text = Column(Text, nullable=False)
    images = Column(Text, nullable=True)  # JSON array of image URLs
    sequence_order = Column(Integer, default=0)
    
    # Relationship
    exam = relationship("Exam", backref="passages")
