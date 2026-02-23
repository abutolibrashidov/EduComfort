
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import List
import traceback

from app.models.branch import Branch
from app.models.user import User
from app.schemas.branch import BranchCreate, BranchRead
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get("/test-simple")
def test_simple():
    """Simple test without database"""
    return {"message": "Branch router is working!", "status": "ok"}
# ==================== Schemas ====================
class AssignUsersToBranchRequest(BaseModel):
    user_ids: List[int]


# ==================== Endpoints ====================

@router.post("/migrate/add-columns")
def migrate_add_columns(db: Session = Depends(get_db)):
    """Temporary endpoint to add missing columns"""
    try:
        db.execute("ALTER TABLE branches ADD COLUMN phone_number VARCHAR(20)")
        db.commit()
        print("✅ Added phone_number column")
    except Exception as e:
        print(f"⚠️ phone_number column might already exist: {e}")
        db.rollback()
    
    try:
        db.execute("ALTER TABLE branches ADD COLUMN description TEXT")
        db.commit()
        print("✅ Added description column")
    except Exception as e:
        print(f"⚠️ description column might already exist: {e}")
        db.rollback()
    
    return {"message": "Migration completed", "columns_added": ["phone_number", "description"]}


@router.post("/", response_model=BranchRead)
def create_branch(
    branch: BranchCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new branch"""
    try:
        existing_branch = db.query(Branch).filter(Branch.name == branch.name).first()
        if existing_branch:
            # Check if it belongs to same institution (if applicable) or globally if names must be unique globally
            # For now, assuming names unique per institution roughly, but if schema has unique constraint on name, we must respect that.
            # If unique constraint is global, then error is correct.
            raise HTTPException(
                status_code=400,
                detail=f"Branch with name '{branch.name}' already exists"
            )
        
        branch_data = branch.dict()
        
        # Auto-assign institution_id
        if not current_user.is_platform_admin and current_user.institution_id:
            branch_data["institution_id"] = current_user.institution_id
        elif not current_user.is_platform_admin and not current_user.institution_id:
             # Regular user without institution shouldn't create branches ideally, unless independent
             pass

        db_branch = Branch(**branch_data)
        db.add(db_branch)
        db.commit()
        db.refresh(db_branch)
        return db_branch
    
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Branch with name '{branch.name}' already exists"
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating branch: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating branch: {str(e)}"
        )


@router.get("/")
def read_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all branches with their users"""
    try:
        print("🔹 Fetching branches...")
        branch_query = db.query(Branch).options(joinedload(Branch.users))
        
        # Multi-tenancy filter
        if not current_user.is_platform_admin:
            if current_user.institution_id:
                branch_query = branch_query.filter(Branch.institution_id == current_user.institution_id)
            else:
                # If no institution (individual learner?), shouldn't see branches usually?
                # Or maybe return empty list
                return []
        
        branches = branch_query.all()
        print(f"✅ Found {len(branches)} branches for user {current_user.email}")
        
        result = []
        for branch in branches:
            print(f"🔹 Processing branch: {branch.name}")
            users_list = list(branch.users) if branch.users else []
            print(f"  - Users count: {len(users_list)}")
            
            student_count = len([u for u in users_list if u.role == "student"])
            teacher_count = len([u for u in users_list if u.role == "teacher"])
            
            print(f"  - Students: {student_count}, Teachers: {teacher_count}")
            
            branch_data = {
                "id": branch.id,
                "name": branch.name,
                "address": branch.address,
                "phone_number": getattr(branch, 'phone_number', None),
                "description": getattr(branch, 'description', None),
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
                        "role": u.role,
                        "is_active": u.is_active
                    }
                    for u in users_list
                ]
            }
            result.append(branch_data)
        
        print(f"✅ Returning {len(result)} branches")
        return result
        
    except Exception as e:
        print(f"❌ Error in read_branches: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching branches: {str(e)}"
        )


@router.get("/debug/check-users")
def debug_check_users(db: Session = Depends(get_db)):
    """Debug: Check all users and their branch assignments"""
    users = db.query(User).all()
    result = []
    
    for user in users:
        result.append({
            "id": user.id,
            "name": f"{user.first_name} {user.last_name or ''}".strip(),
            "role": user.role,
            "branch_id": user.branch_id,
            "branch_name": user.branch.name if user.branch else None
        })
    
    return {"total_users": len(result), "users": result}


@router.post("/{branch_id}/assign-users")
def assign_users_to_branch(
    branch_id: int,
    request: AssignUsersToBranchRequest,
    db: Session = Depends(get_db)
):
    """Assign multiple users to a branch"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    updated_count = 0
    for user_id in request.user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.branch_id = branch_id
            updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Successfully assigned {updated_count} users to branch",
        "branch_id": branch_id,
        "branch_name": branch.name,
        "users_assigned": updated_count
    }


@router.get("/{branch_id}")
def read_branch(
    branch_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific branch by ID with its users"""
    try:
        query = db.query(Branch).options(joinedload(Branch.users)).filter(Branch.id == branch_id)
        
        if not current_user.is_platform_admin and current_user.institution_id:
             query = query.filter(Branch.institution_id == current_user.institution_id)
             
        db_branch = query.first()
        
        if not db_branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        users_list = list(db_branch.users) if db_branch.users else []
        student_count = len([u for u in users_list if u.role == "student"])
        teacher_count = len([u for u in users_list if u.role == "teacher"])
        
        return {
            "id": db_branch.id,
            "name": db_branch.name,
            "address": db_branch.address,
            "phone_number": getattr(db_branch, 'phone_number', None),
            "description": getattr(db_branch, 'description', None),
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
                    "role": u.role,
                    "is_active": u.is_active
                }
                for u in users_list
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching branch: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching branch: {str(e)}"
        )


@router.put("/{branch_id}", response_model=BranchRead)
def update_branch(
    branch_id: int, 
    branch: BranchCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing branch"""
    try:
        query = db.query(Branch).filter(Branch.id == branch_id)
        
        # Multi-tenancy filter
        if not current_user.is_platform_admin:
            if current_user.institution_id:
                query = query.filter(Branch.institution_id == current_user.institution_id)
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        db_branch = query.first()
        if not db_branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        if branch.name != db_branch.name:
            existing_branch = db.query(Branch).filter(
                Branch.name == branch.name,
                Branch.id != branch_id
            ).first()
            if existing_branch:
                raise HTTPException(
                    status_code=400,
                    detail=f"Branch with name '{branch.name}' already exists"
                )
        
        for key, value in branch.dict().items():
            setattr(db_branch, key, value)
        
        db.commit()
        db.refresh(db_branch)
        return db_branch
    
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Branch with name '{branch.name}' already exists"
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating branch: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating branch: {str(e)}"
        )


@router.delete("/{branch_id}")
def delete_branch(
    branch_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a branch"""
    try:
        query = db.query(Branch).filter(Branch.id == branch_id)
        
        # Multi-tenancy filter
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
        print(f"❌ Error deleting branch: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting branch: {str(e)}"
        )