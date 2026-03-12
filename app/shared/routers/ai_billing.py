from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.institution import Institution
from app.models.interactive_book import AIProcessingLog, Book
from app.security.permissions import is_platform_owner

router = APIRouter(prefix="/ai-billing", tags=["AI Billing"])

# --- Schemas ---

class CreditBalanceResponse(BaseModel):
    institution_id: int
    institution_name: str
    balance: float
    currency: str = "USD"

class AddCreditsRequest(BaseModel):
    institution_id: int
    amount: float
    note: Optional[str] = None

class UsageRecord(BaseModel):
    id: int
    date: datetime
    book_title: str
    operation: str
    cost: float
    tokens: int
    status: str

class UsageReportResponse(BaseModel):
    records: List[UsageRecord]
    total_cost: float
    total_records: int

# --- Endpoints ---

@router.get("/balance", response_model=CreditBalanceResponse)
def get_my_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current AI credit balance for the user's institution.
    Accessible by Teachers and Admins.
    """
    if not current_user.institution_id:
        raise HTTPException(status_code=400, detail="User not associated with an institution")
    
    inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    return {
        "institution_id": inst.id,
        "institution_name": inst.name,
        "balance": inst.ai_credits_balance or 0.0
    }

@router.get("/usage", response_model=UsageReportResponse)
def get_my_usage_report(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI usage history for the user's institution.
    Accessible by Admins (and Teachers if policy allows).
    """
    # Simply allow if user has institution_id for now
    if not current_user.institution_id:
        raise HTTPException(status_code=400, detail="User not associated with an institution")

    # Query logs joined with Books to ensure institution match
    query = db.query(AIProcessingLog).join(Book).filter(
        Book.institution_id == current_user.institution_id
    ).order_by(desc(AIProcessingLog.created_at))
    
    total_records = query.count()
    logs = query.limit(limit).all()
    
    total_cost = db.query(func.sum(AIProcessingLog.cost_usd)).join(Book).filter(
        Book.institution_id == current_user.institution_id
    ).scalar() or 0.0
    
    records = []
    for log in logs:
        records.append({
            "id": log.id,
            "date": log.created_at,
            "book_title": log.book.title if log.book else "Unknown Book",
            "operation": log.operation_type,
            "cost": log.cost_usd or 0.0,
            "tokens": log.tokens_used or 0,
            "status": log.status
        })
        
    return {
        "records": records,
        "total_cost": total_cost,
        "total_records": total_records
    }

# --- Platform Owner Endpoints ---

@router.post("/admin/add-credits")
def add_credits(
    request: AddCreditsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add credits to an institution (Platform Owner only).
    """
    if not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Platform Owner permission required")
        
    inst = db.query(Institution).filter(Institution.id == request.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Initialize if null
    if inst.ai_credits_balance is None:
        inst.ai_credits_balance = 0.0

    inst.ai_credits_balance += request.amount
    db.commit()
    
    return {
        "message": f"Added ${request.amount} to {inst.name}",
        "new_balance": inst.ai_credits_balance,
        "institution_id": inst.id
    }

@router.get("/admin/usage-report")
def get_global_usage_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Global AI usage stats (Platform Owner only).
    """
    if not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Platform Owner permission required")
        
    # Aggregate by institution
    stats = db.query(
        Institution.id,
        Institution.name,
        Institution.ai_credits_balance,
        func.sum(AIProcessingLog.cost_usd).label("total_spent"),
        func.count(AIProcessingLog.id).label("total_jobs")
    ).outerjoin(Book, Book.institution_id == Institution.id)\
     .outerjoin(AIProcessingLog, AIProcessingLog.book_id == Book.id)\
     .group_by(Institution.id, Institution.name, Institution.ai_credits_balance)\
     .all()
     
    result = []
    for s in stats:
        result.append({
            "institution_id": s.id,
            "institution_name": s.name,
            "current_balance": s.ai_credits_balance,
            "total_spent": s.total_spent or 0.0,
            "total_jobs": s.total_jobs or 0
        })
        
    return result
