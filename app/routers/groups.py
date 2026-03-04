from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.security.permissions import is_platform_owner, is_admin_or_higher
from app.models.group import Group
from app.schemas.group import GroupCreate, GroupUpdate, GroupRead
from pydantic import BaseModel

router = APIRouter(prefix="/admin/groups", tags=["Groups"])


# ==================== Helper ====================

def _get_role_str(user: User) -> str:
    """Safely extract role string whether it's an Enum or a plain string."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)


# ==================== Endpoints ====================

# ✅ FIX: Route order matters — /stats/summary MUST be before /{group_id}
#    otherwise FastAPI matches "stats" as a group_id integer and raises 422.
@router.get("/stats/summary")
def get_group_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get group statistics scoped to the caller's institution.
    Platform owners see global counts.
    """
    from sqlalchemy import func

    is_privileged = is_platform_owner(current_user)

    def _base_filter(q):
        if not is_privileged and current_user.institution_id:
            return q.filter(Group.institution_id == current_user.institution_id)
        return q

    total = _base_filter(db.query(func.count(Group.id))).scalar() or 0
    active = _base_filter(
        db.query(func.count(Group.id)).filter(Group.status == "active")
    ).scalar() or 0
    upcoming = _base_filter(
        db.query(func.count(Group.id)).filter(Group.status == "upcoming")
    ).scalar() or 0

    return {
        "total": total,
        "active": active,
        "upcoming": upcoming,
        "completed": max(0, total - active - upcoming),
    }


