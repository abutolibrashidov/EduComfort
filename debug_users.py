from app.core.dependencies import get_db
from app.models.user import User

db_gen = get_db()
db = next(db_gen)

users = db.query(User).filter((User.role == "platform_owner") | (User.first_name.ilike("%Abutolib%"))).all()
for u in users:
    print(f"ID: {u.id}, Phone: {u.phone_number}, Name: {u.first_name} {u.last_name}, Role: {u.role}, is_super: {u.is_super_admin}, is_platform: {u.is_platform_admin}")
