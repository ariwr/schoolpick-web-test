# Alembic 환경 설정
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# .env 파일 로드
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from app.database import Base
from app.models import existing_db, student, attendance, schedule

# Alembic 설정 객체
config = context.config

# 로그 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 메타데이터 설정
target_metadata = Base.metadata

def get_url():
    """환경변수에서 데이터베이스 URL 가져오기"""
    url = os.getenv("DATABASE_URL")
    if url:
        return url
        
    user = os.getenv("DATABASE_USER", "postgres")
    password = os.getenv("DATABASE_PASSWORD", "password")
    # env 로드 실패 시 원격 DB IP 하드코딩 (디버깅용)
    host = os.getenv("DATABASE_HOST", "3.35.3.225") 
    port = os.getenv("DATABASE_PORT", "5432")
    db_name = os.getenv("DATABASE_NAME", "schoolpick_web")
    
    return f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

def run_migrations_offline() -> None:
    """오프라인 모드에서 마이그레이션 실행"""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """온라인 모드에서 마이그레이션 실행"""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
