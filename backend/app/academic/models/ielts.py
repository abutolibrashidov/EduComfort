from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.models.base import Base


class IELTSExamType(str, enum.Enum):
    """Type of IELTS exam"""
    reading = "reading"
    listening = "listening"
    writing = "writing"
    full = "full"  # All sections


class IELTSQuestionType(str, enum.Enum):
    """Types of IELTS questions"""
    mcq = "mcq"  # Multiple choice
    tf = "true_false"  # True/False
    matching = "matching"
    fill_gap = "fill_gap"  # Fill in blanks
    short_answer = "short_answer"


class IELTSBandScore(str, enum.Enum):
    """IELTS Band Scores"""
    band_9 = "9.0"
    band_8_5 = "8.5"
    band_8 = "8.0"
    band_7_5 = "7.5"
    band_7 = "7.0"
    band_6_5 = "6.5"
    band_6 = "6.0"
    band_5_5 = "5.5"
    band_5 = "5.0"


class IELTSSubmissionStatus(str, enum.Enum):
    """Status of IELTS submission"""
    in_progress = "in_progress"
    submitted = "submitted"
    reading_graded = "reading_graded"
    listening_graded = "listening_graded"
    writing_graded = "writing_graded"
    fully_graded = "fully_graded"


class IELTSExam(Base):
    """IELTS Mock Exam"""
    __tablename__ = "ielts_exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    exam_type = Column(Enum(IELTSExamType), default=IELTSExamType.full)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Teacher
    
    # Exam details
    duration_minutes = Column(Integer, default=180)  # 3 hours for full IELTS
    total_band_score = Column(Float, default=9.0)
    passing_band_score = Column(Float, default=6.5)
    status = Column(String(50), default="draft")  # draft, published, archived
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # Relationships
    subject = relationship("Subject", backref="ielts_exams")
    created_by = relationship("User", backref="ielts_exams_created", foreign_keys=[created_by_id])
    reading_passages = relationship("IELTSReadingPassage", back_populates="exam", cascade="all, delete-orphan")
    listening_sections = relationship("IELTSListeningSection", back_populates="exam", cascade="all, delete-orphan")
    writing_tasks = relationship("IELTSWritingTask", back_populates="exam", cascade="all, delete-orphan")
    submissions = relationship("IELTSSubmission", back_populates="exam", cascade="all, delete-orphan")


# ============ READING SECTION ============

class IELTSReadingPassage(Base):
    """Reading comprehension passage"""
    __tablename__ = "ielts_reading_passages"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("ielts_exams.id"), nullable=False)
    passage_number = Column(Integer, nullable=False)  # 1, 2, or 3
    title = Column(String(255), nullable=True)
    passage_text = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=True)
    difficulty_level = Column(String(50), default="intermediate")  # beginner, intermediate, advanced
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("IELTSExam", back_populates="reading_passages")
    questions = relationship("IELTSReadingQuestion", back_populates="passage", cascade="all, delete-orphan")


