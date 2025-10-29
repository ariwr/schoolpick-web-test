# FastAPI 애플리케이션 진입점
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, users, students, attendance, schedule
from app.database import engine, SessionLocal
from app.models.existing_db import Base
from sqlalchemy import text

# 기존 DB를 사용하므로 테이블 생성은 하지 않음
# 모델은 이미 존재하는 테이블과 매핑되도록 설정됨

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="스쿨픽 교사용 웹 서비스를 위한 백엔드 API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["인증"])
app.include_router(users.router, prefix="/api/users", tags=["사용자"])
app.include_router(students.router, prefix="/api/students", tags=["학생"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["출석"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["시간표"])

@app.get("/")
async def root():
    return {
        "message": "SchoolPick Teacher Backend API",
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """헬스 체크 - 데이터베이스 연결 상태 확인"""
    try:
        # 데이터베이스 연결 테스트
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        finally:
            db.close()
        
        return {
            "status": "healthy" if db_status == "connected" else "unhealthy",
            "database": db_status,
            "version": settings.APP_VERSION
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
