from sqlalchemy.orm import Session
from sqlalchemy import text
from loguru import logger
from app.core.models.institution import Institution
from app.shared.services.user_service import robust_cascade_delete_user
from app.core.models.user import User

def robust_cascade_delete_institution(db: Session, institution: Institution):
    """
    Permanently deletes an institution and ALL its associated data.
    This is a massive operation. It:
    1. Deletes all users using their robust cascade logic.
    2. Wipes all remaining institution-linked data (branches, groups, etc.)
    3. Finally deletes the institution entry.
    """
    inst_id = institution.id
    logger.info(f"💣 MASSIVE CASCADE DELETE: Institution {institution.name} (ID: {inst_id})")

    # 1. Get all users associated with this institution
    users = db.query(User).filter(User.institution_id == inst_id).all()
    logger.info(f"Found {len(users)} users to scrub...")

    for user in users:
        try:
            robust_cascade_delete_user(db, user)
        except Exception as e:
            logger.error(f"Failed to scrub user {user.id} during institution delete: {e}")
            # Continue anyway to wipe as much as possible

    # 2. Scrub any remaining data tied to institution_id
    cleanup_queries = [
        "DELETE FROM branches WHERE institution_id = :iid",
        "DELETE FROM groups WHERE institution_id = :iid",
        "DELETE FROM announcements WHERE institution_id = :iid",
        "DELETE FROM institution_subscriptions WHERE institution_id = :iid",
        "DELETE FROM feedbacks WHERE institution_id = :iid",
        "DELETE FROM teacher_payments WHERE institution_id = :iid",
        "DELETE FROM expenses WHERE institution_id = :iid",
        "DELETE FROM student_enrollments WHERE institution_id = :iid",
        "DELETE FROM online_courses WHERE institution_id = :iid",
        "DELETE FROM attendance WHERE institution_id = :iid",
        "DELETE FROM teacher_contracts WHERE institution_id = :iid",
        "DELETE FROM school_fees WHERE institution_id = :iid",
        "DELETE FROM library_books WHERE institution_id = :iid",
        "DELETE FROM inventory_items WHERE institution_id = :iid",
    ]

    for q_str in cleanup_queries:
        try:
            db.begin_nested()
            db.execute(text(q_str), {"iid": inst_id})
            db.commit()
        except Exception as qe:
            db.rollback()
            logger.debug(f"Institution cleanup skipped for {q_str.split()[2]}: {str(qe)}")

    # 3. Delete the institution record itself
    db.delete(institution)
    db.commit()
    logger.info(f"✅ Institution {inst_id} fully scrubbed and removed.")
    return True