# 설정 관리
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, ClassVar
import os
# dotenv는 safe_load_dotenv 함수 내에서 dotenv_values만 사용
import logging

logger = logging.getLogger(__name__)

# .env 파일 로드 (인코딩 오류 처리)
def safe_load_dotenv():
    """인코딩 오류가 있어도 안전하게 .env 파일을 로드"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    
    if not os.path.exists(env_path):
        logger.warning(".env 파일을 찾을 수 없습니다. 환경변수나 기본값을 사용합니다.")
        return
    
    # 여러 인코딩 시도
    encodings = ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr', 'latin-1', 'windows-1252']
    
    for encoding in encodings:
        try:
            # 파일을 해당 인코딩으로 읽기
            with open(env_path, 'r', encoding=encoding, errors='replace') as f:
                lines = f.readlines()
            
            # 간단한 .env 파일 파서
            loaded_count = 0
            skipped_count = 0
            for line in lines:
                line = line.strip()
                # 주석 무시
                if not line or line.startswith('#'):
                    continue
                
                # KEY=VALUE 형식 파싱
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    # BOM 제거 (UTF-8 with BOM 처리)
                    key = key.lstrip('\ufeff')
                    key = key.strip()
                    value = value.strip()
                    
                    # 따옴표 제거
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]
                    
                    # 키와 값이 모두 있어야 함
                    if not key:
                        continue
                    
                    # 환경변수가 없으면 설정 (기존 환경변수 보존)
                    if key not in os.environ:
                        os.environ[key] = value
                        loaded_count += 1
                        # OPENAI_API_KEY는 특히 로깅
                        if key == "OPENAI_API_KEY":
                            logger.info(f"✅ OPENAI_API_KEY 환경변수 설정 완료 (길이: {len(value)})")
                    else:
                        skipped_count += 1
                        # OPENAI_API_KEY가 이미 있으면 경고
                        if key == "OPENAI_API_KEY":
                            logger.warning(f"⚠️ OPENAI_API_KEY가 이미 환경변수에 설정되어 있어 건너뜁니다.")
            
            if loaded_count > 0:
                logger.info(f".env 파일을 {encoding} 인코딩으로 성공적으로 로드했습니다. ({loaded_count}개 변수 설정, {skipped_count}개 건너뜀)")
                # OPENAI_API_KEY 확인
                openai_key = os.getenv("OPENAI_API_KEY")
                if openai_key:
                    logger.info(f"✅ OPENAI_API_KEY 확인: 길이={len(openai_key)}, 시작={openai_key[:10]}...")
                else:
                    logger.warning("⚠️ OPENAI_API_KEY가 .env 파일에서 로드되지 않았습니다.")
                return
            
        except UnicodeDecodeError:
            continue
        except Exception as e:
            logger.warning(f".env 파일 로드 시도 실패 (인코딩: {encoding}): {str(e)}")
            continue
    
    # 모든 인코딩 시도 실패 시 .env 파일 무시
    logger.warning(".env 파일을 로드할 수 없습니다. 환경변수나 기본값을 사용합니다.")

# .env 파일 안전하게 로드
safe_load_dotenv()

# ALLOWED_ORIGINS 환경변수를 제거 (Pydantic이 JSON 파싱 오류를 일으키므로)
# 대신 __init__에서 직접 처리
if 'ALLOWED_ORIGINS' in os.environ:
    # 임시로 제거하고 나중에 __init__에서 다시 읽음
    _allowed_origins_temp = os.environ.pop('ALLOWED_ORIGINS', None)
    # 나중에 다시 설정 (__init__에서 읽을 수 있도록)
    if _allowed_origins_temp:
        os.environ['_ALLOWED_ORIGINS_TEMP'] = _allowed_origins_temp

# CORS 기본값 (클래스 밖으로 이동)
DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002"

# Secrets Manager에서 OpenAI API 키 읽기
def get_openai_api_key_from_secrets_manager():
    """Secrets Manager에서 OpenAI API 키를 읽어옵니다."""
    try:
        # 환경변수에서 먼저 확인
        env_key = os.getenv("OPENAI_API_KEY")
        if env_key and env_key.strip():
            logger.info(f"환경변수에서 OpenAI API 키를 찾았습니다. (길이: {len(env_key)})")
            return env_key.strip()
        
        # 환경변수에 없으면 .env 파일에서 직접 읽기 시도
        logger.info("환경변수에서 OpenAI API 키를 찾을 수 없습니다. .env 파일에서 직접 읽기를 시도합니다.")
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            key = key.strip().lstrip('\ufeff').strip()
                            value = value.strip()
                            # 따옴표 제거
                            if value.startswith('"') and value.endswith('"'):
                                value = value[1:-1]
                            elif value.startswith("'") and value.endswith("'"):
                                value = value[1:-1]
                            if key == "OPENAI_API_KEY" and value:
                                # 환경변수에 설정하고 반환
                                os.environ["OPENAI_API_KEY"] = value
                                logger.info(f"✅ .env 파일에서 OpenAI API 키를 직접 읽어 환경변수에 설정했습니다. (길이: {len(value)})")
                                return value.strip()
            except Exception as e:
                logger.warning(f".env 파일에서 직접 읽기 실패: {str(e)}")
        
        logger.info("환경변수와 .env 파일에서 OpenAI API 키를 찾을 수 없습니다. Secrets Manager에서 시도합니다.")
        import boto3
        import json
        
        # Secrets Manager에서 읽기
        secrets_client = boto3.client('secretsmanager', region_name='ap-northeast-2')
        secret_name = "godingpick/openai-api-key"
        
        try:
            response = secrets_client.get_secret_value(SecretId=secret_name)
            secret_string = response['SecretString']
            
            # JSON 형식인지 확인
            try:
                secret_dict = json.loads(secret_string)
                # JSON 형식이면 'openai_api_key' 키에서 읽기
                key = secret_dict.get('openai_api_key', secret_dict.get('OPENAI_API_KEY', ''))
                if key and key.strip():
                    logger.info(f"Secrets Manager에서 OpenAI API 키를 찾았습니다. (길이: {len(key)})")
                    return key.strip()
                else:
                    logger.warning("Secrets Manager에서 OpenAI API 키를 찾았지만 값이 비어있습니다.")
                    return ""
            except json.JSONDecodeError:
                # JSON이 아니면 문자열 그대로 사용
                if secret_string and secret_string.strip():
                    logger.info(f"Secrets Manager에서 OpenAI API 키를 찾았습니다. (길이: {len(secret_string)})")
                    return secret_string.strip()
                else:
                    logger.warning("Secrets Manager에서 OpenAI API 키를 찾았지만 값이 비어있습니다.")
                    return ""
                
        except secrets_client.exceptions.ResourceNotFoundException:
            logger.warning(f"Secrets Manager에서 '{secret_name}' Secret을 찾을 수 없습니다.")
            return ""
        except Exception as e:
            logger.warning(f"Secrets Manager에서 OpenAI API 키를 읽는 중 오류 발생: {str(e)}")
            return ""
            
    except ImportError:
        logger.warning("boto3가 설치되지 않았습니다. Secrets Manager 기능을 사용할 수 없습니다.")
        return ""
    except Exception as e:
        logger.warning(f"OpenAI API 키를 Secrets Manager에서 읽는 중 오류 발생: {str(e)}")
        return ""

class Settings(BaseSettings):
    # 앱 설정
    APP_NAME: str = "SchoolPick Teacher Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # 데이터베이스 설정 (기존 스쿨픽 앱 DB 사용)
    # Windows에서는 psycopg2-binary 사용
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "3.35.3.225")
    DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", "5432"))
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "hw_project001")
    DATABASE_USER: str = os.getenv("DATABASE_USER", "postgres")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "password")
    
    # DATABASE_URL이 설정되어 있지 않으면 자동 생성 (비밀번호 URL 인코딩)
    def _get_database_url(self) -> str:
        """DATABASE_URL을 환경변수에서 가져오거나 비밀번호를 인코딩해서 생성"""
        if os.getenv("DATABASE_URL"):
            return os.getenv("DATABASE_URL")
        
        # 환경변수에서 직접 읽기 (Settings 인스턴스 변수보다 우선)
        # .env 파일이 나중에 로드될 수 있으므로 매번 환경변수에서 직접 읽음
        password = os.getenv("DATABASE_PASSWORD", self.DATABASE_PASSWORD)
        host = os.getenv("DATABASE_HOST", self.DATABASE_HOST)
        port = os.getenv("DATABASE_PORT", str(self.DATABASE_PORT))
        name = os.getenv("DATABASE_NAME", self.DATABASE_NAME)
        user = os.getenv("DATABASE_USER", self.DATABASE_USER)
        
        # 비밀번호 URL 인코딩
        from urllib.parse import quote
        encoded_password = quote(password)
        return f"postgresql://{user}:{encoded_password}@{host}:{port}/{name}"
    
    @property
    def DATABASE_URL(self) -> str:
        return self._get_database_url()
    
    # JWT 설정
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # CORS 설정 (Pydantic이 자동으로 읽지 않도록 설정)
    # Field의 exclude는 직렬화에만 영향을 주므로, 환경변수 파싱을 막기 위해
    # 타입을 Optional로 하고 init_after_validation으로 설정
    ALLOWED_ORIGINS: List[str] = Field(default_factory=list)
    
    def __init__(self, **kwargs):
        # ALLOWED_ORIGINS를 kwargs에서 제거하여 Pydantic이 처리하지 않도록 함
        if 'ALLOWED_ORIGINS' in kwargs:
            del kwargs['ALLOWED_ORIGINS']
        super().__init__(**kwargs)
        # 환경변수에서 직접 읽기 (Pydantic이 처리하지 않도록)
        # 임시 저장된 값이 있으면 사용, 없으면 환경변수에서 직접 읽기
        allowed_origins_str = os.getenv("_ALLOWED_ORIGINS_TEMP") or os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
        if allowed_origins_str:
            # 쉼표로 구분된 문자열을 리스트로 변환하고 공백 제거
            self.ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
        else:
            # 기본값 사용
            self.ALLOWED_ORIGINS = [origin.strip() for origin in DEFAULT_ALLOWED_ORIGINS.split(",") if origin.strip()]
        # 임시 환경변수 제거
        if '_ALLOWED_ORIGINS_TEMP' in os.environ:
            del os.environ['_ALLOWED_ORIGINS_TEMP']
        
        # OpenAI API 키를 Secrets Manager에서 읽기
        self.OPENAI_API_KEY = get_openai_api_key_from_secrets_manager()
        if not self.OPENAI_API_KEY or not self.OPENAI_API_KEY.strip():
            logger.warning("OpenAI API 키가 설정되지 않았습니다. 세특 검열 기능을 사용할 수 없습니다.")
            logger.warning("환경변수 OPENAI_API_KEY를 설정하거나 AWS Secrets Manager에 키를 저장하세요.")
            self.OPENAI_API_KEY = ""  # 빈 문자열로 명시적 설정
        else:
            logger.info(f"OpenAI API 키가 성공적으로 로드되었습니다. (길이: {len(self.OPENAI_API_KEY)})")
    
    # 이메일 설정
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    
    # 로깅 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")
    
    # OpenAI API 설정 (Secrets Manager 또는 환경변수에서 읽기)
    # __init__에서 Secrets Manager를 통해 읽어옴
    OPENAI_API_KEY: str = ""
    
    model_config = {
        # env_file을 None으로 설정: safe_load_dotenv()에서 이미 환경변수를 로드했으므로
        # Pydantic이 .env 파일을 직접 읽지 않도록 함
        "env_file": None,  # .env 파일 자동 로드 비활성화
        "extra": "ignore",  # 환경변수에서 추가 필드 무시
        # ALLOWED_ORIGINS는 환경변수에서 읽지 않도록 설정
        "env_ignore_empty": True,
    }

settings = Settings()
