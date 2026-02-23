from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.institution import Institution
from app.models.subscription import InstitutionSubscription, SubscriptionPlan, SubscriptionStatus

router = APIRouter(prefix="/billing", tags=["Billing"])

from app.constants.roles import Role

def verify_platform_owner(current_user: User = Depends(get_current_user)):
    """
    Verify user is the Platform Owner or Super Admin (God Mode)
    Both SUPER_ADMIN and PLATFORM_OWNER have full platform access
    """
    user_role = current_user.role
    if hasattr(user_role, "value"):
        user_role = user_role.value
    
    # Allow both SUPER_ADMIN and PLATFORM_OWNER
    allowed_roles = [
        Role.PLATFORM_OWNER.value, 
        Role.PLATFORM_OWNER,
        Role.SUPER_ADMIN.value,
        Role.SUPER_ADMIN,
        "platform_owner",
        "super_admin"
    ]
    
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied: Platform Owner or Super Admin only"
        )
    return current_user

@router.get("/plans")
def get_plans():
    return [
        {"id": "bronze", "name": "Bronze", "price": 100, "features": ["Management System"]},
        {"id": "silver", "name": "Silver", "price": 200, "features": ["Management", "Gamification"]},
        {"id": "gold", "name": "Gold", "price": 300, "features": ["All Features", "Marketplace", "Priority Support"]}
    ]

@router.get("/subscriptions")
def get_all_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    subscriptions = db.query(InstitutionSubscription).all()
    # Join with Institution to get names
    result = []
    for sub in subscriptions:
        inst = db.query(Institution).get(sub.institution_id)
        if inst:
            result.append({
                "institution_id": inst.id,
                "institution_name": inst.name,
                "plan": sub.plan,
                "status": sub.status,
                "start_date": sub.start_date,
                "next_billing_date": sub.next_billing_date,
                "auto_renew": sub.auto_renew
            })
    return result

@router.post("/institutions/{institution_id}/subscribe")
def assign_subscription(
    institution_id: int,
    plan: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    try:
        plan_enum = SubscriptionPlan(plan.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan")

    sub = db.query(InstitutionSubscription).filter(InstitutionSubscription.institution_id == institution_id).first()
    
    now = datetime.utcnow()
    next_month = now + timedelta(days=30)
    
    if sub:
        sub.plan = plan_enum
        sub.status = SubscriptionStatus.ACTIVE
        sub.next_billing_date = next_month
        # Keep original start date
    else:
        sub = InstitutionSubscription(
            institution_id=institution_id,
            plan=plan_enum,
            status=SubscriptionStatus.ACTIVE,
            start_date=now,
            next_billing_date=next_month
        )
        db.add(sub)
    
    db.commit()
    return {"message": f"Assigned {plan_enum} to institution {institution_id}"}
