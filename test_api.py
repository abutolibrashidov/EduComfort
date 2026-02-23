import urllib.request
import urllib.parse
import json

def get_token():
    url = "http://localhost:8000/auth/login"
    data = urllib.parse.urlencode({
        "username": "abduhamidmahmudov1@gmail.com",
        "password": "1abutolib1"
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            return res.get("access_token")
    except urllib.error.HTTPError as e:
        print(f"Login failed: {e.read().decode('utf-8')}")
        return None

def test_create_user(token):
    url = "http://localhost:8000/admin/users"
    
    payload = {
        "first_name": "Test",
        "last_name": None,
        "phone_number": "+998 99 123 45 67",
        "email": None,
        "password": "password123",
        "role": "student",
        "is_active": True
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            print("Success:", response.status)
            print(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("Error:", e.status)
        print("Details:", e.read().decode("utf-8"))

token = get_token()
if token:
    test_create_user(token)
