from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.ielts import (
    IELTSExam, IELTSReadingPassage, IELTSReadingQuestion, IELTSReadingAnswer,
    IELTSListeningSection, IELTSListeningQuestion, IELTSWritingTask, IELTSWritingSubmission, IELTSSubmission, IELTSSubmissionStatus
)
from app.models.subject import Subject
from app.schemas.ielts import (
    IELTSExamCreate, IELTSExamResponse, IELTSExamDetailResponse,
    IELTSReadingPassageCreate, IELTSReadingPassageResponse,
    IELTSReadingQuestionCreate, IELTSReadingQuestionResponse, IELTSReadingAnswerSubmit,
    IELTSListeningSectionCreate, IELTSListeningSectionResponse, 
    IELTSListeningQuestionCreate, IELTSWritingSubmissionCreate, IELTSWritingGrade,
    IELTSResultsResponse, StudentIELTSPerformance
)
from app.security.permissions import require_role

router = APIRouter(prefix="/ielts", tags=["IELTS Mock Tests"])


# ============ EXAM MANAGEMENT ============

@router.post("/exams", response_model=IELTSExamResponse, status_code=status.HTTP_201_CREATED)
async def create_ielts_exam(
    exam_data: IELTSExamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create new IELTS mock exam (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    # Verify subject if provided
    if exam_data.subject_id:
        subject = db.query(Subject).filter(Subject.id == exam_data.subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
    
    exam = IELTSExam(
        title=exam_data.title,
        description=exam_data.description,
        exam_type=exam_data.exam_type,
        subject_id=exam_data.subject_id,
        created_by_id=current_user.id,
        duration_minutes=exam_data.duration_minutes,
        passing_band_score=exam_data.passing_band_score,
    )
    
    db.add(exam)
    db.commit()
    db.refresh(exam)
    
    return exam


@router.get("/exams", response_model=List[IELTSExamResponse])
async def list_ielts_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all IELTS exams"""
    query = db.query(IELTSExam)
    
    # Students only see published exams
    if current_user.role == "student":
        query = query.filter(IELTSExam.status == "published")
    
    exams = query.order_by(IELTSExam.created_at.desc()).all()
    return exams


@router.get("/exams/{exam_id}", response_model=IELTSExamDetailResponse)
async def get_ielts_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get IELTS exam details"""
    exam = db.query(IELTSExam).filter(IELTSExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Students can only see published exams
    if current_user.role == "student" and exam.status != "published":
        raise HTTPException(status_code=403, detail="Exam not available")
    
    return exam


@router.put("/exams/{exam_id}/publish", response_model=IELTSExamResponse)
async def publish_ielts_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publish IELTS exam (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if current_user.role == "teacher" and exam.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only publish your own exams")
    
    exam.status = "published"
    exam.published_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)
    
    return exam


# ============ READING SECTION ============

@router.post("/exams/{exam_id}/reading/passages", response_model=IELTSReadingPassageResponse, status_code=status.HTTP_201_CREATED)
async def add_reading_passage(
    exam_id: int,
    passage_data: IELTSReadingPassageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add reading passage to IELTS exam"""
    require_role(current_user, ["teacher", "admin"])
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if current_user.role == "teacher" and exam.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own exams")
    
    passage = IELTSReadingPassage(
        exam_id=exam_id,
        passage_number=passage_data.passage_number,
        title=passage_data.title,
        passage_text=passage_data.passage_text,
        word_count=len(passage_data.passage_text.split()),
        difficulty_level=passage_data.difficulty_level,
    )
    
    db.add(passage)
    db.commit()
    db.refresh(passage)
    
    return passage


@router.post("/reading/passages/{passage_id}/questions", response_model=IELTSReadingQuestionResponse, status_code=status.HTTP_201_CREATED)
async def add_reading_question(
    passage_id: int,
    question_data: IELTSReadingQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add reading question to passage"""
    require_role(current_user, ["teacher", "admin"])
    
    passage = db.query(IELTSReadingPassage).filter(IELTSReadingPassage.id == passage_id).first()
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == passage.exam_id).first()
    if current_user.role == "teacher" and exam.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own exams")
    
    question = IELTSReadingQuestion(
        passage_id=passage_id,
        question_number=question_data.question_number,
        question_text=question_data.question_text,
        question_type=question_data.question_type,
        option_a=question_data.option_a,
        option_b=question_data.option_b,
        option_c=question_data.option_c,
        option_d=question_data.option_d,
        correct_answer=question_data.correct_answer,
        points=question_data.points,
        explanation=question_data.explanation,
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    
    return question


# ============ LISTENING SECTION ============

@router.post("/exams/{exam_id}/listening/sections", response_model=IELTSListeningSectionResponse, status_code=status.HTTP_201_CREATED)
async def add_listening_section(
    exam_id: int,
    section_data: IELTSListeningSectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add listening section to IELTS exam"""
    require_role(current_user, ["teacher", "admin"])
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if current_user.role == "teacher" and exam.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own exams")
    
    section = IELTSListeningSection(
        exam_id=exam_id,
        section_number=section_data.section_number,
        title=section_data.title,
        description=section_data.description,
        duration_seconds=section_data.duration_seconds,
        transcript=section_data.transcript,
        difficulty_level=section_data.difficulty_level,
    )
    
    db.add(section)
    db.commit()
    db.refresh(section)
    
    return section


@router.post("/listening/sections/{section_id}/questions", status_code=status.HTTP_201_CREATED)
async def add_listening_question(
    section_id: int,
    question_data: IELTSListeningQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add listening question to section"""
    require_role(current_user, ["teacher", "admin"])
    
    section = db.query(IELTSListeningSection).filter(IELTSListeningSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == section.exam_id).first()
    if current_user.role == "teacher" and exam.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own exams")
    
    question = IELTSListeningQuestion(
        section_id=section_id,
        question_number=question_data.question_number,
        question_text=question_data.question_text,
        question_type=question_data.question_type,
        option_a=question_data.option_a,
        option_b=question_data.option_b,
        option_c=question_data.option_c,
        option_d=question_data.option_d,
        correct_answer=question_data.correct_answer,
        points=question_data.points,
        explanation=question_data.explanation,
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    
    return question


# ============ WRITING TASKS ============

@router.post("/exams/{exam_id}/writing/tasks", status_code=status.HTTP_201_CREATED)
async def add_writing_task(
    exam_id: int,
    task_number: int,
    title: str,
    description: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add writing task to IELTS exam"""
    require_role(current_user, ["teacher", "admin"])
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if current_user.role == "teacher" and exam.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own exams")
    
    # Set default word counts based on task number
    word_count_min = 150 if task_number == 1 else 250
    word_count_max = 250 if task_number == 1 else 400
    time_limit = 20 if task_number == 1 else 40
    
    task = IELTSWritingTask(
        exam_id=exam_id,
        task_number=task_number,
        title=title,
        description=description,
        word_count_min=word_count_min,
        word_count_max=word_count_max,
        time_limit_minutes=time_limit,
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return task


# ============ STUDENT SUBMISSIONS ============

@router.post("/exams/{exam_id}/start", response_model=IELTSResultsResponse, status_code=status.HTTP_201_CREATED)
async def start_ielts_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student starts IELTS exam"""
    require_role(current_user, ["student"])
    
    exam = db.query(IELTSExam).filter(IELTSExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != "published":
        raise HTTPException(status_code=403, detail="Exam is not available")
    
    # Check if submission already exists
    existing = db.query(IELTSSubmission).filter(
        IELTSSubmission.exam_id == exam_id,
        IELTSSubmission.student_id == current_user.id
    ).first()
    
    if existing:
        return existing
    
    submission = IELTSSubmission(
        exam_id=exam_id,
        student_id=current_user.id,
        status=IELTSSubmissionStatus.in_progress,
        started_at=datetime.utcnow(),
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


@router.post("/submissions/{submission_id}/reading-answer", status_code=status.HTTP_200_OK)
async def submit_reading_answer(
    submission_id: int,
    answer_data: IELTSReadingAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits reading answer"""
    require_role(current_user, ["student"])
    
    submission = db.query(IELTSSubmission).filter(IELTSSubmission.id == submission_id).first()
    if not submission or submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your submission")
    
    question = db.query(IELTSReadingQuestion).filter(IELTSReadingQuestion.id == answer_data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if correct (case-insensitive)
    is_correct = answer_data.student_answer.strip().lower() == question.correct_answer.strip().lower()
    points_earned = question.points if is_correct else 0.0
    
    answer = IELTSReadingAnswer(
        submission_id=submission_id,
        question_id=answer_data.question_id,
        student_answer=answer_data.student_answer,
        is_correct=is_correct,
        points_earned=points_earned,
    )
    
    db.add(answer)
    db.commit()
    
    return {"is_correct": is_correct, "points_earned": points_earned}


@router.post("/submissions/{submission_id}/writing-submit", status_code=status.HTTP_201_CREATED)
async def submit_writing_task(
    submission_id: int,
    writing_data: IELTSWritingSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits writing task"""
    require_role(current_user, ["student"])
    
    # Create writing submission
    word_count = len(writing_data.written_text.split())
    
    submission = IELTSWritingSubmission(
        task_id=writing_data.task_id,
        student_id=current_user.id,
        written_text=writing_data.written_text,
        word_count=word_count,
        submitted_at=datetime.utcnow(),
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


@router.put("/writing/{submission_id}/grade", status_code=status.HTTP_200_OK)
async def grade_writing_task(
    submission_id: int,
    grade_data: IELTSWritingGrade,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher grades writing task"""
    require_role(current_user, ["teacher", "admin"])
    
    submission = db.query(IELTSWritingSubmission).filter(IELTSWritingSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.band_score = grade_data.band_score
    submission.grammatical_accuracy_score = grade_data.grammatical_accuracy_score
    submission.vocabulary_score = grade_data.vocabulary_score
    submission.task_response_score = grade_data.task_response_score
    submission.coherence_cohesion_score = grade_data.coherence_cohesion_score
    submission.teacher_feedback = grade_data.teacher_feedback
    submission.grammar_comments = grade_data.grammar_comments
    submission.vocabulary_comments = grade_data.vocabulary_comments
    submission.task_response_comments = grade_data.task_response_comments
    submission.coherence_comments = grade_data.coherence_comments
    submission.graded_at = datetime.utcnow()
    
    db.commit()
    db.refresh(submission)
    
    return {"status": "success", "band_score": submission.band_score}


@router.get("/student/{student_id}/performance", response_model=StudentIELTSPerformance)
async def get_student_ielts_performance(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student's IELTS performance analytics"""
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Cannot view other students' performance")
    
    submissions = db.query(IELTSSubmission).filter(
        IELTSSubmission.student_id == student_id,
        IELTSSubmission.status == IELTSSubmissionStatus.fully_graded
    ).all()
    
    if not submissions:
        return StudentIELTSPerformance(
            student_id=student_id,
            total_exams_taken=0,
        )
    
    overall_bands = [s.overall_band_score for s in submissions if s.overall_band_score]
    [s.reading_band for s in submissions if s.reading_band]
    [s.listening_band for s in submissions if s.listening_band]
    
    return StudentIELTSPerformance(
        student_id=student_id,
        total_exams_taken=len(submissions),
        average_overall_band=sum([float(b) for b in overall_bands]) / len(overall_bands) if overall_bands else None,
        best_overall_band=max([float(b) for b in overall_bands]) if overall_bands else None,
        latest_band_score=submissions[-1].overall_band_score if submissions else None,
    )
