from sqlalchemy.orm import Session
import bcrypt
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.constants.roles import Role

# ---------------- Password utils ----------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

# ---------------- Get user ----------------
def get_user(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


# Compatibility alias used by some routers/imports
def get_user_by_id(db: Session, user_id: int) -> User | None:
    return get_user(db, user_id)

# ---------------- Get users (with optional branch filter) ----------------
def get_users(db: Session, branch_id: int | None = None) -> list[User]:
    query = db.query(User)
    if branch_id is not None:
        query = query.filter(User.branch_id == branch_id)
    return query.all()

# ---------------- Create user (ADMIN) ----------------
def create_user(db: Session, user_data: UserCreate) -> User:
    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        branch_id=user_data.branch_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# ---------------- Update user ----------------
def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User | None:
    user = get_user(db, user_id)
    if not user:
        return None

    data = user_data.dict(exclude_unset=True)

    if "role" in data and data["role"] not in Role:
        data.pop("role")

    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user