class IELTSReadingQuestion(Base):
    """Reading comprehension question"""
    __tablename__ = "ielts_reading_questions"

    id = Column(Integer, primary_key=True, index=True)
    passage_id = Column(Integer, ForeignKey("ielts_reading_passages.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(IELTSQuestionType), default=IELTSQuestionType.mcq)
    
    # Options for MCQ
    option_a = Column(String(255), nullable=True)
    option_b = Column(String(255), nullable=True)
    option_c = Column(String(255), nullable=True)
    option_d = Column(String(255), nullable=True)
    
    correct_answer = Column(String(255), nullable=False)
    points = Column(Float, default=1.0)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    passage = relationship("IELTSReadingPassage", back_populates="questions")


# ============ LISTENING SECTION ============

class IELTSListeningSection(Base):
    """Listening section with audio"""
    __tablename__ = "ielts_listening_sections"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("ielts_exams.id"), nullable=False)
    section_number = Column(Integer, nullable=False)  # 1, 2, 3, or 4
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    audio_file_path = Column(String(500), nullable=True)  # Path to audio file
    audio_url = Column(String(500), nullable=True)  # URL to audio
    duration_seconds = Column(Integer, nullable=False)  # Audio length
    transcript = Column(Text, nullable=True)  # For teacher/student reference
    difficulty_level = Column(String(50), default="intermediate")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("IELTSExam", back_populates="listening_sections")
    questions = relationship("IELTSListeningQuestion", back_populates="section", cascade="all, delete-orphan")


class IELTSListeningQuestion(Base):
    """Listening comprehension question"""
    __tablename__ = "ielts_listening_questions"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("ielts_listening_sections.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(IELTSQuestionType), default=IELTSQuestionType.mcq)
    
    # Options for MCQ
    option_a = Column(String(255), nullable=True)
    option_b = Column(String(255), nullable=True)
    option_c = Column(String(255), nullable=True)
    option_d = Column(String(255), nullable=True)
    
    correct_answer = Column(String(255), nullable=False)
    points = Column(Float, default=1.0)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    section = relationship("IELTSListeningSection", back_populates="questions")


# ============ WRITING SECTION ============

class IELTSWritingTask(Base):
    """IELTS Writing Task (Task 1 or Task 2)"""
    __tablename__ = "ielts_writing_tasks"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("ielts_exams.id"), nullable=False)
    task_number = Column(Integer, nullable=False)  # 1 or 2
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    task_instructions = Column(Text, nullable=True)
    
    # Word count requirements
    word_count_min = Column(Integer, default=150 if task_number == 1 else 250)
    word_count_max = Column(Integer, default=250 if task_number == 1 else 400)
    time_limit_minutes = Column(Integer, default=20 if task_number == 1 else 40)
    
    max_band_score = Column(Float, default=9.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("IELTSExam", back_populates="writing_tasks")
    submissions = relationship("IELTSWritingSubmission", back_populates="task", cascade="all, delete-orphan")


class IELTSWritingSubmission(Base):
    """Student's IELTS writing submission"""
    __tablename__ = "ielts_writing_submissions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("ielts_writing_tasks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Student's writing
    written_text = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=True)
    
    # Grading (by teacher)
    band_score = Column(Float, nullable=True)  # 9.0 to 5.0
    grammatical_accuracy_score = Column(Float, nullable=True)
    vocabulary_score = Column(Float, nullable=True)
    task_response_score = Column(Float, nullable=True)
    coherence_cohesion_score = Column(Float, nullable=True)
    
    # Feedback
    teacher_feedback = Column(Text, nullable=True)
    grammar_comments = Column(Text, nullable=True)
    vocabulary_comments = Column(Text, nullable=True)
    task_response_comments = Column(Text, nullable=True)
    coherence_comments = Column(Text, nullable=True)
    
    # Status
    graded_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("IELTSWritingTask", back_populates="submissions")
    student = relationship("User", backref="ielts_writing_submissions", foreign_keys=[student_id])


# ============ OVERALL SUBMISSION ============

class IELTSSubmission(Base):
    """Overall IELTS exam submission"""
    __tablename__ = "ielts_submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("ielts_exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Scores for each section
    reading_score = Column(Float, nullable=True)  # Out of 40
    reading_correct = Column(Integer, nullable=True)
    reading_band = Column(String(10), nullable=True)  # 9.0 to 5.0
    
    listening_score = Column(Float, nullable=True)  # Out of 40
    listening_correct = Column(Integer, nullable=True)
    listening_band = Column(String(10), nullable=True)  # 9.0 to 5.0
    
    writing_task1_band = Column(String(10), nullable=True)
    writing_task2_band = Column(String(10), nullable=True)
    writing_overall_band = Column(String(10), nullable=True)
    
    # Overall
    overall_band_score = Column(Float, nullable=True)  # Average of all sections
    status = Column(Enum(IELTSSubmissionStatus), default=IELTSSubmissionStatus.in_progress)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    
    # Relationships
    exam = relationship("IELTSExam", back_populates="submissions")
    student = relationship("User", backref="ielts_submissions", foreign_keys=[student_id])
    reading_answers = relationship("IELTSReadingAnswer", back_populates="submission", cascade="all, delete-orphan")
    listening_answers = relationship("IELTSListeningAnswer", back_populates="submission", cascade="all, delete-orphan")


class IELTSReadingAnswer(Base):
    """Student's reading answer"""
    __tablename__ = "ielts_reading_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("ielts_submissions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("ielts_reading_questions.id"), nullable=False)
    student_answer = Column(String(500), nullable=False)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    answered_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    submission = relationship("IELTSSubmission", back_populates="reading_answers")


class IELTSListeningAnswer(Base):
    """Student's listening answer"""
    __tablename__ = "ielts_listening_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("ielts_submissions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("ielts_listening_questions.id"), nullable=False)
    student_answer = Column(String(500), nullable=False)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    answered_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    submission = relationship("IELTSSubmission", back_populates="listening_answers")
