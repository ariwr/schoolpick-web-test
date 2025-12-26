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

from app.config import settings

def get_url():
    """앱 설정에서 데이터베이스 URL 가져오기"""
    return settings.DATABASE_URL

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
