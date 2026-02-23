import requests
import sys

BASE_URL = "http://localhost:8001"

def verify_admin():
    # 1. Login
    login_data = {
        "login": "abduhamidmahmudov1@gmail.com",
        "password": "1abutolib1"
    }
    
    print(f"Logging in...")
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if res.status_code != 200:
            print(f"❌ Login Failed: {res.status_code} {res.text}")
            return
            
        token = res.json().get("access_token")
        print(f"✅ Login Successful. Token obtained.")
        
    except Exception as e:
        print(f"❌ Connection Error during login: {e}")
        return

    # 2. Access Admin Dashboard
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"Accessing /admin/dashboard-stats...")
    try:
        res = requests.get(f"{BASE_URL}/admin/dashboard-stats", headers=headers)
        print(f"Response Status: {res.status_code}")
        print(f"Response Body: {res.text[:500]}") # Print first 500 chars
        
        if res.status_code == 200:
            print("✅ Admin Dashboard endpoint is WORKING from backend perspective.")
        else:
            print("❌ Admin Dashboard endpoint FAILED.")
            
    except Exception as e:
        print(f"❌ Connection Error during dashboard access: {e}")

if __name__ == "__main__":
    verify_admin()
