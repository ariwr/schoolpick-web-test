import requests
import json

base_url = "http://localhost:8000"
login_url = f"{base_url}/api/auth/login"
user_info_url = f"{base_url}/api/users/me"

data = {
    "email": "testuser@example.com",
    "password": "TestPassword123"
}

try:
    # Login
    print("Logging in...")
    response = requests.post(login_url, json=data)
    print(f"Login Status: {response.status_code}")
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"Token received: {token[:10]}...")
        
        # Get User Info
        print("Fetching user info...")
        headers = {"Authorization": f"Bearer {token}"}
        user_response = requests.get(user_info_url, headers=headers)
        print(f"User Info Status: {user_response.status_code}")
        print(f"User Info: {user_response.text}")
    else:
        print(f"Login failed: {response.text}")

except Exception as e:
    print(f"Error: {e}")
