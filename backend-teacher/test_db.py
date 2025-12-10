import psycopg2
import os

try:
    conn = psycopg2.connect(
        dbname="schoolpick_teacher",
        user="postgres",
        password="password",
        host="localhost",
        port="5432"
    )
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
