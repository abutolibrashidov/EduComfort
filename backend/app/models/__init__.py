from app.core.models.base import Base
from app.core.models.user import User
from app.core.models.institution import Institution
from app.school.models.academic_year import AcademicYear
from app.school.models.grade_level import GradeLevel
from app.center.models.enrollment import Enrollment
from app.school.models.term import Term
from app.core.models.subscription import InstitutionSubscription, SubscriptionPlan, SubscriptionStatus
from app.core.models.branch import Branch
from app.academic.models.subject import Subject
from app.center.models.group import Group, GroupLevel, GroupStatus
from app.center.models.group_students import GroupStudent
from app.academic.models.exam import Exam, ExamQuestion, ExamSubmission, ExamAnswer, ExamStatus, QuestionType, SubmissionStatus
from app.academic.models.passage import Passage
from app.academic.models.student_book import StudentBook
from app.academic.models.book_content import BookContent, StudentBookProgress, StudentBookAnswer
from app.academic.models.workbook import Workbook, WorkbookSubmission, WorkbookStatus, WorkbookSubmissionStatus
from app.academic.models.interactive_workbook import (
    InteractiveWorkbook, WorkbookExercise, StudentExerciseSubmission, WorkbookProgress,
    ExerciseTypeEnum, WorkbookStatus as InteractiveWorkbookStatus
)
from app.academic.models.performance import StudentPerformance, ExamPerformanceDetail, WorkbookPerformanceDetail
from app.engagement.models.achievement import UserAchievement, Achievement
from app.engagement.models.rating import TeacherRating, RatingCycle, TeacherAward
from app.academic.models.material import Material
from app.academic.models.lesson import Lesson
from app.academic.models.ielts import (
    IELTSExam, IELTSReadingPassage, IELTSReadingQuestion, IELTSReadingAnswer,
    IELTSListeningSection, IELTSListeningQuestion, IELTSListeningAnswer,
    IELTSWritingTask, IELTSWritingSubmission,
    IELTSSubmission, IELTSExamType, IELTSQuestionType, IELTSBandScore, IELTSSubmissionStatus
)
from app.academic.models.onlinecourse import (
    OnlineCourse, CourseModule, CourseLesson, LessonResource,
    LiveClass, LiveClassAttendance, StudentEnrollment, StudentCourseProgress,
    StudentLessonProgress, CourseAssignment, AssignmentSubmission,
    CourseType, CourseStatus, CourseDifficultyLevel, EnrollmentStatus, AssignmentStatus
)
from app.academic.models.interactive_book import (
    Book, Unit, Exercise, StudentAnswer, UnitProgress, BookProgress,
    AIProcessingLog, TeacherReview
)
from app.academic.models.book_processing_job import BookProcessingJob

from app.academic.models.gradebook import GradebookLevel, GradebookExam, GradebookScore
from app.academic.models.grade import Grade
from app.engagement.models.feedback import Feedback
from app.core.models.platform_setting import PlatformSetting
from app.core.models.parent_student import ParentStudent
from app.billing.models.monthly_fee import MonthlyFee

# --- Newly registered ghost models ---
from app.engagement.models.announcement import Announcement
from app.academic.models.attendance import Attendance, AttendanceStatus
from app.engagement.models.conversation import Conversation, ConversationType, ConversationParticipant, Message
from app.billing.models.expense import Expense
from app.engagement.models.leaderboard import LeaderboardEvent, StudentRatingLog, LeaderboardWinner
# Note: messaging.py also has Message, omitting to avoid collision.
from app.billing.models.payment import Payment
from app.engagement.models.platform_notification import PlatformNotification
from app.billing.models.teacher_payment import TeacherPayment

# --- New Private School Models ---
from app.school.models.school_class import SchoolClass
from app.school.models.timetable import Timetable, DayOfWeek
from app.school.models.daily_attendance import DailyAttendance, AttendanceStatus as DailyAttendanceStatus

__all__ = [
    "Base", "User", "Institution", "AcademicYear", "GradeLevel", "Enrollment", "Term", "InstitutionSubscription", "SubscriptionPlan", "SubscriptionStatus",
    "Branch", "Subject", "Group", "GroupLevel", "GroupStatus", "GroupStudent",
    "Exam", "ExamQuestion", "ExamSubmission", "ExamAnswer", "ExamStatus", "QuestionType", "SubmissionStatus",
    "Passage", "StudentBook", "BookContent", "StudentBookProgress", "StudentBookAnswer",
    "Workbook", "WorkbookSubmission", "WorkbookStatus", "WorkbookSubmissionStatus",
    "InteractiveWorkbook", "WorkbookExercise", "StudentExerciseSubmission", "WorkbookProgress",
    "ExerciseTypeEnum", "InteractiveWorkbookStatus",
    "StudentPerformance", "ExamPerformanceDetail", "WorkbookPerformanceDetail",
    "UserAchievement", "Achievement", "TeacherRating", "RatingCycle", "TeacherAward",
    "Material", "Lesson",
    "IELTSExam", "IELTSReadingPassage", "IELTSReadingQuestion", "IELTSReadingAnswer",
    "IELTSListeningSection", "IELTSListeningQuestion", "IELTSListeningAnswer",
    "IELTSWritingTask", "IELTSWritingSubmission", "IELTSSubmission", "IELTSExamType", 
    "IELTSQuestionType", "IELTSBandScore", "IELTSSubmissionStatus",
    "OnlineCourse", "CourseModule", "CourseLesson", "LessonResource", "LiveClass", 
    "LiveClassAttendance", "StudentEnrollment", "StudentCourseProgress", "StudentLessonProgress", 
    "CourseAssignment", "AssignmentSubmission", "CourseType", "CourseStatus", 
    "CourseDifficultyLevel", "EnrollmentStatus", "AssignmentStatus",
    "Book", "Unit", "Exercise", "StudentAnswer", "UnitProgress", "BookProgress",
    "AIProcessingLog", "TeacherReview", "BookProcessingJob",
    "GradebookLevel", "GradebookExam", "GradebookScore", "Grade", "Feedback", "PlatformSetting", "ParentStudent", "MonthlyFee",
    "Announcement", "Attendance", "AttendanceStatus", "Conversation", "ConversationType", "ConversationParticipant", "Message",
    "Expense", "LeaderboardEvent", "StudentRatingLog", "LeaderboardWinner",
    "Payment", "PlatformNotification", "TeacherPayment",
    "SchoolClass", "Timetable", "DayOfWeek", "DailyAttendance", "DailyAttendanceStatus"
]
