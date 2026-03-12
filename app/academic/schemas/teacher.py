# schemas/teacher.py
from pydantic import BaseModel

class TeacherDashboardSchema(BaseModel):
    total_groups: int
    total_students: int
    active_courses: int
    upcoming_lessons: int
    average_rating: float
