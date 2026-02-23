from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.achievement import Achievement, UserAchievement
from sqlalchemy import func

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
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
    xp_to_next = xp_per_level - current_level_xp
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
    Award XP to the user. 
    NOTE: In production, this should be called internally by other services, 
    not exposed directly to frontend for security reasons involving cheating.
    For MVP/Demo, it's exposed.
    """
    current_user.xp += amount
    current_user.last_activity_date = datetime.utcnow()
    
    # Simple level up logic
    new_level = (current_user.xp // 1000) + 1
    if new_level > current_user.level:
        current_user.level = new_level
        # Logic to notify user of level up could go here
        
    db.commit()
    
    return {
        "message": f"Awarded {amount} XP",
        "new_total": current_user.xp,
        "level": current_user.level
    }

@router.post("/seed-achievements")
async def seed_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Helper to seed default achievements if table is empty.
    Only accessible by super_admin ideally, but open for dev.
    """
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
