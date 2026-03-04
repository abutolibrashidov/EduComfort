import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.routers.teacher import get_target_teacher_id
from fastapi import HTTPException

# Test script to verify the get_target_teacher_id logic
def test_impersonation():
    db = SessionLocal()
    try:
        # Get a super admin
        super_admin = db.query(User).filter(User.role == 'super_admin').first()
        if not super_admin:
            print("No super admin found.")
            return

        # Get a teacher
        teacher = db.query(User).filter(User.role == 'teacher').first()
        if not teacher:
            print("No teacher found.")
            return

        print(f"Super Admin ID: {super_admin.id}")
        print(f"Teacher ID: {teacher.id}")

        # Test logic
        target_id = get_target_teacher_id(current_user=super_admin, teacher_id=teacher.id)
        if target_id == teacher.id:
            print("SUCCESS: Super Admin can impersonate teacher.")
        else:
            print(f"FAILED: Expected {teacher.id}, got {target_id}")

        # Test teacher trying to impersonate another teacher
        other_teacher = db.query(User).filter(User.role == 'teacher', User.id != teacher.id).first()
        if other_teacher:
            try:
                get_target_teacher_id(current_user=teacher, teacher_id=other_teacher.id)
                print("FAILED: Teacher was able to impersonate another teacher!")
            except HTTPException as e:
                print(f"SUCCESS: Teacher blocked from impersonating another teacher. ({e.detail})")

        # Test teacher without teacher_id param
        target_id_self = get_target_teacher_id(current_user=teacher, teacher_id=None)
        if target_id_self == teacher.id:
            print("SUCCESS: Teacher gets their own data when no teacher_id is provided.")
        else:
            print(f"FAILED: Expected {teacher.id}, got {target_id_self}")

    finally:
        db.close()

if __name__ == "__main__":
    test_impersonation()
