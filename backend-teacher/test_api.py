"""
Test backend API response time
"""
import requests
import time

url = "http://localhost:8000/api/schedule/active"

try:
    start = time.time()
    response = requests.get(url, timeout=5)
    elapsed = time.time() - start
    
    print(f"✅ Response received in {elapsed:.2f}s")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Data: {response.json()}")
    else:
        print(f"Error: {response.text}")
except requests.exceptions.Timeout:
    print("❌ Request timed out after 5 seconds")
except requests.exceptions.ConnectionError:
    print("❌ Connection refused - backend server is not running")
except Exception as e:
    print(f"❌ Error: {e}")
