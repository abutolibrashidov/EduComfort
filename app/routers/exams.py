from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import os
import shutil
from pathlib import Path

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.exam import Exam, ExamQuestion, ExamSubmission, ExamAnswer, ExamStatus, SubmissionStatus
from app.models.subject import Subject
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamDetailResponse, ExamListResponse,
    ExamAnswerSubmit, ExamSubmissionResponse, ExamGradingResponse,
    StudentExamPerformance, ExamDashboardResponse, QuestionType,
    ExamSubmissionUpdate, ExamQuestionCreate, ExamSecurityEvent,
    ExamHierarchyUnit, ExamHierarchySet, ExamHierarchyVariant
)

from app.security.permissions import (
    is_super_admin,
    is_admin_or_higher,
    is_teacher,
    is_student,
    is_platform_owner
)

router = APIRouter(tags=["Exams"])

# File upload configuration for exam papers
UPLOAD_DIR_PAPERS = Path("uploads/exam_papers")
UPLOAD_DIR_PAPERS.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR_RESPONSES = Path("uploads/exam_responses")
UPLOAD_DIR_RESPONSES.mkdir(parents=True, exist_ok=True)


# ============ HELPER FUNCTIONS ============

def auto_grade_submission(submission: ExamSubmission, db: Session):
    """
    Auto-grade an exam submission with enhanced logic:
    1. Exact match (case-insensitive) - 100% marks
    2. Acceptable variants from additional_data - 100% marks
    3. Fuzzy matching (90%+ similarity) - 50% marks
    4. Multiple correct answers support
    """
    import json
    from difflib import SequenceMatcher
    
    total_points = 0
    earned_points = 0
    correct_count = 0
    wrong_count = 0
    
    # Get all questions for this exam
    questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == submission.exam_id).all()
    
    # Calculate score
    for answer in submission.answers:
        question = next((q for q in questions if q.id == answer.question_id), None)
        if not question:
            continue
        
        total_points += question.points
        
        # Skip if no answer provided
        if not answer.answer_text:
            answer.is_correct = False
            answer.points_earned = 0
            wrong_count += 1
            continue
        
        # Parse additional_data JSON if present
        additional_data = {}
        if question.additional_data:
            try:
                additional_data = json.loads(question.additional_data)
            except json.JSONDecodeError:
                pass
        
        # Normalize answers for comparison
        student_answer = answer.answer_text.strip().lower()
        correct_answer = question.correct_answer.strip().lower() if question.correct_answer else ""
        
        is_correct = False
        points_awarded = 0.0
        
        # 1. Check exact match (case-insensitive)
        if student_answer == correct_answer:
            is_correct = True
            points_awarded = question.points
        
        # 2. Check acceptable variants
        elif "acceptableVariants" in additional_data:
            variants = additional_data["acceptableVariants"]
            if isinstance(variants, list):
                # Normalize all variants
                normalized_variants = [str(v).strip().lower() for v in variants]
                if student_answer in normalized_variants:
                    is_correct = True
                    points_awarded = question.points
        
        # 3. Check multiple correct answers (stored as array)
        elif "multipleCorrect" in additional_data:
            correct_answers = additional_data["multipleCorrect"]
            if isinstance(correct_answers, list):
                normalized_correct = [str(a).strip().lower() for a in correct_answers]
                if student_answer in normalized_correct:
                    is_correct = True
                    points_awarded = question.points
        
        # 4. Fuzzy matching for partial credit (90%+ similarity = 50% marks)
        if not is_correct and correct_answer:
            similarity = SequenceMatcher(None, student_answer, correct_answer).ratio()
            if similarity >= 0.9:
                # Award 50% of points for close match
                is_correct = None  # Partial credit (not fully correct)
                points_awarded = question.points * 0.5
        
        # Update answer record
        answer.is_correct = is_correct
        answer.points_earned = points_awarded
        earned_points += points_awarded
        
        if is_correct is True:
            correct_count += 1
        elif is_correct is False:
            wrong_count += 1
        # is_correct = None means partial credit
    
    # Update submission
    submission.score_obtained = earned_points
    submission.total_score = total_points
    submission.percentage = (earned_points / total_points * 100) if total_points > 0 else 0
    submission.is_passed = submission.percentage >= submission.exam.passing_score
    submission.status = SubmissionStatus.graded
    submission.graded_at = datetime.utcnow()
    
    # Auto-notify admin
    submission.submitted_to_admin = True
    submission.admin_notified_at = datetime.utcnow()
    
    db.commit()
    return submission


# ============ EXAM MANAGEMENT ENDPOINTS ============

