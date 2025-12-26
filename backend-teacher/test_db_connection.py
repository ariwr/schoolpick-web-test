import os
from dotenv import load_dotenv
from app.database import engine

print("Current CWD:", os.getcwd())
env_path = os.path.join(os.getcwd(), ".env")
print(f"Checking .env at {env_path}: {os.path.exists(env_path)}")

load_dotenv()
print("DATABASE_HOST:", os.getenv("DATABASE_HOST"))
print("DATABASE_USER:", os.getenv("DATABASE_USER"))

try:
    with engine.connect() as conn:
        print("✅ Connection successful!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
