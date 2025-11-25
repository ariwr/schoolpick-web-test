# 데이터베이스 연결 설정
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings, safe_load_dotenv
import os
import logging

logger = logging.getLogger(__name__)

# config.py의 safe_load_dotenv가 이미 호출되었으므로 추가 로딩 불필요
# DATABASE_PASSWORD가 없으면 경고만 출력
current_password = os.getenv("DATABASE_PASSWORD", "")
if not current_password or current_password == "password":
    logger.warning("DATABASE_PASSWORD가 설정되지 않았거나 기본값입니다. .env 파일을 확인하세요.")

# 데이터베이스 엔진 생성 (연결 타임아웃 설정 - 빠른 실패)
# DATABASE_URL은 property이므로 매번 최신 환경변수를 사용함
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 연결 전 ping으로 유효성 확인
    pool_recycle=300,  # 5분마다 연결 재생성
    pool_size=10,  # 기본 연결 풀 크기
    max_overflow=20,  # 추가 연결 가능 수
    echo=settings.DEBUG,
    connect_args={
        "connect_timeout": 5,  # 5초 연결 타임아웃 (더 빠른 실패)
        "options": "-c statement_timeout=10000"  # 10초 쿼리 타임아웃
    },
    pool_timeout=5,  # 연결 풀 타임아웃
    pool_reset_on_return='commit'  # 연결 반환 시 커밋으로 리셋
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 클래스 생성
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