# ✅ FIX: @router.get("") — no trailing slash, matches /admin/groups with redirect_slashes=False
@router.get("", response_model=List[GroupRead])
@router.get("/", response_model=List[GroupRead], include_in_schema=False)
def get_groups(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    subject_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all groups with optional filters"""
    # ✅ FIX: role_str was referenced before definition — moved to top of function
    role_str = _get_role_str(current_user)

    query = db.query(Group).filter(Group.is_active)

    is_privileged = is_platform_owner(current_user)

    if not is_privileged:
        if current_user.institution_id:
            query = query.filter(Group.institution_id == current_user.institution_id)
        else:
            if role_str == "student":
                query = query.filter(Group.students.any(id=current_user.id))
            else:
                # Non-privileged user with no institution sees nothing
                return []

    if subject_id:
        query = query.filter(Group.subject_id == subject_id)
    if teacher_id:
        query = query.filter(Group.teacher_id == teacher_id)
    if branch_id:
        query = query.filter(Group.branch_id == branch_id)
    if status:
        query = query.filter(Group.status == status)
    if search:
        query = query.filter(Group.name.ilike(f"%{search}%"))

    return query.offset(skip).limit(limit).all()


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_group(
    group_data: GroupCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new group"""
    role_str = _get_role_str(current_user)

    allowed = (
        current_user.is_platform_admin
        or current_user.is_super_admin
        or role_str in ["admin", "super_admin", "platform_owner", "teacher"]
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not authorized to create groups")

    target_institution_id = current_user.institution_id

    # Verify subject
    from app.models.subject import Subject
    if not db.query(Subject).filter(Subject.id == group_data.subject_id).first():
        raise HTTPException(status_code=404, detail="Subject not found")

    # Verify teacher belongs to the same institution
    teacher_query = db.query(User).filter(User.id == group_data.teacher_id)
    if not is_platform_owner(current_user) and target_institution_id:
        teacher_query = teacher_query.filter(User.institution_id == target_institution_id)
    if not teacher_query.first():
        raise HTTPException(status_code=404, detail="Teacher not found or belongs to a different institution")

    # Verify branch belongs to the same institution
    from app.models.branch import Branch
    branch_query = db.query(Branch).filter(Branch.id == group_data.branch_id)
    if not is_platform_owner(current_user) and target_institution_id:
        branch_query = branch_query.filter(Branch.institution_id == target_institution_id)
    if not branch_query.first():
        raise HTTPException(status_code=404, detail="Branch not found or belongs to a different institution")

    # ✅ FIX: Pydantic v2 compat — model_dump() replaces dict()
    group_dict = (
        group_data.model_dump()
        if hasattr(group_data, "model_dump")
        else group_data.dict()
    )
    # Filter to only columns that exist on the Group model to prevent unexpected kwarg errors
    model_cols = {c.key for c in Group.__table__.columns}
    safe_dict = {k: v for k, v in group_dict.items() if k in model_cols}

    new_group = Group(**safe_dict)
    new_group.institution_id = target_institution_id
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group


@router.get("/{group_id}", response_model=GroupRead)
def get_group(
    group_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single group by ID"""
    query = db.query(Group).filter(Group.id == group_id)

    if not is_platform_owner(current_user) and current_user.institution_id:
        query = query.filter(Group.institution_id == current_user.institution_id)

    group = query.first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    return group


@router.put("/{group_id}", response_model=GroupRead)
def update_group(
    group_id: int,
    group_data: GroupUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update group information"""
    _get_role_str(current_user)

    # Only platform owners are truly unscoped; super_admin/admin are scoped to their institution
    is_platform_owner_user = is_platform_owner(current_user)

    query = db.query(Group).filter(Group.id == group_id)
    if not is_platform_owner_user:
        if current_user.institution_id:
            query = query.filter(Group.institution_id == current_user.institution_id)
        else:
            raise HTTPException(status_code=403, detail="Access denied")

    group = query.first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # ✅ FIX: Pydantic v2 compat
    update_dict = (
        group_data.model_dump(exclude_unset=True)
        if hasattr(group_data, "model_dump")
        else group_data.dict(exclude_unset=True)
    )

    # If teacher_id is being updated, verify the new teacher belongs to the same institution
    if "teacher_id" in update_dict and not is_platform_owner_user and current_user.institution_id:
        teacher_check = db.query(User).filter(
            User.id == update_dict["teacher_id"],
            User.institution_id == current_user.institution_id,
        ).first()
        if not teacher_check:
            raise HTTPException(status_code=403, detail="Teacher not found or belongs to a different institution")

    for key, value in update_dict.items():
        setattr(group, key, value)

    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a group (soft delete — set is_active=False)"""
    role_str = _get_role_str(current_user)
    is_privileged = (
        current_user.is_platform_admin
        or current_user.is_super_admin
        or role_str in ["super_admin", "platform_owner"]
    )

    query = db.query(Group).filter(Group.id == group_id)
    if not is_privileged:
        if current_user.institution_id:
            query = query.filter(Group.institution_id == current_user.institution_id)
        else:
            raise HTTPException(status_code=403, detail="Access denied")

    group = query.first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    group.is_active = False
    db.commit()
    return {"message": "Group deleted successfully"}


# ============================================================
# STUDENT MANAGEMENT
# ============================================================

class AddStudentRequest(BaseModel):
    student_id: int


@router.post("/{group_id}/students", status_code=status.HTTP_201_CREATED)
def add_student_to_group(
    group_id: int,
    data: AddStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a student to a group"""
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not is_platform_owner(current_user) and current_user.institution_id:
        if group.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Group belongs to a different institution")

    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not is_platform_owner(current_user) and student.institution_id != group.institution_id:
        raise HTTPException(status_code=403, detail="Student belongs to a different institution")

    if student in group.students:
        raise HTTPException(status_code=400, detail="Student already in this group")

    if len(group.students) >= group.max_students:
        raise HTTPException(status_code=400, detail="Group is full")

    group.students.append(student)
    group.current_students = len(group.students)
    db.commit()
    return {"message": "Student added successfully"}


@router.delete("/{group_id}/students/{student_id}")
def remove_student_from_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a student from a group"""
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not is_platform_owner(current_user) and current_user.institution_id:
        if group.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Group belongs to a different institution")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student not in group.students:
        raise HTTPException(status_code=400, detail="Student is not in this group")

    group.students.remove(student)
    group.current_students = len(group.students)
    db.commit()
    return {"message": "Student removed successfully"}


@router.get("/{group_id}/students")
def get_group_students(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all students in a group"""
    role_str = _get_role_str(current_user)
    is_privileged = (
        current_user.is_platform_admin
        or current_user.is_super_admin
        or role_str in ["super_admin", "platform_owner"]
    )

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if not is_privileged:
        if current_user.institution_id and group.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if role_str == "student" and current_user not in group.students:
            raise HTTPException(status_code=403, detail="Access denied")

    return group.students