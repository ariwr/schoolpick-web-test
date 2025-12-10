import requests
import json

url = "http://localhost:8000/api/auth/register"
data = {
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "name": "Test User",
    "phone": "010-1234-5678"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
