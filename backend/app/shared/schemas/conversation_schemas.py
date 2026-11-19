from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum


class ConversationType(str, Enum):
    PRIVATE = "private"
    GROUP = "group"


# ============================================
# MESSAGE SCHEMAS
# ============================================

class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    content: str
    created_at: datetime
    edited_at: Optional[datetime] = None
    is_deleted: bool

    class Config:
        from_attributes = True


# ============================================
# CONVERSATION SCHEMAS
# ============================================

class ConversationParticipant(BaseModel):
    user_id: int
    user_name: str
    user_role: str
    last_read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    """For creating private conversations"""
    participant_id: int  # The other user's ID


class GroupConversationInfo(BaseModel):
    """Extra info for group conversations"""
    group_id: int
    group_name: str
    subject_name: str
    teacher_name: str
    student_count: int


class ConversationResponse(BaseModel):
    id: int
    type: ConversationType
    
    # For group conversations
    group_id: Optional[int] = None
    group_info: Optional[GroupConversationInfo] = None
    
    # Participants
    participants: List[ConversationParticipant]
    
    # Last message info
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    last_message_sender: Optional[str] = None
    
    # Unread count for current user
    unread_count: int = 0
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    """Simplified version for conversation list"""
    id: int
    type: ConversationType
    
    # Display info
    display_name: str  # Group name or other user's name
    display_avatar: Optional[str] = None
    
    # For group chats
    group_id: Optional[int] = None
    participant_count: Optional[int] = None
    
    # Last message
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    last_message_sender: Optional[str] = None
    
    # Unread
    unread_count: int = 0

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int
