from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

# ── Base / Common ──
class CoreModel(BaseModel):
    id: int
    
    class Config:
        from_attributes = True

# ── Learning Levels ──
class LearningLevelBase(BaseModel):
    name: str
    description: Optional[str] = None
    sequence_order: int = 0
    is_active: bool = True

class LearningLevelResponse(LearningLevelBase, CoreModel):
    pass

# ── Learning Modules ──
class LearningModuleBase(BaseModel):
    level_id: int
    title: str
    description: Optional[str] = None
    sequence_order: int = 0
    is_active: bool = True

class LearningModuleResponse(LearningModuleBase, CoreModel):
    pass

# ── Learning Lessons ──
class LearningLessonBase(BaseModel):
    module_id: int
    title: str
    content: Optional[str] = None
    sequence_order: int = 0
    xp_reward: int = 10
    is_active: bool = True

class LearningLessonResponse(LearningLessonBase, CoreModel):
    pass

# ── Progress ──
class LessonProgressUpdate(BaseModel):
    is_completed: bool = True
    score: Optional[float] = None
    time_spent_seconds: int = 0

class LessonProgressResponse(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    is_completed: bool
    score: Optional[float]
    time_spent_seconds: int
    started_at: datetime
    completed_at: Optional[datetime]
    last_accessed_at: datetime

    class Config:
        from_attributes = True

# ── Exam Results ──
class ExamSubmitRequest(BaseModel):
    exam_type: str
    level_id: Optional[int] = None
    module_id: Optional[int] = None
    score: float
    passed: bool

class ExamResultResponse(BaseModel):
    id: int
    user_id: int
    level_id: Optional[int]
    module_id: Optional[int]
    exam_type: str
    score: float
    passed: bool
    taken_at: datetime

    class Config:
        from_attributes = True
