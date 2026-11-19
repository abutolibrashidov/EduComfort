from app.core.models.user import User
from app.core.database import SessionLocal
from app.services.users import hash_password
from app.constants.roles import Role

def seed_test_users():
    db = SessionLocal()

    # Check if admin already exists
    if db.query(User).filter(User.email == "admin@test.com").first():
        db.close()
        return

    users = [
        User(
            full_name="Admin User",
            email="admin@test.com",
            password_hash=hash_password("admin123"),
            role=Role.ADMIN
        ),
        User(
            full_name="Teacher User",
            email="teacher@test.com",
            password_hash=hash_password("teacher123"),
            role=Role.TEACHER
        ),
        User(
            full_name="Student User",
            email="student@test.com",
            password_hash=hash_password("student123"),
            role=Role.STUDENT
        ),
        User(
            full_name="Staff User",
            email="staff@test.com",
            password_hash=hash_password("staff123"),
            role=Role.STAFF
        )
    ]

    db.add_all(users)
    db.commit()
    db.close()
