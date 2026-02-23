from app.core.database import SessionLocal
from app.models.user import User

try:
    db = SessionLocal()
    print("Testing DB connection...")
    user = db.query(User).first()
    if user:
        print("Found user:", user.email)
    else:
        print("No users found")
except Exception as e:
    print("DB Error:", e)
    import traceback
    traceback.print_exc()
finally:
    db.close()
