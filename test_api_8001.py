import requests
import json

print("\n--- Testing /auth/login on port 8001 ---")
try:
    res2 = requests.post('http://127.0.0.1:8001/auth/login', json={"login": "test@example.com", "password": "password"}, timeout=5)
    print(res2.status_code)
    print(res2.text)
except Exception as e:
    print("Error:", e)
