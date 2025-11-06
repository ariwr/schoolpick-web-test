# UserRole enum 정의 (User 모델은 existing_db.py에 정의됨)
import enum

class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"
    PRINCIPAL = "principal"
