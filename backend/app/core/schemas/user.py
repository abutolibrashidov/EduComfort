from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.constants.roles import Role


# Base schema
class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: str = Field(..., min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    parent_phone_number: Optional[str] = Field(None, max_length=20)
    parent_name: Optional[str] = Field(None, max_length=100)
    parent_telegram_chat_id: Optional[str] = Field(None, max_length=50)
    branch_id: Optional[int] = None


# Create user (ADMIN only)
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    role: Role = Role.STUDENT
    is_active: bool = True


# Update user
class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    parent_phone_number: Optional[str] = Field(None, max_length=20)
    parent_name: Optional[str] = Field(None, max_length=100)
    parent_telegram_chat_id: Optional[str] = Field(None, max_length=50)
    branch_id: Optional[int] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


# Branch mini schema
class BranchMini(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# Response schema
class UserRead(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str]
    phone_number: str
    email: Optional[str]
    parent_phone_number: Optional[str]
    parent_name: Optional[str]
    parent_telegram_chat_id: Optional[str]
    role: Role
    is_active: bool
    is_super_admin: bool
    branch_id: Optional[int]
    branch: Optional[BranchMini] = None
    created_at: datetime
    updated_at: Optional[datetime]
    student_groups: Optional[List['GroupMini']] = []

    class Config:
        from_attributes = True


# Import at the end to avoid circular dependency
from app.center.schemas.group import GroupMini
UserRead.model_rebuild()


# List response (without relations for performance)
class UserListItem(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str]
    phone_number: str
    email: Optional[str]
    role: Role
    is_active: bool
    branch_id: Optional[int]

    class Config:
        from_attributes = True