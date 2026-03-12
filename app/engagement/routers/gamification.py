from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.engagement.models.achievement import Achievement, UserAchievement
from sqlalchemy import func

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
)

# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------
_ADMIN_ROLES = {"admin", "super_admin", "platform_owner"}


def _require_admin_for_sensitive_endpoints(current_user: User) -> None:
    """
    Restrict award-xp and seed-achievements to admin roles.

    In **development** the check is also enforced, but can be bypassed by
    setting the env-var ``DISABLE_GAMIFICATION_GUARDS=true``.
    """
    if os.getenv("DISABLE_GAMIFICATION_GUARDS", "").lower() in ("true", "1", "yes"):
        return  # bypass for local dev convenience only
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "award-xp and seed-achievements are restricted to admin roles. "
                "XP should be awarded internally by the system."
            ),
        )

@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's gamification statistics:
    - XP
    - Level
    - Streak
    - Achievements count
    - Next level progress (mock calculation for now)
    """
    # Calculate level progress (mock logic: 1000 XP per level)
    xp_per_level = 1000
    current_level_xp = current_user.xp % xp_per_level
    xp_per_level - current_level_xp
    progress_percent = int((current_level_xp / xp_per_level) * 100)
    
    # Get earned achievements count
    achievements_count = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).count()

    # Get total achievements count
    total_achievements = db.query(Achievement).count()

    # Calculate rank based on XP within the user's institution
    # Rank is the number of students with strictly more XP + 1
    higher_xp_count = db.query(func.count(User.id)).filter(
        User.role == "student",
        User.institution_id == current_user.institution_id,
        User.xp > current_user.xp
    ).scalar() or 0
    rank = higher_xp_count + 1

    return {
        "xp": current_user.xp,
        "level": current_user.level,
        "streak_days": current_user.streak_days,
        "achievements_earned": achievements_count,
        "total_achievements": total_achievements,
        "level_progress": progress_percent,
        "current_level_xp": current_level_xp,
        "next_level_xp": xp_per_level,
        "rank": rank
    }

@router.get("/achievements")
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all achievements, marking which ones the user has earned.
    """
    all_achievements = db.query(Achievement).all()
    user_achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).all()
    
    earned_ids = {ua.achievement_id for ua in user_achievements}
    
    result = []
    for achievement in all_achievements:
        result.append({
            "id": achievement.id,
            "name": achievement.name,
            "description": achievement.description,
            "icon": achievement.icon,
            "xp_reward": achievement.xp_reward,
            "requirement_type": achievement.requirement_type,
            "requirement_value": achievement.requirement_value,
            "earned": achievement.id in earned_ids,
            # Mock progress for now (frontend can calculate/animate)
            "progress": achievement.requirement_value if achievement.id in earned_ids else 0
        })
        
    return result

@router.post("/award-xp")
async def award_xp(
    amount: int,
    activity_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Award XP to a user.

    **Security**: Restricted to admin / super_admin / platform_owner roles.
    In production, XP should only be awarded internally (e.g. after completing
    an exam or lesson) – never called directly from the client to prevent
    cheating. Set DISABLE_GAMIFICATION_GUARDS=true in .env for local dev only.
    """
    _require_admin_for_sensitive_endpoints(current_user)

    current_user.xp += amount
    current_user.last_activity_date = datetime.utcnow()

    # Level up logic: 1 level per 1000 XP
    new_level = (current_user.xp // 1000) + 1
    if new_level > current_user.level:
        current_user.level = new_level

    db.commit()

    return {
        "message": f"Awarded {amount} XP for '{activity_type}'",
        "new_total": current_user.xp,
        "level": current_user.level,
    }

@router.post("/seed-achievements")
async def seed_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Seed default achievements if the achievements table is empty.

    **Security**: Restricted to admin / super_admin / platform_owner roles.
    Set DISABLE_GAMIFICATION_GUARDS=true for convenience in local dev.
    """
    _require_admin_for_sensitive_endpoints(current_user)
    count = db.query(Achievement).count()
    if count > 0:
        return {"message": "Achievements already seeded"}
        
    defaults = [
        {
            "name": "First Steps",
            "description": "Complete your first lesson",
            "icon": "RocketOutlined",
            "xp_reward": 100,
            "requirement_type": "lessons",
            "requirement_value": 1
        },
        {
            "name": "Week Warrior",
            "description": "Maintain a 7-day streak",
            "icon": "FireOutlined",
            "xp_reward": 500,
            "requirement_type": "streak",
            "requirement_value": 7
        },
        {
            "name": "Knowledge Seeker",
            "description": "Earn 1000 XP",
            "icon": "StarOutlined",
            "xp_reward": 200,
            "requirement_type": "xp",
            "requirement_value": 1000
        },
        {
            "name": "Rising Star",
            "description": "Reach Level 5",
            "icon": "TrophyOutlined",
            "xp_reward": 1000,
            "requirement_type": "level",
            "requirement_value": 5
        }
    ]
    
    for data in defaults:
        ach = Achievement(**data)
        db.add(ach)
    
    db.commit()
    return {"message": f"Seeded {len(defaults)} achievements"}

@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the top students ranked by XP within the user's institution.
    """
    top_students = db.query(User).filter(
        User.role == "student",
        User.institution_id == current_user.institution_id
    ).order_by(User.xp.desc()).limit(limit).all()

    leaderboard = []
    for index, student in enumerate(top_students):
        leaderboard.append({
            "id": student.id,
            "rank": index + 1,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "xp": student.xp,
            "level": student.level,
            "avatar": None # Extend with actual avatar URL if available
        })

    return {"leaderboard": leaderboard}