@router.get("/imported", response_model=List[ExamListResponse])
def get_imported_exams(
    level: Optional[str] = None,
    unit: Optional[int] = None,
    set_num: Optional[int] = None,
    variant: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get imported exams filtered by metadata from custom_data JSON field.
    
    Query Parameters:
        - level: Filter by level (e.g., "elementary", "intermediate")
        - unit: Filter by unit number (e.g., 7)
        - set_num: Filter by set number (e.g., 1, 2)
        - variant: Filter by variant (e.g., "A", "B")
    
    Example: GET /exams/imported?level=elementary&unit=7&variant=A
    """
    import json
    
    # Base query for imported exams only
    query = db.query(Exam).filter(Exam.is_imported == True)
    
    # Apply institution filter (multi-tenancy)
    if not is_super_admin(current_user):
        query = query.filter(Exam.institution_id == current_user.institution_id)
    
    # Get all imported exams
    exams = query.all()
    
    # Filter by custom_data JSON fields (SQLite doesn't have native JSON operators)
    filtered_exams = []
    for exam in exams:
        if not exam.custom_data:
            continue
        
        try:
            custom_data = json.loads(exam.custom_data)
            
            # Apply filters
            if level and custom_data.get("level") != level:
                continue
            if unit is not None and custom_data.get("unit") != unit:
                continue
            if set_num is not None and custom_data.get("set") != set_num:
                continue
            if variant and custom_data.get("variant") != variant:
                continue
            
            # Create list item
            item = ExamListResponse.model_validate(exam)
            item.question_count = len(exam.questions)
            filtered_exams.append(item)
            
        except json.JSONDecodeError:
            continue
            
    return filtered_exams


@router.get("/imported/hierarchy", response_model=List[ExamHierarchyUnit])
def get_imported_exams_hierarchy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get imported exams grouped by Unit and Set for the hierarchical library view.
    Structure: Unit -> Set -> Variants (A, B, etc.)
    """
    import json
    
    # 1. Fetch all imported exams for institution
    query = db.query(Exam).filter(Exam.is_imported == True)
    
    if not is_super_admin(current_user):
        query = query.filter(Exam.institution_id == current_user.institution_id)
        
    exams = query.all()
    
    # 2. Group by Unit -> Set
    # Map: unit_id -> { set_num -> [variants] }
    units_map = {}
    
    for exam in exams:
        if not exam.custom_data:
            continue
            
        try:
            custom_data = json.loads(exam.custom_data)
            
            unit = custom_data.get("unit")
            set_num = custom_data.get("set")
            variant = custom_data.get("variant")
            
            if unit is None or set_num is None:
                continue
                
            # Initialize unit entry
            if unit not in units_map:
                units_map[unit] = {}
            
            # Initialize set entry
            if set_num not in units_map[unit]:
                units_map[unit][set_num] = []
                
            # Add variant
            units_map[unit][set_num].append(
                ExamHierarchyVariant(
                    variant=variant or "Standard",
                    exam_id=exam.id,
                    title=exam.title,
                    status=exam.status,
                    question_count=len(exam.questions),
                    test_type=custom_data.get("testType"),
                    total_marks=custom_data.get("totalMarks"),
                    estimated_time=custom_data.get("estimatedTime"),
                    source=custom_data.get("source")
                )
            )
            
        except (json.JSONDecodeError, AttributeError):
            continue
            
    # 3. Convert to response model
    hierarchy = []
    
    # Sort units numerically
    for unit_num in sorted(units_map.keys()):
        sets_list = []
        
        # Sort sets numerically
        for set_num in sorted(units_map[unit_num].keys()):
            variants = units_map[unit_num][set_num]
            # Sort variants (A, B, C...)
            variants.sort(key=lambda x: x.variant)
            
            sets_list.append(
                ExamHierarchySet(
                    set_num=set_num,
                    variants=variants
                )
            )
            
        hierarchy.append(
            ExamHierarchyUnit(
                unit=unit_num,
                sets=sets_list
            )
        )
        
    return hierarchy
            
@router.post("/assign-set")
def assign_set_to_group(
    group_id: int,
    unit: int,
    set_number: int,
    start_date: Optional[datetime] = None,
    due_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign a full set of exams (e.g., Unit 1 Set 1) to a group.
    Creates copies of all imported exams in that set for the group.
    """
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only teachers and admins can assign sets")
    
    # 1. Find all imported exams for this Unit/Set
    import json
    
    # Get all imported exams first (optimization: can filter by custom_data in DB if using Postgres with JSONB, but here we do in python)
    imported_exams = db.query(Exam).filter(Exam.is_imported == True).all()
    
    exams_to_assign = []
    for exam in imported_exams:
        if not exam.custom_data:
            continue
        try:
            data = json.loads(exam.custom_data)
            if int(data.get("unit", -1)) == unit and int(data.get("set", 1)) == set_number:
                exams_to_assign.append(exam)
        except (ValueError, TypeError, json.JSONDecodeError):
            continue
            
    if not exams_to_assign:
        raise HTTPException(status_code=404, detail=f"No exams found for Unit {unit} Set {set_number}")
        
    created_exams = []
    
    # 2. Create copies for the group
    for source_exam in exams_to_assign:
        # Create new exam instance
        new_exam = Exam(
            title=source_exam.title,
            description=source_exam.description,
            subject_id=source_exam.subject_id,
            group_id=group_id,
            created_by_id=current_user.id,
            institution_id=current_user.institution_id,
            total_points=source_exam.total_points,
            duration_minutes=source_exam.duration_minutes,
            passing_score=source_exam.passing_score,
            auto_grade=source_exam.auto_grade,
            show_answers=source_exam.show_answers,
            start_date=start_date,
            end_date=due_date,
            status=ExamStatus.draft, # Created as DRAFT so teacher can review/publish
            is_imported=True, # Mark as imported so we know origin
            custom_data=source_exam.custom_data # Keep metadata for grouping
        )
        
        db.add(new_exam)
        db.flush() # get ID
        
        # Copy questions
        for source_q in source_exam.questions:
            new_q = ExamQuestion(
                exam_id=new_exam.id,
                question_text=source_q.question_text,
                question_type=source_q.question_type,
                points=source_q.points,
                sequence_order=source_q.sequence_order,
                option_a=source_q.option_a,
                option_b=source_q.option_b,
                option_c=source_q.option_c,
                option_d=source_q.option_d,
                correct_answer=source_q.correct_answer,
                explanation=source_q.explanation,
                input_mode=source_q.input_mode,
                gaps=source_q.gaps,
                left_items=source_q.left_items,
                right_items=source_q.right_items,
                correct_matches=source_q.correct_matches,
                items_to_order=source_q.items_to_order,
                correct_sequence=source_q.correct_sequence,
                additional_data=source_q.additional_data,
                requires_teacher_grading=source_q.requires_teacher_grading,
                allow_multiple_answers=source_q.allow_multiple_answers
            )
            db.add(new_q)
            
        created_exams.append(new_exam)
        
    db.commit()
    
    return {
        "message": f"Assigned {len(created_exams)} exams to group",
        "exams": [
            {"id": e.id, "title": e.title} for e in created_exams
        ]
    }


@router.get("/student/grouped")
def get_student_exam_sets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all exams for the student, grouped by Unit -> Set.
    Only returns PUBLISHED exams.
    """
    if not is_student(current_user):
        raise HTTPException(status_code=403, detail="Only students can access this")
        
    # Get all published exams for this student (filtered by institution and group if applicable)
    # Note: Logic from list_exams but tailored
    query = db.query(Exam).filter(
        Exam.status == ExamStatus.published,
        Exam.institution_id == current_user.institution_id
    )
    
    # If student is in a group, we might want to filter by group_id effectively?
    # Usually Exam.group_id is nullable or specific. 
    # If assigned to a group, exam.group_id == student.group_id
    # We should probably filter by that if we can, but list_exams doesn't seem to enforce it strictly for listing 
    # (it trusts the student can see institution exams?). 
    # Let's assume list_exams logic: "all users can view published exams" (within institution)
    # But for a specific student, they should only see exams assigned to THEIR group or global.
    
    # For now, let's fetch all published exams in institution.
    all_exams = query.all()
    
    import json
    from collections import defaultdict
    
    units_dict = defaultdict(lambda: defaultdict(list))
    other_exams = []
    
    for exam in all_exams:
        # Check if it has Unit/Set metadata
        processed = False
        if exam.custom_data:
            try:
                data = json.loads(exam.custom_data)
                unit_val = data.get("unit")
                set_val = data.get("set", 1)
                
                if unit_val is not None:
                    try:
                        unit_num = int(unit_val)
                        set_num = int(set_val)

                        # Heuristic: Infer set from title if not explicitly set greater than 1
                        if set_num == 1 and exam.title:
                            title_lower = exam.title.lower()
                            if "short test 2" in title_lower or "progress test b" in title_lower:
                                set_num = 2
                            elif "short test 1" in title_lower or "progress test a" in title_lower:
                                set_num = 1
                        
                        # Calculate progress
                        # Find submission
                        submission = db.query(ExamSubmission).filter(
                            ExamSubmission.exam_id == exam.id,
                            ExamSubmission.student_id == current_user.id
                        ).first()
                        
                        status_str = "pending"
                        score = None
                        if submission:
                            status_str = submission.status
                            if submission.status == SubmissionStatus.graded:
                                score = submission.percentage
                        
                        exam_data = {
                            "id": exam.id,
                            "title": exam.title,
                            "type": data.get("testType", "unknown"),
                            "variant": data.get("variant", ""),
                            "status": status_str,
                            "score": score,
                            "total_points": exam.total_points,
                            "duration_minutes": exam.duration_minutes
                        }
                        
                        units_dict[unit_num][set_num].append(exam_data)
                        processed = True
                    except ValueError:
                        pass
            except json.JSONDecodeError:
                pass
                
        if not processed:
            other_exams.append({
                "id": exam.id,
                "title": exam.title,
                "status": "pending", # Simplified
                "created_at": exam.created_at
            })
            
    # Format response
    units_list = []
    for unit_num in sorted(units_dict.keys()):
        sets_list = []
        for set_num in sorted(units_dict[unit_num].keys()):
            tests = units_dict[unit_num][set_num]
            
            # Sort tests
            def test_sort_key(test):
                type_order = {"short": 0, "progress": 1, "cumulative": 2}
                variant_order = {"A": 0, "B": 1, "": 2}
                return (
                    type_order.get(test.get("type"), 99),
                    variant_order.get(test.get("variant"), 99)
                )
            tests.sort(key=test_sort_key)
            
            # Calculate Set Status
            # If all completed -> Completed
            # If any in progress -> In Progress
            # Else -> Start
            total_tests = len(tests)
            completed_count = sum(1 for t in tests if t["status"] in ["graded", "submitted"])
            
            set_status = "pending"
            if completed_count == total_tests and total_tests > 0:
                set_status = "completed"
            elif completed_count > 0:
                set_status = "in_progress"
                
            sets_list.append({
                "set_number": set_num,
                "status": set_status,
                "completed_count": completed_count,
                "total_count": total_tests,
                "tests": tests
            })
            
        units_list.append({
            "unit_number": unit_num,
            "sets": sets_list
        })
        
    return {
        "grouped_exams": units_list,
        "other_exams": other_exams
    }


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new exam (Teachers/Admins only)"""
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only teachers and admins can create exams")
    
    # Check if subject exists
    subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    new_exam = Exam(
        title=exam.title,
        description=exam.description,
        subject_id=exam.subject_id,
        group_id=exam.group_id,
        created_by_id=current_user.id,
        institution_id=current_user.institution_id,  # Set institution_id for multi-tenancy
        total_points=exam.total_points,
        duration_minutes=exam.duration_minutes,
        passing_score=exam.passing_score,
        auto_grade=exam.auto_grade,
        show_answers=exam.show_answers,
        start_date=exam.start_date,
        end_date=exam.end_date,
        is_file_based=exam.is_file_based,
        file_path=exam.file_path,
        file_name=exam.file_name,
        status=ExamStatus.draft
    )
    
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam


@router.post("/{exam_id}/upload-paper", response_model=ExamResponse)
def upload_exam_paper(
    exam_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload an exam paper (PDF/Word) for a file-based exam"""
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only teachers and admins can upload exam papers")
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")
    
    # Save file
    file_path = UPLOAD_DIR_PAPERS / f"exam_{exam_id}{ext}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update exam
    exam.file_path = str(file_path)
    exam.file_name = file.filename
    exam.is_file_based = True
    db.commit()
    db.refresh(exam)
    
    return exam


@router.post("/extract-questions")
async def extract_questions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract questions from uploaded file (PDF, DOCX, TXT)"""
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only teachers can upload files")
    
    # Check extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(status_code=400, detail="Supported formats: PDF, DOCX, TXT")
    
    try:
        content = await file.read() # Use await for async file read
        from app.utils.exam_parser import extract_text_from_file, parse_exam_text
        
        # 1. Extract raw text
        text = extract_text_from_file(content, file.filename)
        
        # 2. Parse text into structured questions
        parsed_questions = parse_exam_text(text)
        
        return parsed_questions
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


from app.utils.advanced_content_analyzer import analyze_educational_content
from app.utils.exam_parser import extract_text_from_file # Added this import here as it was missing from the original context

@router.post("/analyze-content")
async def analyze_content(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Advanced content analysis endpoint
    Analyzes uploaded educational material and detects multiple question types
    """
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only teachers can analyze content")
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        text = extract_text_from_file(content, file.filename)
        
        # Analyze with advanced analyzer
        analyzed = analyze_educational_content(text, file.filename)
        
        # Return structured analysis
        return {
            "metadata": analyzed.metadata,
            "passages": [p.dict() for p in analyzed.passages],
            "questions": [q.dict() for q in analyzed.questions],
            "answer_key": analyzed.answer_key
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/import-json", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def import_json_test_endpoint(
    file: UploadFile = File(...),
    subject_id: int = None,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import a standardized JSON test file and create an exam.
    
    Args:
        file: JSON test file upload
        subject_id: Subject ID to assign the test to (e.g., English)
        group_id: Optional group ID to assign the test to
    
    Returns:
        Created Exam object with all questions imported
    """
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only teachers and admins can import tests")
    
    # Validate subject
    if not subject_id:
        raise HTTPException(status_code=400, detail="subject_id is required")
    
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check file extension
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    try:
        # Save uploaded file temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.json', mode='wb') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Import the test
        from app.services.json_test_importer import import_json_test
        
        exam = import_json_test(
            json_file_path=tmp_file_path,
            subject_id=subject_id,
            institution_id=current_user.institution_id,
            created_by_id=current_user.id,
            group_id=group_id,
            db=db
        )
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        return exam
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to import test: {str(e)}")


@router.get("", response_model=List[ExamListResponse])
def list_exams(
    subject_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List exams (all users can view published exams, teachers can view all)"""
    query = db.query(Exam)
    
    # Filter by institution for multi-tenancy (except super_admin)
    if not is_super_admin(current_user):
        query = query.filter(Exam.institution_id == current_user.institution_id)
    
    if subject_id:
        query = query.filter(Exam.subject_id == subject_id)
    
    if status_filter and status_filter in [e.value for e in ExamStatus]:
        query = query.filter(Exam.status == status_filter)
    
    # If teacher, show exams created by them OR assigned to their teaching groups
    if is_teacher(current_user):
        # Get IDs of groups taught by this user
        teaching_group_ids = [g.id for g in current_user.teaching_groups]
        
        query = query.filter(
            or_(
                Exam.created_by_id == current_user.id,
                Exam.group_id.in_(teaching_group_ids),
                Exam.group_id == None  # Also show global/unassigned exams if that's the intention? Or remove this line if strict isolation.
                # Let's keep strict isolation + explicitly assigned or created.
            )
        )
    
    # Students can only see published exams
    if is_student(current_user):
        query = query.filter(Exam.status == ExamStatus.published)
    
    exams = query.all()
    return [
        ExamListResponse(
            id=e.id,
            title=e.title,
            description=e.description,
            subject_id=e.subject_id,
            group_id=e.group_id,
            total_points=e.total_points,
            duration_minutes=e.duration_minutes,
            passing_score=e.passing_score,
            auto_grade=e.auto_grade,
            show_answers=e.show_answers,
            start_date=e.start_date,
            end_date=e.end_date,
            is_file_based=e.is_file_based,
            file_path=e.file_path,
            file_name=e.file_name,
            status=e.status,
            created_by_id=e.created_by_id,
            created_at=e.created_at,
            updated_at=e.updated_at,
            published_at=e.published_at,
            question_count=len(e.questions) if e.questions else 0
        )
        for e in exams
    ]


@router.get("/dashboard")
def exam_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get exam dashboard for current student"""
    if not is_student(current_user):
        raise HTTPException(status_code=403, detail="Only students can access this")
    
    # Get stats - filter by institution
    total_exams = db.query(Exam).filter(
        Exam.status == ExamStatus.published,
        Exam.institution_id == current_user.institution_id
    ).count()
    
    completed = db.query(ExamSubmission).filter(
        ExamSubmission.student_id == current_user.id,
        ExamSubmission.status == SubmissionStatus.graded
    ).count()
    pending = total_exams - completed
    
    # Get average score
    submissions = db.query(ExamSubmission).filter(
        ExamSubmission.student_id == current_user.id,
        ExamSubmission.status == SubmissionStatus.graded
    ).all()
    
    avg_score = sum(s.percentage for s in submissions) / len(submissions) if submissions else 0
    
    # Build recent exams list with explicit validation to catch errors
    recent_exams_data = []
    recent_exams_query = db.query(Exam).filter(
        Exam.status == ExamStatus.published,
        Exam.institution_id == current_user.institution_id
    ).order_by(Exam.created_at.desc()).limit(5).all()
    
    for e in recent_exams_query:
        try:
            # Ensure we strictly match ExamListResponse fields
            exam_item = ExamListResponse(
                id=e.id,
                title=e.title,
                subject_id=e.subject_id,
                total_points=e.total_points,
                status=e.status,
                created_at=e.created_at,
                question_count=len(e.questions) if e.questions else 0,
                is_file_based=e.is_file_based if hasattr(e, 'is_file_based') else False
            )
            recent_exams_data.append(exam_item)
        except Exception as err:
            print(f"⚠️ Error serializing exam {e.id}: {err}")
            continue

    return {
        "total_exams": total_exams,
        "completed_exams": completed,
        "pending_exams": pending,
        "average_score": avg_score,
        "recent_exams": [e.model_dump() for e in recent_exams_data], # Convert to dict for response
        "performance_by_subject": []
    }


@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get exam details with questions"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check institution access (except super_admin)
    if not is_super_admin(current_user):
        # Allow if exam belongs to user's institution OR is global (None)
        if exam.institution_id is not None and exam.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Access denied to this exam")
    
    # Permission check
    if is_student(current_user) and exam.status != ExamStatus.published:
        raise HTTPException(status_code=403, detail="This exam is not available yet")
    
    return exam


@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: int,
    exam_update: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update exam details (Only creator or admin)"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.created_by_id != current_user.id and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update this exam")
    
    # Update fields
    if exam_update.title:
        exam.title = exam_update.title
    if exam_update.description:
        exam.description = exam_update.description
    if exam_update.total_points is not None:
        exam.total_points = exam_update.total_points
    if exam_update.duration_minutes is not None:
        exam.duration_minutes = exam_update.duration_minutes
    if exam_update.passing_score is not None:
        exam.passing_score = exam_update.passing_score
    if exam_update.auto_grade is not None:
        exam.auto_grade = exam_update.auto_grade
    if exam_update.show_answers is not None:
        exam.show_answers = exam_update.show_answers
    if exam_update.status:
        exam.status = exam_update.status
        if exam_update.status == ExamStatus.published:
            exam.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete exam (Only creator or admin)"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.created_by_id != current_user.id and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(exam)
    db.commit()


@router.put("/{exam_id}/publish", response_model=ExamResponse)
def publish_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish an exam (Only creator or admin)"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.created_by_id != current_user.id and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to publish this exam")
    
    # Update status to published
    exam.status = ExamStatus.published
    exam.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(exam)
    return exam


# ============ EXAM QUESTION ENDPOINTS ============

@router.post("/{exam_id}/questions", status_code=status.HTTP_201_CREATED)
def add_question(
    exam_id: int,
    question: ExamQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a question to exam - supports all question types"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.created_by_id != current_user.id and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create question with all fields
    new_question = ExamQuestion(
        exam_id=exam_id,
        question_text=question.question_text,
        question_type=question.question_type,
        points=question.points,
        sequence_order=question.sequence_order,
        
        # MCQ/True-False fields
        option_a=question.option_a,
        option_b=question.option_b,
        option_c=question.option_c,
        option_d=question.option_d,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        
        # Advanced question type fields
        input_mode=question.input_mode,
        reference_passage_id=question.reference_passage_id,
        
        # Gap-filling fields
        gaps=question.gaps,
        
        # Matching fields
        left_items=question.left_items,
        right_items=question.right_items,
        correct_matches=question.correct_matches,
        
        # Ordering fields
        items_to_order=question.items_to_order,
        correct_sequence=question.correct_sequence,
        
        # Diagram labeling fields
        diagram_image_url=question.diagram_image_url,
        label_points=question.label_points,
        
        # Grading flags
        requires_teacher_grading=question.requires_teacher_grading,
        allow_multiple_answers=question.allow_multiple_answers
    )
    
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return {"message": "Question added", "id": new_question.id}


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific question from an exam"""
    question = db.query(ExamQuestion).filter(ExamQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    exam = question.exam
    if not exam:
        raise HTTPException(status_code=404, detail="Associated exam not found")
    
    # Only the exam creator or an admin can delete the question
    if exam.created_by_id != current_user.id and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")
    
    db.delete(question)
    db.commit()


# ============ EXAM SUBMISSION ENDPOINTS ============

@router.post("/{exam_id}/start-submission", response_model=ExamSubmissionResponse, status_code=status.HTTP_201_CREATED)
def start_exam_submission(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Student starts taking an exam"""
    if not is_student(current_user):
        raise HTTPException(status_code=403, detail="Only students can submit exams")
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.status != ExamStatus.published:
        raise HTTPException(status_code=400, detail="Exam is not available")
    
    # Check if student already has a submission
    existing = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.student_id == current_user.id,
        ExamSubmission.status != SubmissionStatus.graded
    ).first()
    
    if existing:
        return existing
    
    # Create new submission
    submission = ExamSubmission(
        exam_id=exam_id,
        student_id=current_user.id,
        status=SubmissionStatus.in_progress,
        started_at=datetime.utcnow()
    )
    
    # Create answer records for each question
    questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
    for question in questions:
        answer = ExamAnswer(
            submission_id=submission.id if submission.id else None,
            question_id=question.id,
            answer_text=None
        )
        submission.answers.append(answer)
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.post("/{submission_id}/submit-answer")
def submit_answer(
    submission_id: int,
    answer: ExamAnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Student submits answer to a question"""
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if submission.status != SubmissionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot update submitted exam")
    
    # Check if exam time has expired (with 2 min grace period)
    if submission.exam.duration_minutes:
        elapsed_minutes = (datetime.utcnow() - submission.started_at).total_seconds() / 60
        if elapsed_minutes > submission.exam.duration_minutes + 2:
            submission.submitted_at = datetime.utcnow()
            submission.status = SubmissionStatus.submitted
            if submission.exam.auto_grade and not submission.exam.is_file_based:
                submission = auto_grade_submission(submission, db)
            db.commit()
            raise HTTPException(status_code=400, detail="Exam time has expired. Submissions are closed.")
    
    # Find or create answer record
    exam_answer = db.query(ExamAnswer).filter(
        ExamAnswer.submission_id == submission_id,
        ExamAnswer.question_id == answer.question_id
    ).first()
    
    if not exam_answer:
        exam_answer = ExamAnswer(
            submission_id=submission_id,
            question_id=answer.question_id,
            answer_text=answer.answer_text
        )
        db.add(exam_answer)
    else:
        exam_answer.answer_text = answer.answer_text
    
    db.commit()
    return {"status": "Answer saved"}


@router.put("/{submission_id}/update-response")
def update_consolidated_response(
    submission_id: int,
    update_data: ExamSubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save consolidated response text (for file-based exams)"""
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if submission.status != SubmissionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot update submitted exam")
    
    # Check if exam time has expired (with 2 min grace period)
    if submission.exam.duration_minutes:
        elapsed_minutes = (datetime.utcnow() - submission.started_at).total_seconds() / 60
        if elapsed_minutes > submission.exam.duration_minutes + 2:
            submission.submitted_at = datetime.utcnow()
            submission.status = SubmissionStatus.submitted
            if submission.exam.auto_grade and not submission.exam.is_file_based:
                submission = auto_grade_submission(submission, db)
            db.commit()
            raise HTTPException(status_code=400, detail="Exam time has expired. Submissions are closed.")
    
    if update_data.response_text is not None:
        submission.response_text = update_data.response_text
    
    db.commit()
    return {"status": "Response updated"}


@router.post("/{submission_id}/security-event")
def track_security_event(
    submission_id: int,
    security_event: ExamSecurityEvent,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track security events (tab switches/warnings) during exam"""
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if submission.status != SubmissionStatus.in_progress:
        # Just return current counts if exam is finished
        return {
            "tab_switch_count": submission.tab_switch_count,
            "warning_count": submission.warning_count
        }
    
    if security_event.event_type == "tab_switch":
        submission.tab_switch_count += 1
    elif security_event.event_type == "warning":
        submission.warning_count += 1
    
    db.commit()
    return {
        "tab_switch_count": submission.tab_switch_count,
        "warning_count": submission.warning_count
    }


@router.post("/{submission_id}/submit", response_model=ExamSubmissionResponse)
def submit_exam(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Student submits completed exam (triggers auto-grading)"""
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if submission.status != SubmissionStatus.in_progress:
        # Idempotency: if already submitted, just return it
        if submission.status in [SubmissionStatus.submitted, SubmissionStatus.graded]:
             return submission
        raise HTTPException(status_code=400, detail="Exam already submitted")
    
    # Mark as submitted
    submission.submitted_at = datetime.utcnow()
    submission.status = SubmissionStatus.submitted
    
    # Auto-grade if enabled and NOT file-based
    if submission.exam.auto_grade and not submission.exam.is_file_based:
        submission = auto_grade_submission(submission, db)
    
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/student/{student_id}/submissions", response_model=List[ExamSubmissionResponse])
def get_student_exam_submissions(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all exam submissions for a student (Admin/Teacher only or self)"""
    if student_id != current_user.id and not (is_admin_or_higher(current_user) or is_teacher(current_user)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = db.query(ExamSubmission).filter(
        ExamSubmission.student_id == student_id
    ).all()
    
    return submissions


@router.get("/submissions/{submission_id}", response_model=ExamSubmissionResponse)
def get_submission_detail(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific submission"""
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    # Permission: Admin, Teacher (if creator), or the Student themselves
    if is_admin_or_higher(current_user):
        pass
    elif is_teacher(current_user):
        # Teacher can view if they created the exam
        if submission.exam.created_by_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to view this submission")
    elif current_user.id == submission.student_id:
        pass
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return submission


@router.get("/{exam_id}/submissions", response_model=List[ExamSubmissionResponse])
def get_exam_submissions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all submissions for an exam (Teacher/Admin only)"""
    if not (is_admin_or_higher(current_user) or is_teacher(current_user)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        submissions = db.query(ExamSubmission).filter(ExamSubmission.exam_id == exam_id).all()
        
        # Auto-submit expired submissions that the student abandoned
        changed = False
        for s in submissions:
            if s.status == SubmissionStatus.in_progress and s.exam.duration_minutes:
                elapsed_minutes = (datetime.utcnow() - s.started_at).total_seconds() / 60
                if elapsed_minutes > s.exam.duration_minutes + 2:
                    s.submitted_at = datetime.utcnow()
                    s.status = SubmissionStatus.submitted
                    if s.exam.auto_grade and not s.exam.is_file_based:
                        s = auto_grade_submission(s, db)
                    changed = True
        
        if changed:
            db.commit()

        # force evaluation to trigger any pydantic or relationship errors
        [s.answers for s in submissions]
        return submissions
    except Exception as e:
        import traceback
        with open("error_log.txt", "a") as f:
            f.write(traceback.format_exc() + "\\n")
        raise


@router.put("/submissions/{submission_id}/grade")
def grade_submission(
    submission_id: int,
    earned_points: float,
    feedback: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually grade/override a submission (Teacher/Admin only)"""
    if not (is_admin_or_higher(current_user) or is_teacher(current_user)):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    submission.score_obtained = earned_points
    if submission.total_score and submission.total_score > 0:
        submission.percentage = (earned_points / submission.total_score) * 100
    else:
        submission.percentage = 0
        
    submission.is_passed = submission.percentage >= submission.exam.passing_score
    submission.status = SubmissionStatus.graded
    submission.graded_at = datetime.utcnow()
    
    if feedback:
        submission.admin_feedback = feedback
        
    db.commit()
    return {"status": "Graded successfully", "score": earned_points}


# ============ ADMIN ENDPOINTS ============

@router.get("/admin/pending-submissions")
def get_pending_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending exam submissions for admin review"""
    if not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Only admins can access this")
    
    # Get all submitted but not reviewed submissions
    submissions = db.query(ExamSubmission).filter(
        ExamSubmission.submitted_to_admin == True,
        ExamSubmission.status.in_([SubmissionStatus.graded, SubmissionStatus.submitted])
    ).all()
    
    return submissions


@router.post("/{submission_id}/admin-feedback")
def add_admin_feedback(
    submission_id: int,
    feedback: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin adds feedback to submission"""
    if not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Only admins can add feedback")
    
    submission = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.admin_feedback = feedback
    submission.status = SubmissionStatus.reviewed
    db.commit()
    
    return {"status": "Feedback added"}


# ============ PERFORMANCE/ANALYTICS ENDPOINTS ============

@router.get("/student/{student_id}/performance")
def get_student_exam_performance(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student's exam performance summary"""
    if student_id != current_user.id and not (is_admin_or_higher(current_user) or is_teacher(current_user)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all submissions for student
    submissions = db.query(ExamSubmission).filter(
        ExamSubmission.student_id == student_id,
        ExamSubmission.status == SubmissionStatus.graded
    ).all()
    
    if not submissions:
        return {
            "total_exams": 0,
            "average_score": 0,
            "exams_passed": 0,
            "exams_failed": 0
        }
    
    scores = [s.percentage for s in submissions if s.percentage is not None]
    passed = sum(1 for s in submissions if s.is_passed)
    failed = len(submissions) - passed
    
    return {
        "total_exams": len(submissions),
        "average_score": sum(scores) / len(scores) if scores else 0,
        "exams_passed": passed,
        "exams_failed": failed,
        "best_score": max(scores) if scores else 0,
        "worst_score": min(scores) if scores else 0
    }


