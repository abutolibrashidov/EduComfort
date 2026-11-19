from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# ==== Gradebook Score Schemas ====

class GradebookScoreBase(BaseModel):
    score: float
    comment: Optional[str] = None

class GradebookScoreCreate(GradebookScoreBase):
    student_id: int

class GradebookScoreResponse(GradebookScoreBase):
    id: int
    exam_id: int
    student_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==== Gradebook Exam Schemas ====

class GradebookExamBase(BaseModel):
    title: str
    max_score: float = 100.0
    exam_date: Optional[datetime] = None

class GradebookExamCreate(GradebookExamBase):
    pass

class GradebookExamResponse(GradebookExamBase):
    id: int
    level_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class GradebookExamWithScoresResponse(GradebookExamResponse):
    scores: List[GradebookScoreResponse] = []

# ==== Gradebook Level Schemas ====

class GradebookLevelBase(BaseModel):
    title: str
    description: Optional[str] = None
    group_id: int
    passing_percentage: float = 60.0
    expected_exams: int = 5

class GradebookLevelCreate(GradebookLevelBase):
    pass

class GradebookLevelResponse(GradebookLevelBase):
    id: int
    institution_id: int
    created_by_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class GradebookLevelDetailResponse(GradebookLevelResponse):
    exams: List[GradebookExamWithScoresResponse] = []

# ==== Bulk Grade Input Schema ====

class GradebookBulkScoreInput(BaseModel):
    scores: List[GradebookScoreCreate]
