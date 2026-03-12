from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    receiver_id: Optional[int] = None
    content: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None

    class Config:
        from_attributes = True  # Changed from orm_mode (Pydantic V2)


class UnreadCountResponse(BaseModel):
    unread_count: int


class ConversationResponse(BaseModel):
    """Schema for conversation list"""
    id: int  # Conversation ID (same as participant_id)
    participant_id: int
    participant_name: str
    participant_role: str
    last_message: str
    last_message_time: datetime
    unread_count: int

    class Config:
        from_attributes = True  # Changed from orm_mode (Pydantic V2)