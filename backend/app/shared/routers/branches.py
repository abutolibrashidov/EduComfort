from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import List
import traceback

from app.core.models.branch import Branch
from app.core.models.user import User
from app.core.schemas.branch import BranchCreate, BranchRead
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.security.permissions import is_platform_owner, is_admin_or_higher

router = APIRouter(prefix="/branches", tags=["Branches"])


# ==================== Schemas ====================
class AssignUsersToBranchRequest(BaseModel):
    user_ids: List[int]


# ==================== Helper ====================

def _get_role_str(user: User) -> str:
    """Safely extract role string whether it's an Enum or a plain string."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _require_branch_admin(current_user: User) -> None:
    """Only institution admins/owners (or the platform owner) manage branches."""
    if is_platform_owner(current_user):
        return
    if not is_admin_or_higher(current_user) or not current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")


# ==================== Endpoints ====================

# ✅ FIX: Changed @router.post("/") → @router.post("") to work with redirect_slashes=False
@router.post("", response_model=BranchRead, status_code=201)
def create_branch(
    branch: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new branch"""
    _require_branch_admin(current_user)
    try:
        branch_data = branch.dict()

        if not is_platform_owner(current_user):
            branch_data["institution_id"] = current_user.institution_id

        existing_branch = db.query(Branch).filter(
            Branch.name == branch.name,
            Branch.institution_id == branch_data.get("institution_id"),
        ).first()
        if existing_branch:
            raise HTTPException(
                status_code=400,
                detail=f"Branch with name '{branch.name}' already exists"
            )

        db_branch = Branch(**branch_data)
        db.add(db_branch)
        db.commit()
        db.refresh(db_branch)
        return db_branch

    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Branch with name '{branch.name}' already exists")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating branch: {str(e)}")


# ✅ FIX: Changed @router.get("/") → @router.get("") to work with redirect_slashes=False
@router.get("")
@router.get("/", include_in_schema=False)
def read_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all branches with their users"""
    try:
        branch_query = db.query(Branch).options(joinedload(Branch.users))

        if not current_user.is_platform_admin:
            if current_user.institution_id:
                branch_query = branch_query.filter(Branch.institution_id == current_user.institution_id)
            else:
                return []

        branches = branch_query.all()

        result = []
        for branch in branches:
            users_list = list(branch.users) if branch.users else []

            # ✅ FIX: Use helper to safely compare role (handles Enum vs string)
            student_count = len([u for u in users_list if _get_role_str(u) == "student"])
            teacher_count = len([u for u in users_list if _get_role_str(u) == "teacher"])

            branch_data = {
                "id": branch.id,
                "name": branch.name,
                "address": branch.address,
                "phone_number": getattr(branch, "phone_number", None),
                "description": getattr(branch, "description", None),
                "is_active": branch.is_active,
                "student_count": student_count,
                "teacher_count": teacher_count,
                "users": [
                    {
                        "id": u.id,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                        "phone_number": u.phone_number,
                        "email": u.email,
                        "role": _get_role_str(u),
                        "is_active": u.is_active,
                    }
                    for u in users_list
                ],
            }
            result.append(branch_data)

        return result

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching branches: {str(e)}")


@router.post("/{branch_id}/assign-users")
def assign_users_to_branch(
    branch_id: int,
    request: AssignUsersToBranchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign multiple users to a branch"""
    _require_branch_admin(current_user)
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch or (
        not is_platform_owner(current_user) and branch.institution_id != current_user.institution_id
    ):
        raise HTTPException(status_code=404, detail="Branch not found")

    updated_count = 0
    for user_id in request.user_ids:
        # Only users of the branch's own institution can be assigned to it
        user = db.query(User).filter(
            User.id == user_id, User.institution_id == branch.institution_id
        ).first()
        if user:
            user.branch_id = branch_id
            updated_count += 1

    db.commit()
    return {
        "message": f"Successfully assigned {updated_count} users to branch",
        "branch_id": branch_id,
        "branch_name": branch.name,
        "users_assigned": updated_count,
    }


@router.get("/{branch_id}")
def read_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific branch by ID with its users"""
    try:
        query = db.query(Branch).options(joinedload(Branch.users)).filter(Branch.id == branch_id)

        if not is_platform_owner(current_user):
            if not current_user.institution_id:
                raise HTTPException(status_code=404, detail="Branch not found")
            query = query.filter(Branch.institution_id == current_user.institution_id)

        db_branch = query.first()
        if not db_branch:
            raise HTTPException(status_code=404, detail="Branch not found")

        users_list = list(db_branch.users) if db_branch.users else []
        student_count = len([u for u in users_list if _get_role_str(u) == "student"])
        teacher_count = len([u for u in users_list if _get_role_str(u) == "teacher"])

        return {
            "id": db_branch.id,
            "name": db_branch.name,
            "address": db_branch.address,
            "phone_number": getattr(db_branch, "phone_number", None),
            "description": getattr(db_branch, "description", None),
            "is_active": db_branch.is_active,
            "student_count": student_count,
            "teacher_count": teacher_count,
            "users": [
                {
                    "id": u.id,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "phone_number": u.phone_number,
                    "email": u.email,
                    "role": _get_role_str(u),
                    "is_active": u.is_active,
                }
                for u in users_list
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching branch: {str(e)}")


@router.put("/{branch_id}", response_model=BranchRead)
def update_branch(
    branch_id: int,
    branch: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing branch"""
    _require_branch_admin(current_user)
    try:
        query = db.query(Branch).filter(Branch.id == branch_id)

        if not current_user.is_platform_admin:
            if current_user.institution_id:
                query = query.filter(Branch.institution_id == current_user.institution_id)
            else:
                raise HTTPException(status_code=403, detail="Access denied")

        db_branch = query.first()
        if not db_branch:
            raise HTTPException(status_code=404, detail="Branch not found")

        if branch.name != db_branch.name:
            existing = db.query(Branch).filter(
                Branch.name == branch.name,
                Branch.id != branch_id,
                Branch.institution_id == db_branch.institution_id,
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Branch '{branch.name}' already exists")

        for key, value in branch.dict().items():
            setattr(db_branch, key, value)

        db.commit()
        db.refresh(db_branch)
        return db_branch

    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Branch '{branch.name}' already exists")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating branch: {str(e)}")


@router.delete("/{branch_id}")
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a branch"""
    _require_branch_admin(current_user)
    try:
        query = db.query(Branch).filter(Branch.id == branch_id)

        if not current_user.is_platform_admin:
            if current_user.institution_id:
                query = query.filter(Branch.institution_id == current_user.institution_id)
            else:
                raise HTTPException(status_code=403, detail="Access denied")

        db_branch = query.first()
        if not db_branch:
            raise HTTPException(status_code=404, detail="Branch not found")

        db.delete(db_branch)
        db.commit()
        return {"message": "Branch deleted successfully", "id": branch_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting branch: {str(e)}")