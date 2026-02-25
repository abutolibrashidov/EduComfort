from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.security.permissions import is_platform_owner, is_super_admin, is_admin_or_higher
from app.models.group import Group
from app.schemas.group import GroupCreate, GroupUpdate, GroupRead, GroupListItem
from app.models.group_students import GroupStudent

router = APIRouter(prefix="/admin/groups", tags=["Groups"])


from fastapi import Request

# GET all groups with filters
@router.get("", response_model=List[GroupRead])
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
    current_user: User = Depends(get_current_user)
):
    """
    Get all groups with optional filters
    """
    query = db.query(Group).filter(Group.is_active == True)

    # Multi-tenancy filter
    # Only Platform Owner can see groups from all institutions
    is_privileged = is_platform_owner(current_user)
    
    if not is_privileged:
        if current_user.institution_id:
             query = query.filter(Group.institution_id == current_user.institution_id)
        else:
             # If individual learner, show groups they are in:
             if role_str == "student":
                 query = query.filter(Group.students.any(id=current_user.id))
             else:
                 query = query.filter(Group.id == -1) # Empty result

    # Apply filters
    if subject_id:
        query = query.filter(Group.subject_id == subject_id)
    if teacher_id:
        query = query.filter(Group.teacher_id == teacher_id)
    if branch_id:
        query = query.filter(Group.branch_id == branch_id)
    if status:
        query = query.filter(Group.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.filter(Group.name.ilike(search_term))

    # Pagination
    groups = query.offset(skip).limit(limit).all()
    return groups


# GET single group by ID
@router.get("/{group_id}", response_model=GroupRead)
def get_group(group_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Get a single group by ID
    """
    query = db.query(Group).filter(Group.id == group_id)
    
    # Multi-tenancy check
    institution_id = getattr(request.state, "institution_id", None)
    is_platform_admin = getattr(request.state, "is_platform_admin", False)

    if institution_id and not is_platform_admin:
        query = query.filter(Group.institution_id == institution_id)

    group = query.first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    return group


# CREATE new group
@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new group
    """
    # Permission check
    role_str = str(current_user.role.value) if hasattr(current_user.role, "value") else str(current_user.role)
    if not (current_user.is_platform_admin or current_user.is_super_admin or role_str in ["admin", "super_admin", "platform_owner"]):
         # Allow teachers?
         if role_str != "teacher":
            raise HTTPException(status_code=403, detail="Not authorized to create groups")

    # Determine institution
    target_institution_id = current_user.institution_id
    
    # Platform/Super admin can create for any institution if specified? 
    # For now, if they have no institution, we might error or allow None (global group?).
    # Assuming groups MUST belong to institution.
    if not target_institution_id and (current_user.is_platform_admin or current_user.is_super_admin):
        # TODO: Allow passing institution_id in body? 
        # For now, allow 0 or None if supported, or error.
        # Check if model supports nullable institution_id.
        pass


    # Verify subject exists
    from app.models.subject import Subject
    subject = db.query(Subject).filter(Subject.id == group_data.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Verify teacher exists
    from app.models.user import User
    teacher = db.query(User).filter(User.id == group_data.teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    # Verify branch exists
    from app.models.branch import Branch
    branch = db.query(Branch).filter(Branch.id == group_data.branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    # Create new group
    new_group = Group(**group_data.dict())
    new_group.institution_id = target_institution_id # Force institution ID
    
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    return new_group


# UPDATE group
@router.put("/{group_id}", response_model=GroupRead)
def update_group(
    group_id: int,
    group_data: GroupUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update group information
    """
    query = db.query(Group).filter(Group.id == group_id)
    
    # Multi-tenancy check
    role_str = str(current_user.role.value) if hasattr(current_user.role, "value") else str(current_user.role)
    is_privileged = current_user.is_platform_admin or current_user.is_super_admin or role_str in ["super_admin", "platform_owner"]
    
    if not is_privileged:
        if current_user.institution_id:
            query = query.filter(Group.institution_id == current_user.institution_id)
        else:
            raise HTTPException(status_code=403, detail="Access denied")

    group = query.first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Update fields if provided
    update_data = group_data.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(group, key, value)
    
    db.commit()
    db.refresh(group)
    
    return group


# DELETE group
@router.delete("/{group_id}")
def delete_group(
    group_id: int, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a group (soft delete - set inactive)
    """
    query = db.query(Group).filter(Group.id == group_id)
    
    # Multi-tenancy check
    role_str = str(current_user.role.value) if hasattr(current_user.role, "value") else str(current_user.role)
    is_privileged = current_user.is_platform_admin or current_user.is_super_admin or role_str in ["super_admin", "platform_owner"]
    
    if not is_privileged:
        if current_user.institution_id:
            query = query.filter(Group.institution_id == current_user.institution_id)
        else:
            raise HTTPException(status_code=403, detail="Access denied")
        
    group = query.first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Soft delete
    group.is_active = False
    db.commit()
    
    return {"message": "Group deleted successfully"}


# Get group statistics
@router.get("/stats/summary")
def get_group_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get group statistics — scoped to the caller's institution.
    Platform owners see global counts.
    """
    from sqlalchemy import func
    
    base_q = db.query(func.count(Group.id))
    
    # Tenant isolation: non-platform-owners only see their institution
    if not is_platform_owner(current_user) and current_user.institution_id:
        base_q = base_q.filter(Group.institution_id == current_user.institution_id)
    
    total = base_q.scalar() or 0
    
    active_q = base_q.filter(Group.status == "active")
    if not is_platform_owner(current_user) and current_user.institution_id:
        active_q = db.query(func.count(Group.id)).filter(
            Group.status == "active",
            Group.institution_id == current_user.institution_id
        )
    else:
        active_q = db.query(func.count(Group.id)).filter(Group.status == "active")
    active = active_q.scalar() or 0
    
    if not is_platform_owner(current_user) and current_user.institution_id:
        upcoming_q = db.query(func.count(Group.id)).filter(
            Group.status == "upcoming",
            Group.institution_id == current_user.institution_id
        )
    else:
        upcoming_q = db.query(func.count(Group.id)).filter(Group.status == "upcoming")
    upcoming = upcoming_q.scalar() or 0
    
    return {
        "total": total,
        "active": active,
        "upcoming": upcoming,
        "completed": max(0, total - active - upcoming)
    }


# ============================================
# STUDENTS MANAGEMENT ENDPOINTS
# ============================================

from pydantic import BaseModel

class AddStudentRequest(BaseModel):
    student_id: int

@router.post("/{group_id}/students", status_code=status.HTTP_201_CREATED)
def add_student_to_group(
    group_id: int,
    data: AddStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a student to a group
    """
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Tenant isolation: non-platform-owners can only add students from their own institution
    if not is_platform_owner(current_user) and current_user.institution_id:
        if group.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Access denied: group belongs to a different institution")
        
    # Verify student exists
    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Tenant isolation: student must belong to same institution as the group
    if not is_platform_owner(current_user) and student.institution_id != group.institution_id:
        raise HTTPException(status_code=403, detail="Cannot add student from a different institution to this group")
    
    # Check if student is already in the group
    if student in group.students:
        raise HTTPException(status_code=400, detail="Student already in this group")
        
    # Check capacity
    if len(group.students) >= group.max_students:
        raise HTTPException(status_code=400, detail="Group is full")
        
    # Add student
    group.students.append(student)
    group.current_students = len(group.students) # Update count
    db.commit()
    
    return {"message": "Student added successfully"}


@router.delete("/{group_id}/students/{student_id}")
def remove_student_from_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a student from a group
    """
    if not is_admin_or_higher(current_user) and not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Tenant isolation: non-platform-owners can only manage groups from their own institution
    if not is_platform_owner(current_user) and current_user.institution_id:
        if group.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Access denied: group belongs to a different institution")
        
    # Verify student exists
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Check if student is in the group
    if student not in group.students:
        raise HTTPException(status_code=400, detail="Student is not in this group")
        
    # Remove student
    group.students.remove(student)
    group.current_students = len(group.students) # Update count
    db.commit()
    
    return {"message": "Student removed successfully"}


@router.get("/{group_id}/students")
def get_group_students(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all students in a group
    """
    # Permission check
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")
         
    # Check access
    role_str = str(current_user.role.value) if hasattr(current_user.role, "value") else str(current_user.role)
    is_privileged = current_user.is_platform_admin or current_user.is_super_admin or role_str in ["super_admin", "platform_owner"]
    
    if not is_privileged:
        if current_user.institution_id and group.institution_id != current_user.institution_id:
             raise HTTPException(status_code=403, detail="Access denied")
        # If student/teacher, ensure they are related to group?
        if role_str == "teacher" and group.teacher_id != current_user.id:
             # Allow teachers to see students only in their groups?
             pass 
        if role_str == "student" and current_user not in group.students:
             raise HTTPException(status_code=403, detail="Access denied")

    return group.students
