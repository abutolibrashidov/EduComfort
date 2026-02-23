import sys
import os
from fastapi.testclient import TestClient

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.auth.dependencies import get_current_user
from app.models.user import User

# Mock get_current_user
def override_get_current_user():
    user = User(id=1, role="super_admin", is_super_admin=True, is_active=True, institution_id=1, is_platform_admin=True)
    return user

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

payload = {
    "first_name": "Sardor",
    "last_name": "",
    "phone_number": "+998 90 123 45 67",
    "email": None,
    "password": "password123",
    "role": "student",
    "is_active": True
}

response = client.post("/admin/users", json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
