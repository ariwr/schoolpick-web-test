# 데이터베이스 연결 설정
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings, safe_load_dotenv
import os
import logging

logger = logging.getLogger(__name__)

# 데이터베이스 연결 전에 환경변수 재확인 및 강제 로드
def _ensure_env_loaded():
    """환경변수가 로드되었는지 확인하고, 없으면 .env 파일에서 직접 로드"""
    # 로깅 설정 (터미널에 출력)
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    current_password = os.getenv("DATABASE_PASSWORD", "")
    logger.info(f"현재 DATABASE_PASSWORD: {current_password[:5] + '...' if current_password else 'NOT SET'}")
    
    if not current_password or current_password == "password":
        # .env 파일 경로
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        logger.info(f".env 파일 경로 확인: {env_path}")
        logger.info(f".env 파일 존재: {os.path.exists(env_path)}")
        
        if os.path.exists(env_path):
            # 여러 인코딩 시도 (config.py의 safe_load_dotenv와 동일한 방식)
            encodings = ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr', 'latin-1', 'windows-1252']
            
            password_found = False
            for encoding in encodings:
                try:
                    with open(env_path, 'r', encoding=encoding, errors='replace') as f:
                        lines = f.readlines()
                        logger.info(f".env 파일 라인 수: {len(lines)} (인코딩: {encoding})")
                        
                        for line_num, line in enumerate(lines, 1):
                            original_line = line
                            line = line.strip()
                            logger.debug(f"라인 {line_num}: {line[:50]}...")
                            
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                # BOM 제거 (UTF-8 with BOM 처리)
                                key = key.lstrip('\ufeff')
                                key = key.strip()
                                value = value.strip()
                                
                                logger.info(f"라인 {line_num} 파싱: key={repr(key)}, value={value[:10]}...")
                                
                                if key == "DATABASE_PASSWORD":
                                    password_found = True
                                    os.environ[key] = value
                                    os.environ['DATABASE_PASSWORD'] = value  # 중복 설정으로 확실하게
                                    
                                    logger.info(f"✅ DATABASE_PASSWORD 설정 완료: {value[:5]}... (라인 {line_num}, 인코딩: {encoding})")
                                    # 즉시 확인
                                    verify = os.getenv("DATABASE_PASSWORD", "")
                                    if len(verify) > 15:
                                        verify_display = verify[:15] + "..."
                                    else:
                                        verify_display = verify
                                    logger.info(f"✅ 확인: os.getenv('DATABASE_PASSWORD') = '{verify_display}'")
                                    
                                    # 값이 설정되었는지만 확인 (빈 값이 아니면 성공)
                                    if verify:
                                        logger.info(f"✅ DATABASE_PASSWORD 환경변수 설정 성공!")
                                        return True
                                    else:
                                        logger.error(f"❌ 환경변수 설정 실패! verify가 비어있습니다.")
                                        # 다시 시도
                                        os.environ['DATABASE_PASSWORD'] = value
                                        verify_retry = os.getenv('DATABASE_PASSWORD', 'FAILED')
                                        logger.info(f"✅ 재설정 시도: {verify_retry[:15] if len(verify_retry) > 15 else verify_retry}")
                        
                        # 이 인코딩으로 파일을 성공적으로 읽었지만 DATABASE_PASSWORD를 찾지 못한 경우
                        if not password_found:
                            logger.warning(f"⚠️ DATABASE_PASSWORD 라인을 찾지 못했습니다. (인코딩: {encoding})")
                        # 인코딩이 성공했으므로 다음 인코딩 시도하지 않고 종료
                        break
                except UnicodeDecodeError:
                    # 이 인코딩으로 읽을 수 없으면 다음 인코딩 시도
                    continue
                except Exception as e:
                    logger.warning(f"⚠️ .env 파일 읽기 시도 실패 (인코딩: {encoding}): {str(e)}")
                    continue
            
            # 모든 인코딩 시도 후에도 DATABASE_PASSWORD를 찾지 못한 경우에만 오류
            if not password_found:
                logger.error(f"❌ .env 파일에서 DATABASE_PASSWORD를 찾을 수 없습니다.")
        else:
            logger.warning(f"⚠️ .env 파일을 찾을 수 없습니다: {env_path}")
    else:
        logger.info(f"✅ DATABASE_PASSWORD가 이미 설정되어 있습니다: {current_password[:5]}...")
    
    return False

# 환경변수 로드 확인 및 강제 로드
_ensure_env_loaded()

# DATABASE_URL 재생성을 위해 settings 객체 강제 업데이트
# 환경변수가 로드된 후 DATABASE_URL을 다시 계산해야 함
import importlib
import app.config
importlib.reload(app.config)
from app.config import settings

# 데이터베이스 엔진 생성 (연결 타임아웃 설정 - 빠른 실패)
# DATABASE_URL은 property이므로 매번 최신 환경변수를 사용함
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
    connect_args={
        "connect_timeout": 5,  # 5초 연결 타임아웃 (더 빠른 실패)
        "options": "-c statement_timeout=10000"  # 10초 쿼리 타임아웃
    },
    pool_timeout=5,  # 연결 풀 타임아웃
    pool_reset_on_return='commit'
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
