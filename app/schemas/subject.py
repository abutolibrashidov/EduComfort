from pydantic import BaseModel
from typing import Optional

# ---------------- INPUT ----------------
class SubjectCreate(BaseModel):
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = "#1890ff"
    description: Optional[str] = None

# ---------------- OUTPUT ----------------
class SubjectRead(BaseModel):
    id: int
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    institution_id: Optional[int] = None

    class Config:
        from_attributes = True

# ---------------- UPDATE ----------------
class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
