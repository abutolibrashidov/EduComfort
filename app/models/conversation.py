from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from .base import Base


class ConversationType(str, Enum):
    PRIVATE = "private"  # One-on-one between two users
    GROUP = "group"      # Group chat for a class/group


class Conversation(Base):
    """
    Represents a conversation thread (either private or group-based)
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Type of conversation
    type = Column(SQLEnum(ConversationType), nullable=False)
    
    # For group conversations only
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    group = relationship("Group", backref="conversation")
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation id={self.id} type={self.type}>"


class ConversationParticipant(Base):
    """
    Tracks who is part of each conversation
    """
    __tablename__ = "conversation_participants"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Metadata
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", backref="conversation_memberships")

    def __repr__(self):
        return f"<ConversationParticipant conversation_id={self.conversation_id} user_id={self.user_id}>"


class Message(Base):
    """
    Individual messages within conversations
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    edited_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", backref="sent_messages")

    def __repr__(self):
        return f"<Message id={self.id} conversation_id={self.conversation_id}>"