# FastAPI 애플리케이션 진입점
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.config import settings
from app.api import auth, users, students, attendance, admin
from app.api.endpoints import schedule
import sys
import logging

# 로거 설정을 최상단으로 이동
logger = logging.getLogger(__name__)

# [Python 3.14 호환성 패치]
# numpy/cv2/kiwipiepy 등 의존성 문제가 있는 모듈은 선택적으로 임포트합니다.
# 임포트 실패 시 해당 기능은 비활성화되지만 서버는 정상 실행됩니다.

content_filter = None
custom_filter = None
ocr = None
check_router = None

# Python 3.14+ (win32)에서 numpy 임포트 시 행(hang) 현상 발생 방지
# OCR, Content Filter 등 numpy 의존 모듈은 불러오지 않음
if sys.version_info >= (3, 14) and sys.platform == 'win32':
    logger.warning("⚠️ Python 3.14 (Windows) 환경 감지됨: 불안정한 모듈(OCR, Content Filter) 로드를 건너뜁니다.")
else:
    # 1. Content Filter Module (Requires OpenAI, potentially numpy/kiwipiepy)
    try:
        from app.api import content_filter
        from app.api.content_filter import check_router
    except ImportError as e:
        logger.warning(f"⚠️ Content Filter 모듈 로드 실패 (의존성 누락): {e}")
    except Exception as e:
        logger.warning(f"⚠️ Content Filter 모듈 로드 중 오류 발생: {e}")

    # 2. Custom Filter Module (Requires Filter Service -> Kiwipiepy)
    try:
        from app.api import custom_filter
    except ImportError as e:
        logger.warning(f"⚠️ Custom Filter 모듈 로드 실패: {e}")
    except Exception as e:
        logger.warning(f"⚠️ Custom Filter 모듈 로드 중 오류 발생: {e}")

    # 3. OCR Module (Requires numpy, cv2, pdf2image)
    try:
        from app.api import ocr
    except ImportError as e:
        logger.warning(f"⚠️ OCR 모듈 로드 실패 (numpy/cv2 호환성 문제 가능성): {e}")
    except Exception as e:
        logger.warning(f"⚠️ OCR 모듈 로드 중 오류 발생: {e}")

from app.database import engine, SessionLocal
from app.models.existing_db import Base
from sqlalchemy import text
import re

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
# 기본값에 여러 포트를 포함하여 개발 환경에서 유연하게 대응
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]

cors_origins = settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS else default_origins
logger.info(f"CORS 허용된 Origin 목록: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # 허용된 origin 목록
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],  # 모든 헤더 허용
    expose_headers=["*"],
    max_age=3600,
)

# 요청 로깅 (디버깅용)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """요청 로깅 미들웨어"""
    if request.method == "OPTIONS":
        logger.info(f"OPTIONS 요청: {request.url.path}, Origin: {request.headers.get('origin', 'N/A')}")
    response = await call_next(request)
    if request.method == "OPTIONS":
        logger.info(f"OPTIONS 응답: {response.status_code}")
    return response

