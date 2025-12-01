"""
사용자 정의 금지어 관리 API
JSON 파일 기반으로 사용자 정의 금지어를 관리합니다.
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from pydantic import BaseModel
from pathlib import Path
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from app.services.filter_service import get_filter_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/custom-rules", tags=["custom-rules"])

# 필터 데이터 디렉토리 경로
FILTER_DATA_DIR = Path(__file__).parent.parent / "core" / "filter_data"
CUSTOM_RULES_FILE = FILTER_DATA_DIR / "custom_rules.json"

# 전역 스레드 풀 (필터 리로드용 - 백그라운드에서 비동기 처리)
_reload_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="filter_reload")


def _reload_patterns_async():
    """비동기로 패턴 리로드 (백그라운드 스레드에서 실행)"""
    try:
        filter_service = get_filter_service()
        filter_service.reload_patterns()
        logger.info("사용자 정의 금지어 변경 후 필터 패턴 리로드 완료")
    except Exception as reload_error:
        logger.warning(f"필터 패턴 리로드 중 오류 발생: {reload_error}")


# 요청/응답 모델
class CustomRuleCreate(BaseModel):
    word: str
    replacement: str = "XXX"


class CustomRuleResponse(BaseModel):
    id: int
    word: str
    replacement: str
    created_at: str


def load_custom_rules() -> List[dict]:
    """
    custom_rules.json 파일에서 사용자 정의 금지어를 로드합니다.
    
    Returns:
        List[dict]: 사용자 정의 금지어 리스트
    """
    if not CUSTOM_RULES_FILE.exists():
        logger.warning(f"custom_rules.json 파일이 존재하지 않습니다. 빈 배열을 반환합니다.")
        return []
    
    try:
        with open(CUSTOM_RULES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            logger.warning("custom_rules.json 파일 형식이 올바르지 않습니다. 빈 배열로 초기화합니다.")
            return []
        
        return data
    except json.JSONDecodeError as e:
        logger.error(f"custom_rules.json 파싱 오류: {e}")
        return []
    except Exception as e:
        logger.error(f"custom_rules.json 로드 오류: {e}", exc_info=True)
        return []


def save_custom_rules(rules: List[dict]) -> bool:
    """
    custom_rules.json 파일에 사용자 정의 금지어를 저장합니다.
    
    Args:
        rules: 저장할 금지어 리스트
        
    Returns:
        bool: 저장 성공 여부
    """
    try:
        # 디렉토리가 없으면 생성
        CUSTOM_RULES_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        with open(CUSTOM_RULES_FILE, 'w', encoding='utf-8') as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)
        
        logger.info(f"custom_rules.json 저장 완료: {len(rules)}개 항목")
        return True
    except Exception as e:
        logger.error(f"custom_rules.json 저장 오류: {e}", exc_info=True)
        return False


@router.get("", response_model=List[CustomRuleResponse])
async def get_custom_rules():
    """
    등록된 모든 사용자 정의 금지어 목록을 조회합니다.
    """
    try:
        rules = load_custom_rules()
        return [
            CustomRuleResponse(
                id=rule.get("id", idx),
                word=rule.get("word", ""),
                replacement=rule.get("replacement", "XXX"),
                created_at=rule.get("created_at", "")
            )
            for idx, rule in enumerate(rules, start=1)
        ]
    except Exception as e:
        logger.error(f"사용자 정의 금지어 조회 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"금지어 목록 조회에 실패했습니다: {str(e)}"
        )


@router.post("", response_model=CustomRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_rule(rule_data: CustomRuleCreate):
    """
    새로운 사용자 정의 금지어를 추가합니다.
    """
    try:
        rules = load_custom_rules()
        
        # 중복 확인
        word = rule_data.word.strip()
        for existing_rule in rules:
            if existing_rule.get("word", "").strip() == word:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"이미 등록된 금지어입니다: '{word}'"
                )
        
        # 새 규칙 생성
        import datetime
        new_id = max([r.get("id", 0) for r in rules], default=0) + 1
        new_rule = {
            "id": new_id,
            "word": word,
            "replacement": rule_data.replacement.strip() if rule_data.replacement else "XXX",
            "created_at": datetime.datetime.now().isoformat(),
            "pattern": re.escape(word),  # 정규식 이스케이프
            "label": word,
            "category": "USER_DEFINED",
            "use_regex": True,
            "use_kiwi": False
        }
        
        rules.append(new_rule)
        
        if not save_custom_rules(rules):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="금지어 저장에 실패했습니다."
            )
        
        # 필터 서비스 패턴 리로드를 백그라운드에서 비동기로 처리 (응답 지연 방지)
        _reload_executor.submit(_reload_patterns_async)
        
        logger.info(f"사용자 정의 금지어 추가됨: '{new_rule['word']}' -> '{new_rule['replacement']}'")
        
        return CustomRuleResponse(
            id=new_rule["id"],
            word=new_rule["word"],
            replacement=new_rule["replacement"],
            created_at=new_rule["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 정의 금지어 추가 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"금지어 추가에 실패했습니다: {str(e)}"
        )


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_rule(rule_id: int):
    """
    특정 사용자 정의 금지어를 삭제합니다.
    """
    try:
        rules = load_custom_rules()
        
        # 디버깅: 현재 상태 로깅
        logger.info(f"삭제 요청: ID {rule_id}, 현재 금지어 수: {len(rules)}")
        if rules:
            logger.info(f"현재 금지어 ID 목록: {[r.get('id') for r in rules]}")
        
        # ID로 찾기 (타입 변환하여 비교)
        rule_index = None
        for idx, rule in enumerate(rules):
            rule_id_in_file = rule.get("id")
            # 타입 변환하여 비교 (문자열/정수 모두 처리)
            try:
                if rule_id_in_file == rule_id or int(rule_id_in_file) == rule_id:
                    rule_index = idx
                    break
            except (ValueError, TypeError):
                # 타입 변환 실패 시 정확히 일치하는지만 확인
                if rule_id_in_file == rule_id:
                    rule_index = idx
                    break
        
        if rule_index is None:
            # 더 명확한 에러 메시지
            if not rules:
                detail = f"등록된 금지어가 없습니다. (요청한 ID: {rule_id})"
            else:
                available_ids = [r.get("id") for r in rules]
                detail = f"ID {rule_id}에 해당하는 금지어를 찾을 수 없습니다. (사용 가능한 ID: {available_ids})"
            
            logger.warning(detail)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail
            )
        
        deleted_word = rules[rule_index].get("word", "")
        rules.pop(rule_index)
        
        if not save_custom_rules(rules):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="금지어 삭제에 실패했습니다."
            )
        
        # 필터 서비스 패턴 리로드를 백그라운드에서 비동기로 처리 (응답 지연 방지)
        _reload_executor.submit(_reload_patterns_async)
        
        logger.info(f"사용자 정의 금지어 삭제됨: '{deleted_word}' (ID: {rule_id})")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 정의 금지어 삭제 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"금지어 삭제에 실패했습니다: {str(e)}"
        )
