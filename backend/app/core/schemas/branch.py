from pydantic import BaseModel, Field
from typing import Optional, List
from app.constants.roles import Role


# User summary for branch display
class UserSummary(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    phone_number: str
    email: Optional[str] = None
    role: Role
    is_active: bool

    class Config:
        from_attributes = True


# Base Branch Schema
class BranchBase(BaseModel):
    name: str
    address: Optional[str] = None
    is_active: bool = True


# Create Branch (input)
class BranchCreate(BranchBase):
    phone_number: Optional[str] = None
    description: Optional[str] = None


# Read Branch (output) - Basic
class BranchRead(BranchBase):
    id: int
    phone_number: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


# Read Branch with Users (detailed view)
class BranchWithUsers(BranchBase):
    id: int
    phone_number: Optional[str] = None
    description: Optional[str] = None
    users: List[UserSummary] = Field(default_factory=list)
    student_count: int = 0
    teacher_count: int = 0

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        # Calculate counts from users
        users_list = list(obj.users) if obj.users else []
        student_count = len([u for u in users_list if u.role == Role.STUDENT])
        teacher_count = len([u for u in users_list if u.role == Role.TEACHER])
        
        return cls(
            id=obj.id,
            name=obj.name,
            address=obj.address,
            phone_number=getattr(obj, 'phone_number', None),
            description=getattr(obj, 'description', None),
            is_active=obj.is_active,
            users=[UserSummary.from_orm(u) for u in users_list],
            student_count=student_count,
            teacher_count=teacher_count
        )