# 데이터베이스 연결 오류 전역 핸들러
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTP 예외 핸들러 - FastAPI의 HTTPException은 이미 처리되므로 여기서는 Starlette의 HTTPException만 처리"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """전역 예외 핸들러 - 데이터베이스 연결 오류 등 처리"""
    from sqlalchemy.exc import OperationalError
    from fastapi import HTTPException
    
    # HTTPException은 FastAPI가 처리하도록 함
    if isinstance(exc, HTTPException):
        raise exc
    
    error_msg = str(exc)
    
    # 데이터베이스 연결 오류 처리
    if isinstance(exc, OperationalError) or "password authentication failed" in error_msg.lower():
        logger.error(f"데이터베이스 연결 오류: {error_msg}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "데이터베이스 연결에 실패했습니다. .env 파일의 DATABASE_PASSWORD를 확인하세요."
            }
        )
    
    # 기타 예외는 기본 처리
    logger.error(f"예상치 못한 오류 발생: {error_msg}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"서버 오류가 발생했습니다: {error_msg[:200]}"}
    )

# 검증 오류 예외 핸들러 추가 (사용자 친화적인 메시지)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Pydantic 검증 오류를 사용자 친화적인 메시지로 변환
    """
    errors = exc.errors()
    
    # 오류 메시지 번역 맵
    error_translations = {
        "String should have at least 8 characters": "최소 8자 이상 입력해주세요",
        "String should have at least {limit_value} characters": "최소 {limit_value}자 이상 입력해주세요",
        "String should have at most {limit_value} characters": "최대 {limit_value}자까지 입력 가능합니다",
        "field required": "필수 입력 항목입니다",
        "value is not a valid email address": "올바른 이메일 주소를 입력해주세요",
        "value is not a valid integer": "숫자만 입력 가능합니다",
        "value is not a valid date": "올바른 날짜 형식을 입력해주세요",
    }
    
    # 첫 번째 오류 메시지 추출
    if errors and len(errors) > 0:
        first_error = errors[0]
        error_msg = first_error.get("msg", "입력 데이터가 올바르지 않습니다.")
        
        # "Value error, " 같은 접두사 제거
        if isinstance(error_msg, str):
            error_msg = error_msg.replace("Value error, ", "").replace("value_error", "").strip()
            # "type_error" 같은 접두사 제거
            error_msg = error_msg.replace("type_error.", "").strip()
            
            # 영어 메시지를 한국어로 변환
            translated = False
            
            # 직접 매칭
            if error_msg in error_translations:
                error_msg = error_translations[error_msg]
                translated = True
            # 패턴 매칭 (동적 값 포함)
            else:
                for eng_pattern, kor_template in error_translations.items():
                    if "{limit_value}" in kor_template and "at least" in eng_pattern.lower():
                        match = re.search(r'at least (\d+)', error_msg.lower())
                        if match:
                            limit = match.group(1)
                            error_msg = kor_template.replace("{limit_value}", limit)
                            translated = True
                            break
                    elif "{limit_value}" in kor_template and "at most" in eng_pattern.lower():
                        match = re.search(r'at most (\d+)', error_msg.lower())
                        if match:
                            limit = match.group(1)
                            error_msg = kor_template.replace("{limit_value}", limit)
                            translated = True
                            break
            
            # 번역되지 않은 경우 일반적인 패턴 매칭
            if not translated:
                if "at least" in error_msg.lower() and "character" in error_msg.lower():
                    match = re.search(r'at least (\d+)', error_msg.lower())
                    if match:
                        limit = match.group(1)
                        error_msg = f"최소 {limit}자 이상 입력해주세요"
                        translated = True
                elif "at most" in error_msg.lower() and "character" in error_msg.lower():
                    match = re.search(r'at most (\d+)', error_msg.lower())
                    if match:
                        limit = match.group(1)
                        error_msg = f"최대 {limit}자까지 입력 가능합니다"
                        translated = True
                elif "required" in error_msg.lower():
                    error_msg = "필수 입력 항목입니다"
                    translated = True
                elif "email" in error_msg.lower():
                    error_msg = "올바른 이메일 주소를 입력해주세요"
                    translated = True
            
            # 필드명 추출
            field_name = ""
            if "loc" in first_error and len(first_error["loc"]) > 0:
                field_name = first_error["loc"][-1]
                # 필드명을 한국어로 변환
                field_names_kr = {
                    "password": "비밀번호",
                    "email": "이메일",
                    "name": "이름",
                    "phone": "전화번호",
                    "birth_date": "생년월일",
                    "position": "직책",
                    "hire_date": "채용일",
                    "certification_number": "자격증 번호"
                }
                field_name = field_names_kr.get(field_name, field_name)
            
            # 필드명이 있으면 메시지 앞에 추가
            if field_name:
                error_msg = f"{field_name}: {error_msg}"
            
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": error_msg}
            )
    
    # 기본 오류 메시지
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "입력 데이터가 올바르지 않습니다."}
    )

# API 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["인증"])
app.include_router(users.router, prefix="/api/users", tags=["사용자"])
app.include_router(students.router, prefix="/api/students", tags=["학생"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["출석"])
app.include_router(admin.router, prefix="/api/admin", tags=["관리자"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["시간표"])

if content_filter:
    app.include_router(content_filter.router, prefix="/api/content-filter", tags=["세특 점검"])
if custom_filter:
    app.include_router(custom_filter.router, prefix="/api", tags=["사용자 정의 금지어"])
if ocr:
    app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
    
if check_router:
    app.include_router(check_router, tags=["세특 점검"])

from app.api.endpoints import school_data, wizard
app.include_router(school_data.router, prefix="/api/school-data", tags=["학교 설정"])
app.include_router(wizard.router, prefix="/api/wizard", tags=["학교 설정 마법사"])

# 야자 출석 스케줄러 시작
@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 스케줄러 시작 및 필터 서비스 초기화"""
    try:
        # scheduler = get_scheduler_service()
        # scheduler.start()
        logger.info("야자 출석 스케줄러가 일시적으로 비활성화되었습니다 (디버깅)")
    except Exception as e:
        logger.error(f"스케줄러 시작 중 오류 발생: {str(e)}")
    
    # 필터 서비스 초기화 (패턴 로드 확인)
    try:
        if sys.version_info >= (3, 14) and sys.platform == 'win32':
            logger.warning("⚠️ Python 3.14 (Windows): 필터 서비스 초기화를 건너뜁니다.")
        else:
            from app.services.filter_service import get_filter_service
            filter_service = get_filter_service()
            # 환경부 패턴이 로드되었는지 확인
            env_patterns = [p for p in filter_service.patterns if '환경부' in p.pattern]
            logger.info(f"필터 서비스 초기화 완료: 총 {len(filter_service.patterns)}개 패턴 로드됨 (환경부 패턴: {len(env_patterns)}개)")
            if env_patterns:
                logger.info(f"환경부 패턴 확인: {env_patterns[0].pattern}")
    except Exception as e:
        logger.error(f"필터 서비스 초기화 중 오류 발생: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 스케줄러 종료"""
    try:
        from app.services.scheduler_service import get_scheduler_service
        scheduler = get_scheduler_service()
        scheduler.shutdown()
        logger.info("야자 출석 스케줄러가 종료되었습니다")
    except Exception as e:
        logger.error(f"스케줄러 종료 중 오류 발생: {str(e)}")

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
