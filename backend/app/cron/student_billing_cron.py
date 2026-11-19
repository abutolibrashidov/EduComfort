from datetime import datetime
import logging
from app.core.database import SessionLocal
from app.core.models.user import User
from app.shared.services.sms_service import send_parent_payment_reminder, send_parent_blocked_notification

logger = logging.getLogger(__name__)

def check_student_subscriptions():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        today = now.date()
        current_day = today.day
        logger.info(f"🕒 Running Student Billing Check at {now} (Day: {current_day})")

        # The global notification days: e.g. 1st, 3rd, 5th. 
        # The global block day: 10th.
        if current_day not in [1, 3, 5, 10]:
            logger.info("Today is not a billing notification or blocking day. Skipping.")
            return

        # Fetch all active students who have a next_payment_date
        from sqlalchemy.orm import joinedload
        students = db.query(User).options(joinedload(User.institution)).filter(
            User.role == "student",
            User.next_payment_date.isnot(None),
            User.is_active == True
        ).all()

        for student in students:
            if not student.parent_phone_number and not student.parent_telegram_chat_id:
                continue

            # Skip if student has no institution
            if not student.institution:
                continue
            
            inst_name = student.institution.name

            # The deadline for the current month is the 10th of this month.
            try:
                current_month_deadline = today.replace(day=10)
            except ValueError:
                current_month_deadline = today

            due_date = student.next_payment_date.date()

            # If the student's next_payment_date is on or before the current month's 10th,
            # it means they have NOT paid for the current month yet.
            if due_date <= current_month_deadline:
                student_name = f"{student.first_name} {student.last_name or ''}".strip()
                amount = student.monthly_fee or 0
                
                if current_day in [1, 3, 5]:
                    days_left = 10 - current_day
                    logger.info(f" -> Sending {days_left}-day reminder for {student_name} ({inst_name})")
                    send_parent_payment_reminder(student.parent_phone_number, student_name, amount, days_left, inst_name, student.parent_telegram_chat_id)
                elif current_day == 10:
                    logger.info(f" -> Student {student_name} ({inst_name}) is overdue. Blocking account.")
                    student.is_active = False
                    send_parent_blocked_notification(student.parent_phone_number, student_name, inst_name, student.parent_telegram_chat_id)

        db.commit()
        logger.info("✅ Student Billing Check Complete")

    except Exception as e:
        logger.error(f"❌ Error in student billing cron: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_student_subscriptions()
