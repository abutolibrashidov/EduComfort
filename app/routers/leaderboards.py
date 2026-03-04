from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.leaderboard import LeaderboardEvent, StudentRatingLog, LeaderboardWinner
from sqlalchemy import func, desc
from app.utils.certificate import generate_certificate

router = APIRouter(
    prefix="/leaderboards",
    tags=["Leaderboards"]
)

# Schemas
class LeaderboardCreate(BaseModel):
    group_id: int
    end_date: datetime

class RatingCreate(BaseModel):
    student_id: int
    points: int
    reason: str

@router.post("/events")
async def create_leaderboard_event(
    data: LeaderboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Teacher creates a new leaderboard event for a group."""
    if current_user.role != "teacher" and current_user.role != "admin" and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Siz bu amalni bajara olmaysiz.")
    
    # ✅ ISOLATION: Verify teacher belongs to the same institution as the group
    from app.models.group import Group
    group = db.query(Group).filter(Group.id == data.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi.")
    
    if current_user.role == "teacher":
        if group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Siz bu guruhning o'qituvchisi emassiz.")
    elif current_user.institution_id and group.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Bu guruh boshqa muassasaga tegishli.")
        
    # Close any active events for this group
    active_events = db.query(LeaderboardEvent).filter(
        LeaderboardEvent.group_id == data.group_id,
        LeaderboardEvent.is_active
    ).all()
    for event in active_events:
        event.is_active = False

    new_event = LeaderboardEvent(
        teacher_id=current_user.id,
        group_id=data.group_id,
        end_date=data.end_date
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return {"message": "Reyting taxtasi muvaffaqiyatli yaratildi", "event": new_event}

from app.models.group_students import GroupStudent

@router.get("/events/active/{group_id}")
async def get_active_event(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active event and current ranking for a group."""
    event = db.query(LeaderboardEvent).filter(
        LeaderboardEvent.group_id == group_id,
        LeaderboardEvent.is_active
    ).first()
    
    if not event:
        return {"event": None, "rankings": []}

    # ✅ ISOLATION: verify caller has access to this group's institution
    from app.models.group import Group
    group = db.query(Group).filter(Group.id == group_id).first()
    if group and current_user.institution_id and group.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Bu guruhga ruxsatingiz yo'q.")

    # Calculate current rankings including all students in the group
    rankings_query = db.query(
        User.id.label("student_id"),
        User.first_name,
        User.last_name,
        func.coalesce(func.sum(StudentRatingLog.points), 0).label("total_points")
    ).join(
        GroupStudent, GroupStudent.student_id == User.id
    ).outerjoin(
        StudentRatingLog, 
        (StudentRatingLog.student_id == User.id) & (StudentRatingLog.event_id == event.id)
    ).filter(
        GroupStudent.group_id == group_id,
        User.role == "student"
    ).group_by(
        User.id, User.first_name, User.last_name
    ).order_by(
        desc("total_points")
    ).all()

    rankings = [
        {
            "student_id": row.student_id,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "avatar": None,
            "total_points": row.total_points,
            "rank": idx + 1
        }
        for idx, row in enumerate(rankings_query)
    ]

    return {"event": event, "rankings": rankings}

@router.post("/events/{event_id}/rate")
async def rate_student(
    event_id: int,
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Teacher awards points to a student in an active event."""
    event = db.query(LeaderboardEvent).filter(LeaderboardEvent.id == event_id).first()
    if not event or not event.is_active:
        raise HTTPException(status_code=400, detail="Aktiv reyting taxtasi topilmadi.")
        
    if event.teacher_id != current_user.id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Siz bu amalni bajara olmaysiz.")

    # ✅ ISOLATION: verify student is in the same institution
    student = db.query(User).filter(User.id == data.student_id).first()
    if student and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Bu o'quvchi boshqa muassasaga tegishli.")

    log = StudentRatingLog(
        teacher_id=current_user.id,
        student_id=data.student_id,
        event_id=event_id,
        points=data.points,
        reason=data.reason
    )
    db.add(log)
    db.commit()
    
    # Also award global XP to the student if we want
    student = db.query(User).filter(User.id == data.student_id).first()
    if student:
        student.xp += data.points
        db.commit()

    return {"message": "Ball muvaffaqiyatli qo'shildi"}

@router.post("/events/{event_id}/end")
async def end_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End an event, map top 3 winners."""
    event = db.query(LeaderboardEvent).filter(LeaderboardEvent.id == event_id).first()
    if not event or not event.is_active:
        raise HTTPException(status_code=400, detail="Event allaqachon tugatilgan yoki topilmadi.")

    if event.teacher_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan.")

    event.is_active = False

    # Get rankings
    rankings_query = db.query(
        StudentRatingLog.student_id,
        func.sum(StudentRatingLog.points).label("total_points")
    ).filter(
        StudentRatingLog.event_id == event.id
    ).group_by(
        StudentRatingLog.student_id
    ).order_by(
        desc("total_points")
    ).limit(3).all()

    winners = []
    for idx, row in enumerate(rankings_query):
        # Fetch student details for the certificate
        student = db.query(User).filter(User.id == row.student_id).first()
        student_name = f"{student.first_name} {student.last_name}" if student else "O'quvchi"
        
        # Generate the certificate image 
        cert_url = generate_certificate(
            student_name=student_name,
            rank=idx + 1,
            group_name=event.group.name if event.group else "Guruh",
            total_points=row.total_points
        )
        
        winner = LeaderboardWinner(
            student_id=row.student_id,
            event_id=event.id,
            rank=idx + 1,
            total_points=row.total_points,
            certificate_url=cert_url
        )
        db.add(winner)
        winners.append(winner)

    db.commit()
    
    return {"message": "Reyting taxtasi tugatildi, g'oliblar aniqlandi.", "winners": len(winners)}

@router.get("/students/{student_id}/history")
async def get_student_history(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a student's leaderboard history and certificates."""
    if current_user.id != student_id and current_user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan.")

    wins = db.query(LeaderboardWinner).join(
        LeaderboardEvent, LeaderboardWinner.event_id == LeaderboardEvent.id
    ).filter(
        LeaderboardWinner.student_id == student_id
    ).all()

    history = []
    for win in wins:
        event = win.event
        # ✅ Fetch teacher name from the event's teacher_id
        teacher = db.query(User).filter(User.id == event.teacher_id).first() if event.teacher_id else None
        teacher_name = f"{teacher.first_name} {teacher.last_name}" if teacher else None

        history.append({
            "event_id": win.event_id,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "rank": win.rank,
            "total_points": win.total_points,
            "certificate_url": win.certificate_url,
            "prize_awarded": win.prize_awarded,
            # ✅ NEW: group and teacher info for certificate display
            "group_name": event.group.name if event.group else None,
            "teacher_name": teacher_name,
        })

    return {"history": history}

@router.post("/winners/{winner_id}/prize")
async def award_prize(
    winner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Teacher marks that a physical prize was awarded."""
    winner = db.query(LeaderboardWinner).filter(LeaderboardWinner.id == winner_id).first()
    if not winner:
        raise HTTPException(status_code=404, detail="G'olib topilmadi.")
        
    winner.prize_awarded = True
    db.commit()
    return {"message": "Sovrin berilganligi qayd etildi."}
