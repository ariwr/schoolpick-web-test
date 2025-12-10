"""
세특 검열 API 엔드포인트
ChatGPT API를 사용하여 세특 내용의 부적절한 단어를 검열하고 맞춤법을 검사합니다.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import openai
import os
import json
import time
import re
import codecs
import hashlib
from app.config import settings
from app.services.filter_service import filter_text as rule_based_filter

router = APIRouter()

# /check/setuek 엔드포인트를 위한 별도 라우터 (prefix 없이 등록)
check_router = APIRouter()

# OpenAI API 키 설정 (settings에서 읽어옴)
OPENAI_API_KEY = settings.OPENAI_API_KEY

# 디버깅: 키 상태 로깅
import logging
logger = logging.getLogger(__name__)

# 기본 모델 설정
DEFAULT_MODEL = "gpt-4o-mini"
OPENAI_MODEL = DEFAULT_MODEL

# [최적화] LLM 응답 캐시 (Content Hash -> Response)
# 서버 재시작 시 초기화됨. 메모리 관리를 위해 최대 항목 수 제한 필요 시 LRU 적용 권장.
# 현재는 단순 Dict 사용.
_llm_cache = {}

# 모델 정보 로깅
logger.info(f"기본 모델을 사용합니다: {DEFAULT_MODEL}")

# 키가 있는지 확인 (빈 문자열도 체크)
if OPENAI_API_KEY and OPENAI_API_KEY.strip():
    # 키의 앞 10자만 로깅 (보안)
    key_preview = OPENAI_API_KEY[:10] + "..." if len(OPENAI_API_KEY) > 10 else "***"
    logger.info(f"OpenAI API 키가 로드되었습니다. (길이: {len(OPENAI_API_KEY)}, 미리보기: {key_preview})")
    
    # 키가 유효한 형식인지 확인 (sk- 또는 sk-proj-로 시작하는지)
    if not (OPENAI_API_KEY.startswith("sk-") or OPENAI_API_KEY.startswith("sk-proj-")):
        logger.error(f"⚠️ OpenAI API 키 형식이 올바르지 않습니다! (sk- 또는 sk-proj-로 시작해야 함)")
        logger.error(f"현재 키 시작 부분: '{OPENAI_API_KEY[:15]}...'")
        logger.error("올바른 형식의 API 키를 설정해주세요.")
    else:
        logger.info(f"✅ OpenAI API 키 형식이 올바릅니다.")
    
    openai.api_key = OPENAI_API_KEY
else:
    logger.error("❌ OPENAI_API_KEY가 설정되지 않았습니다!")
    logger.error("세특 검열 기능을 사용하려면 다음 중 하나를 수행하세요:")
    logger.error("1. backend-teacher 폴더에 .env 파일을 생성하고 OPENAI_API_KEY=your_key 추가")
    logger.error("2. 환경변수 OPENAI_API_KEY를 설정")
    logger.error("3. AWS Secrets Manager에 키 저장")
    OPENAI_API_KEY = None  # 명시적으로 None으로 설정


class ContentFilterRequest(BaseModel):
    """세특 검열 요청 모델"""
    content: str = Field(..., description="검열할 세특 내용", max_length=2000)
    max_bytes: int = Field(default=2000, description="최대 바이트 수", ge=1, le=2000)


class FilterIssue(BaseModel):
    """검열 발견 이슈 모델"""
    type: str = Field(..., description="이슈 유형 (delete, modify, spelling)")
    severity: str = Field(default="critical", description="심각도 (critical: 금지어/삭제필수, warning: 유의사항/확인필요)")
    position: int = Field(..., description="문제가 발견된 위치 (문자 인덱스)")
    length: int = Field(..., description="문제가 있는 텍스트 길이")
    original_text: str = Field(..., description="원본 텍스트")
    suggestion: Optional[str] = Field(None, description="수정 제안")
    reason: str = Field(..., description="문제 사유")
    source: str = Field(default="llm", description="검열 소스 (rule_based: 1차 규칙 기반, llm: 2차 LLM)")


class ContentFilterResponse(BaseModel):
    """세특 검열 응답 모델"""
    filtered_content: str = Field(..., description="검열된 내용")
    issues: List[FilterIssue] = Field(default_factory=list, description="발견된 이슈 목록")
    total_issues: int = Field(default=0, description="총 이슈 개수")
    byte_count: int = Field(..., description="현재 바이트 수")
    max_bytes: int = Field(default=2000, description="최대 바이트 수")


def _clean_json_text(text: str) -> str:
    """JSON 텍스트를 정리합니다 (단일 따옴표를 큰따옴표로 변경 등)"""
    cleaned = text
    # 속성명: 'key' -> "key" 또는 key: -> "key":
    cleaned = re.sub(r"(\{|,)\s*'([^']+)'\s*:", r'\1"\2":', cleaned)
    # 따옴표 없는 속성명: key: -> "key":
    cleaned = re.sub(r"(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:", r'\1"\2":', cleaned)
    # 문자열 값: 'value' -> "value"
    cleaned = re.sub(r":\s*'([^']*)'\s*([,}\]])", r': "\1"\2', cleaned)
    # 불필요한 쉼표 제거
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*]', ']', cleaned)
    return cleaned


def _extract_json_object(text: str) -> Optional[str]:
    """텍스트에서 첫 번째 JSON 객체를 추출합니다"""
    first_brace_pos = text.find('{')
    if first_brace_pos == -1:
        return None
    
    brace_count = 0
    for i in range(first_brace_pos, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                return text[first_brace_pos:i + 1]
    return None


def _extract_issues_array(text: str) -> List[Dict]:
    """텍스트에서 issues 배열을 추출합니다"""
    issues_list = []
    issues_start = text.find('"issues"')
    if issues_start == -1:
        return issues_list
    
    bracket_start = text.find('[', issues_start)
    if bracket_start == -1:
        return issues_list
    
    # 닫는 괄호 찾기
    bracket_count = 0
    bracket_end = bracket_start
    for i in range(bracket_start, min(len(text), bracket_start + 50000)):
        if text[i] == '[':
            bracket_count += 1
        elif text[i] == ']':
            bracket_count -= 1
            if bracket_count == 0:
                bracket_end = i
                break
    
    if bracket_end <= bracket_start:
        return issues_list
    
    issues_text = text[bracket_start + 1:bracket_end]
    # 각 issue 객체 추출
    issue_start = -1
    brace_count = 0
    current_issue = ""
    
    for char in issues_text:
        if char == '{':
            if brace_count == 0:
                issue_start = 0
                current_issue = ""
            brace_count += 1
            current_issue += char
        elif char == '}':
            brace_count -= 1
            current_issue += char
            if brace_count == 0 and issue_start != -1:
                try:
                    issue_obj = json.loads(current_issue)
                    if not issue_obj.get("reason"):
                        issue_obj["reason"] = "문제 발견"
                    issues_list.append(issue_obj)
                except Exception:
                    pass
                issue_start = -1
                current_issue = ""
        else:
            if brace_count > 0:
                current_issue += char
    
    return issues_list


def _extract_filtered_content(text: str, fallback: str) -> str:
    """텍스트에서 filtered_content 값을 추출합니다"""
    filtered_pattern = r'"filtered_content"\s*:\s*"((?:[^"\\]|\\.)*)"'
    filtered_match = re.search(filtered_pattern, text)
    
    if not filtered_match:
        return fallback
    
    try:
        filtered_json_str = '{' + filtered_match.group(0) + '}'
        filtered_obj = json.loads(filtered_json_str)
        return filtered_obj.get("filtered_content", fallback)
    except Exception:
        try:
            filtered_value = filtered_match.group(1)
            return codecs.decode(filtered_value, 'unicode_escape')
        except Exception:
            return filtered_match.group(1).replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')


def _parse_json_with_recovery(response_text: str, fallback_content: str) -> Dict:
    """
    JSON 파싱을 시도하고, 실패 시 여러 복구 방법을 시도합니다.
    
    Args:
        response_text: 파싱할 JSON 텍스트
        fallback_content: 파싱 실패 시 사용할 기본 내용
        
    Returns:
        Dict: 파싱된 JSON 객체
    """
    # 1. 기본 파싱 시도
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # 2. 마크다운 코드 블록 제거 후 재시도
    cleaned_text = response_text.strip()
    if cleaned_text.startswith("```"):
        cleaned_text = cleaned_text.split("```", 1)[1]
        if cleaned_text.startswith("json"):
            cleaned_text = cleaned_text[4:].strip()
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text.rsplit("```", 1)[0].strip()
    
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        pass
    
    # 3. JSON 정리 후 재시도
    try:
        cleaned_json = _clean_json_text(cleaned_text)
        json_obj = _extract_json_object(cleaned_json)
        if json_obj:
            return json.loads(json_obj)
    except Exception:
        pass
    
    # 4. 부분 파싱 (filtered_content와 issues만 추출)
    try:
        filtered_content = _extract_filtered_content(cleaned_text, fallback_content)
        issues_list = _extract_issues_array(cleaned_text)
        return {
            "filtered_content": filtered_content,
            "issues": issues_list
        }
    except Exception:
        pass
    
    # 5. 모든 시도 실패 시 기본값 반환
    logger.warning("JSON 파싱 복구 실패, 기본값 반환")
    return {
        "filtered_content": fallback_content,
        "issues": []
    }


async def call_chatgpt_for_filtering(content: str, max_bytes: int = 2000) -> ContentFilterResponse:
    """
    ChatGPT API를 호출하여 세특 내용을 검열합니다.
    LLM 호출 전에 1차 규칙 기반 필터를 적용합니다.
    
    Args:
        content: 검열할 세특 내용
        max_bytes: 최대 바이트 수
        
    Returns:
        ContentFilterResponse: 검열 결과
    """
    import logging
    import sys
    import traceback
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    # 콘솔 핸들러 추가 (터미널에 로그 출력)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)
    
    # OpenAI API 키 확인
    if not OPENAI_API_KEY or not OPENAI_API_KEY.strip():
        logger.error("OpenAI API 키가 설정되지 않았습니다.")
        raise HTTPException(
            status_code=500,
            detail="OpenAI API 키가 설정되지 않았습니다. 환경변수 OPENAI_API_KEY를 설정하세요."
        )
    
    # 키 형식 검증
    if not (OPENAI_API_KEY.startswith("sk-") or OPENAI_API_KEY.startswith("sk-proj-")):
        logger.error(f"OpenAI API 키 형식이 올바르지 않습니다. (현재 시작: '{OPENAI_API_KEY[:15]}...')")
        raise HTTPException(
            status_code=500,
            detail="OpenAI API 키 형식이 올바르지 않습니다. 키는 sk- 또는 sk-proj-로 시작해야 합니다."
        )
    
    logger.debug(f"OpenAI API 키 검증 완료 (길이: {len(OPENAI_API_KEY)})")
    
    # 바이트 수 확인
    byte_count = len(content.encode('utf-8'))
    if byte_count > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"내용이 최대 바이트 수({max_bytes}바이트)를 초과했습니다. 현재: {byte_count}바이트"
        )
    
    # 1. 1차 규칙 기반 필터 호출
    raw_detections = []
    try:
        rule_filter_result = rule_based_filter(content)
        # 필터가 찾은 단어 목록 (위치 정보는 무시하고 '어떤 단어'가 걸렸는지만 사용)
        raw_detections = rule_filter_result.get("detections", [])
        pre_filtered_content = rule_filter_result.get("filtered_text", content)
    except Exception as e:
        logger.warning(f"1차 규칙 기반 필터 적용 중 오류 발생: {e}")
        raw_detections = []
        pre_filtered_content = content
    
    
    # 2. 원본 텍스트 재스캔 (Re-scanning)
    # 1차 필터가 찾아낸 단어들을 키워드로 해서, 원본 텍스트 내의 '모든' 등장 위치를 다시 찾습니다.
    # [수정된 로직 시작] ============================================================
    
    all_matches = []
    
    # 중복 단어 제거 (예: 1차 필터가 '대회'를 3번 리턴해도 단어는 '대회' 하나로 취급)
    # 단어별 메타데이터(대체어, 카테고리 등)를 저장
    # 순서 고정: 같은 단어가 여러 번 나와도 일관된 순서 보장
    detected_words_sorted = sorted(raw_detections, key=lambda x: (x.get("word", ""), x.get("position", 0)))
    detected_words_map = {d.get("word"): d for d in detected_words_sorted if d.get("word")}
    
    # [디버깅용] 1차 필터가 감지한 단어 로그 출력
    logger.info(f"1차 필터 감지 단어 목록: {list(detected_words_map.keys())}")
    
    for word, info in detected_words_map.items():
        if not word:
            continue
        
        # [중요] re.escape만 사용하여 특수문자 처리 (단어 경계 \b 사용 안 함 -> 포함된 모든 단어 검출)
        # 이렇게 하면 "서울대학교" 안의 "서울대"도 잡히고, "서울대," 도 잡힘.
        # 단어 경계 없이 단순 포함 여부 체크 (특수기호/문장 부호 무시)
        escaped_word = re.escape(word)
        
        # [중요] re.finditer로 원본 텍스트 전체를 스캔하여 모든 위치 검출
        # 단어 경계(\b) 없이 단순 포함 여부만 체크하므로, 같은 단어가 여러 번 나와도 모두 검출됨
        word_positions = []
        for match in re.finditer(escaped_word, content):
            word_positions.append(match.start())
            all_matches.append({
                "word": word,
                "start": match.start(),
                "end": match.end(),
                "length": match.end() - match.start(),
                "replacement": info.get("replacement", ""),
                "category": info.get("category", "금지어")
            })
        
        # 디버깅: 같은 단어가 여러 번 검출된 경우 로그 출력
        if len(word_positions) > 1:
            logger.info(f"단어 '{word}'가 {len(word_positions)}번 검출됨 (위치: {word_positions})")
    
    # 3. 포함 관계 정리 (Longest Match Wins)
    # 예: "서울대학교"와 "서울대"가 같이 잡혔을 때, "서울대학교" 안에 있는 "서울대"는 제거
    
    # 시작 위치 순, 그리고 길이 긴 순(내림차순)으로 정렬
    all_matches.sort(key=lambda x: (x['start'], -x['length']))
    
    final_rule_detections = []
    last_end = -1
    
    for match in all_matches:
        # 현재 단어의 시작점이 이전 단어의 끝점보다 뒤에 있어야 함 (겹치지 않음)
        # 또는 완전히 겹치더라도 더 긴 단어를 이미 처리했으므로 건너뜀
        if match['start'] >= last_end:
            final_rule_detections.append(match)
            last_end = match['end']  # 끝 위치 갱신
        else:
            # 겹치는 경우 (이미 더 긴 단어가 등록됨), 로그만 남기고 스킵
            logger.debug(f"중복/포함된 단어 제외됨: {match['word']} (위치: {match['start']})")
    
    # rule_detections 변수를 재정의 (이후 로직에서 사용됨)
    rule_detections = []
    for match in final_rule_detections:
        rule_detections.append({
            "word": match['word'],
            "replacement": match['replacement'],
            "position": match['start'],
            "category": match['category']
        })
    
    if rule_detections:
        logger.info(f"재스캔 완료: 총 {len(rule_detections)}개의 이슈 확정")
    
    # 1차 필터링된 텍스트를 LLM에 전달 (사실상 문맥 파악용이므로 원본에 가까운게 좋지만, 규칙 필터가 masking한 건 제외)
    content_to_check = pre_filtered_content
    # [수정된 로직 끝] ==============================================================

    # [최적화] LLM 캐시 확인
    # Content가 동일하다면, LLM의 응답도 동일할 것으로 가정 (custom rule 변경은 위 rule_based_filter에서 처리됨)
    # 키는 원본 content의 해시값 사용
    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
    
    # response_text 초기화 (UnboundLocalError 방지)
    response_text = None
    
    cached_response_text = _llm_cache.get(content_hash)
    if cached_response_text:
        logger.info(f"✨ LLM 캐시 Hit! (Hash: {content_hash}) - OpenAI 호출 생략")
        response_text = cached_response_text
        
        # [중요 Fix] 캐시된 응답의 filtered_content는 "과거의 규칙" 기준임.
        # "현재의 규칙"을 반영하려면, 캐시된 텍스트(LLM이 다듬은 문장)에 대해 다시 한번 규칙 필터를 적용해야 함.
        # 이렇게 해야 '인공지능'을 금지어로 추가했을 때, 왼쪽 교정 문서에서도 'XXX'로 마스킹되어 보임.
        try:
            # 1. 캐시된 JSON 파싱
            cached_json = _parse_json_with_recovery(response_text, content_to_check)
            cached_content = cached_json.get("filtered_content", "")
            
            if cached_content:
                # 2. 현재 규칙으로 다시 필터링 (단순 치환)
                # 여기서는 detections는 필요없고, 텍스트 치환(masking)만 필요함.
                re_filtered = rule_based_filter(cached_content)
                final_filtered_content = re_filtered.get("filtered_text", cached_content)
                
                # 3. JSON의 filtered_content 교체
                cached_json["filtered_content"] = final_filtered_content
                
                # 4. response_text 업데이트 (문자열로 다시 변환)
                response_text = json.dumps(cached_json, ensure_ascii=False)
                logger.info("캐시된 컨텐츠에 새로운 필터 규칙 적용 완료 (Re-filtering Cache)")
        except Exception as e:
            logger.warning(f"캐시된 컨텐츠 재필터링 실패 (기존 캐시 사용): {e}")
            # 실패하면 그냥 원래 cached_response_text 사용
            response_text = cached_response_text

    # 캐시가 없으면 OpenAI 호출 (Indentation Fix)
    if not response_text:
        logger.info(f"LLM 캐시 Miss (Hash: {content_hash}) - OpenAI 호출 시작")
        
        # ChatGPT에 전달할 프롬프트 작성 (2025 기재요령 PDF 기준 보강)
        system_prompt = """당신은 2025학년도 학교생활기록부 기재요령 전문가입니다.

학교생활기록부 기재요령(교육부훈령)에 따라 다음 내용을 엄격하게 검열해야 합니다.

**단, 맞춤법이나 띄어쓰기 오류는 검사하지 마십시오. 오직 기재 금지 위반 사항만 찾아내십시오.**

【분석 기준 및 심각도 분류】

1. CRITICAL (삭제 필수 - 빨간색 경고):
   - [대회/수상] 교내·외 대회 명칭, 우승/수상 실적, 입상 내역 일체.
   - [인증/자격] 공인어학시험, 각종 사설 인증시험 및 자격증 명칭.
   - [기관/상호/브랜드] 구체적인 기업명(삼성, 나이키 등), 특정 앱/사이트명(유튜브, 인바디 등), 사설 학원명.
   - [논문/도서] 논문 투고, 논문 발표(학술지/학회에서의 논문 발표만 해당, 일반 수업 발표는 허용), 도서 출간, 지식재산권 출원.
   - [신상/기부] 부모의 사회·경제적 지위 암시, 해외 어학연수, 기부(금품) 관련 내용.
   - [사교육] 사설 강사명, 사교육 의존 내용.

2. MODIFY (수정 권장 - 노란색 경고):
   - [교내 행사] '대회'라는 용어는 사용할 수 없으므로, 교내 행사의 경우 '행사', '축제', '발표회' 등으로 순화 제안.
   - [단순 나열] 구체적 변화 없이 활동 실적만 나열한 경우.

【분석 절차 (Chain-of-Thought)】
1단계: 원본 텍스트를 처음부터 끝까지 순차적으로 읽으면서 금지어를 찾습니다.
2단계: 찾은 각 금지어에 대해:
   - 정확한 위치(position) 계산
   - 정확한 길이(length) 계산
   - 원본 텍스트에서 추출하여 original_text 확인
   - 타입 결정 (delete 또는 modify)
3단계: 모든 이슈를 position 순서로 정렬
4단계: 중복 제거 및 검증

【위치 정보 계산 방법 - 매우 중요】
1. 원본 텍스트를 처음부터 끝까지 순차적으로 읽으세요.
2. 각 문자에 대해 0부터 시작하는 인덱스를 부여하세요.
3. 찾은 텍스트의 첫 번째 문자의 인덱스가 position입니다.
4. 찾은 텍스트의 문자 수가 length입니다.
5. **중요: 작은따옴표(')나 큰따옴표(")가 포함된 경우, 따옴표도 포함하여 계산하세요.**
6. 예: "안녕하세요"에서 "하세요"를 찾으면
   - position: 2 (안=0, 녕=1, 하=2)
   - length: 3 ("하세요"의 문자 수)
   - original_text: "하세요"
7. 예: "생명과학 실험에 흥미를 느껴 **'KAIST'** 영재교육원"에서 'KAIST'를 찾으면
   - position: 작은따옴표(')의 위치부터 시작
   - length: 작은따옴표 포함 7자 ('KAIST')
   - original_text: "'KAIST'"
8. **검증: 계산한 position과 length로 원본 텍스트에서 추출한 텍스트가 original_text와 정확히 일치해야 합니다.**

【검증 규칙】
- position + length가 원본 텍스트 길이를 초과하면 안 됩니다.
- original_text는 원본 텍스트[position:position+length]와 정확히 일치해야 합니다.
- 같은 위치의 중복 이슈는 제거하세요.

【응답 형식】

반드시 JSON 형식으로 응답해야 합니다. 다음 JSON 구조를 따라주세요:

{
  "filtered_content": "금지어가 삭제되거나 순화된 텍스트 (맞춤법 수정 없음)",
  "issues": [
    {
      "type": "delete|modify", 
      "severity": "critical|warning",
      "position": 0,
      "length": 0,
      "original_text": "원본 텍스트",
      "suggestion": "수정 제안 (delete일 경우 null)",
      "reason": "구체적인 위반 사유"
    }
  ]
}

【학습 예시 (Few-Shot Examples)】

[예시 1: 체육/건강 분야 (브랜드, 앱, 대회)]
입력: "교내 '축구 대회'에 학급 대표로 출전하여 주장으로서 팀을 이끌고 결승전에서 '우승'하는 데 기여했으며, '최우수 선수상'을 받음. 체력 증진을 위해 '나이키 런 클럽' 어플리케이션을 활용하고, 교외 '아디다스 마이런 마라톤'에 참여함. '유튜브' 헬스 채널을 구독하고 '인바디' 검사 결과를 분석함."
출력:
{
  "filtered_content": "교내 축구 경기에 학급 대표로 출전하여 주장으로서 팀을 이끌고 좋은 결과를 얻는 데 기여함. 체력 증진을 위해 달리기 기록 측정 어플리케이션을 활용하고, 교외 마라톤 행사에 참여함. 운동 관련 영상 채널을 구독하고 체성분 검사 결과를 분석함.",
  "issues": [
    { "type": "modify", "severity": "warning", "position": 4, "length": 5, "original_text": "'축구 대회'", "suggestion": "축구 경기", "reason": "교내 행사 명칭에 '대회'는 사용할 수 없으므로 순화해야 합니다." },
    { "type": "delete", "severity": "critical", "position": 39, "length": 4, "original_text": "'우승'", "reason": "대회 승패 및 수상 결과는 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 60, "length": 9, "original_text": "'최우수 선수상'", "reason": "수상 실적은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 87, "length": 10, "original_text": "'나이키 런 클럽'", "reason": "특정 사설 앱/브랜드 명칭은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 113, "length": 13, "original_text": "'아디다스 마이런 마라톤'", "reason": "특정 브랜드가 포함된 교외 행사명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 135, "length": 5, "original_text": "'유튜브'", "reason": "특정 미디어 플랫폼 명칭은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 154, "length": 5, "original_text": "'인바디'", "reason": "특정 상호명/제품명은 기재할 수 없습니다." }
  ]
}

[예시 2: 음악/예술 분야 (플랫폼, 사교육, 수상)]
입력: "자작곡을 '사운드클라우드'에 업로드하고, '큐베이스'와 '로직 프로'를 활용하여 미디 음원을 제작함. 교내 '합창 경연 대회'에서 지휘를 맡아 '금상'을 수상함. '멜론' 차트를 분석하고 방과 후에는 '실용음악학원'에서 보컬 트레이닝을 받음."
출력:
{
  "filtered_content": "자작곡을 음원 공유 플랫폼에 업로드하고, 작곡 프로그램을 활용하여 미디 음원을 제작함. 교내 합창제에서 지휘를 맡아 조화로운 화음을 이끌어냄. 대중음악 차트를 분석하고 방과 후에는 보컬 연습을 꾸준히 함.",
  "issues": [
    { "type": "delete", "severity": "critical", "position": 6, "length": 9, "original_text": "'사운드클라우드'", "reason": "특정 플랫폼 명칭은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 22, "length": 6, "original_text": "'큐베이스'", "reason": "특정 소프트웨어/상호명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 31, "length": 7, "original_text": "'로직 프로'", "reason": "특정 소프트웨어/상호명은 기재할 수 없습니다." },
    { "type": "modify", "severity": "warning", "position": 62, "length": 9, "original_text": "'합창 경연 대회'", "suggestion": "합창제", "reason": "교내 행사 명칭에 '대회'는 사용할 수 없으므로 순화해야 합니다." },
    { "type": "delete", "severity": "critical", "position": 83, "length": 4, "original_text": "'금상'", "reason": "수상 실적은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 95, "length": 4, "original_text": "'멜론'", "reason": "특정 서비스/상호명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 113, "length": 8, "original_text": "'실용음악학원'", "reason": "사교육 의존 내용을 암시하는 기관명은 기재할 수 없습니다." }
  ]
}

[예시 3: 미술/디자인 분야 (제품명, 대학명, 특정인물)]
입력: "수업 시간에 '아이패드'와 '프로크리에이트' 앱을 활용함. '홍익대학교' 진학을 목표로 하며, 교내 '사생 대회'에서 '대상'을 받음. 주말에 '리움미술관'을 방문하고 유명 웹툰 작가 '기안84'의 작품 세계를 탐구함."
출력:
{
  "filtered_content": "수업 시간에 태블릿PC와 드로잉 앱을 활용함. 미대 진학을 목표로 하며, 교내 사생 행사에 참가하여 우수한 실력을 보임. 주말에 미술관을 방문하고 유명 작가의 작품 세계를 탐구함.",
  "issues": [
    { "type": "delete", "severity": "critical", "position": 8, "length": 6, "original_text": "'아이패드'", "reason": "특정 제품명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 17, "length": 9, "original_text": "'프로크리에이트'", "reason": "특정 앱/소프트웨어 명칭은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 34, "length": 7, "original_text": "'홍익대학교'", "reason": "특정 대학명은 기재할 수 없습니다." },
    { "type": "modify", "severity": "warning", "position": 56, "length": 7, "original_text": "'사생 대회'", "suggestion": "사생 행사", "reason": "교내 행사 명칭에 '대회'는 사용할 수 없으므로 순화해야 합니다." },
    { "type": "delete", "severity": "critical", "position": 67, "length": 4, "original_text": "'대상'", "reason": "수상 실적은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 82, "length": 7, "original_text": "'리움미술관'", "reason": "사설 기관/미술관 명칭은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 106, "length": 6, "original_text": "'기안84'", "reason": "특정 연예인/유명인 언급은 교육적 맥락 외에는 지양해야 합니다." }
  ]
}

[예시 4: 학교생활/봉사 (상호명, 기부, 외부대회, 연예인)]
입력: "축제 때 '당근마켓'을 모티브로 장터를 기획하고 수익금을 '월드비전'에 '기부'함. '다이소'에서 물품을 구매함. 교내 'e-스포츠 대회'를 주최하여 '리그 오브 레전드' 경기를 진행하고 학급이 '종합 우승'을 차지함. 장기자랑에서 '뉴진스'의 안무를 소화함."
출력:
{
  "filtered_content": "축제 때 중고 거래 플랫폼을 모티브로 장터를 기획하고 수익금으로 나눔을 실천함. 인근 상점에서 물품을 구매함. 교내 e-스포츠 행사를 주최하여 게임 경기를 진행하고 학급의 단합을 도모함. 장기자랑에서 최신 가요 안무를 소화함.",
  "issues": [
    { "type": "delete", "severity": "critical", "position": 6, "length": 6, "original_text": "'당근마켓'", "reason": "특정 서비스/플랫폼 명칭은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 31, "length": 6, "original_text": "'월드비전'", "reason": "특정 단체명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 40, "length": 4, "original_text": "'기부'", "reason": "기부/모금 관련 활동은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 49, "length": 5, "original_text": "'다이소'", "reason": "특정 상호명은 기재할 수 없습니다." },
    { "type": "modify", "severity": "warning", "position": 67, "length": 10, "original_text": "'e-스포츠 대회'", "suggestion": "e-스포츠 행사", "reason": "교내 행사 명칭에 '대회'는 사용할 수 없으므로 순화해야 합니다." },
    { "type": "delete", "severity": "critical", "position": 89, "length": 10, "original_text": "'리그 오브 레전드'", "reason": "특정 게임/상호명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 115, "length": 7, "original_text": "'종합 우승'", "reason": "수상 실적 및 승패 결과는 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 136, "length": 5, "original_text": "'뉴진스'", "reason": "특정 연예인/그룹명 언급은 지양해야 합니다." }
  ]
}

[예시 5: 과학 분야 (특수기호, 상호명)]
입력: "생명과학 실험에 흥미를 느껴 심화 탐구를 수행함. 유전자 가위 기술인 CRISPR-Cas9을 주제로 탐구 활동을 진행함. 실험 과정에서 '써모피셔사이언티픽'사의 정밀 현미경을 사용하여 세포 분열 과정을 관찰하고 사진으로 기록함. 평소 '네이처(Nature)'나 '사이언스(Science)' 같은 해외 저널의 기사를 스크랩하여 읽으며 최신 과학 트렌드를 파악함."
출력:
{
  "filtered_content": "생명과학 실험에 흥미를 느껴 심화 탐구를 수행함. 유전자 가위 기술인 CRISPR-Cas9을 주제로 탐구 활동을 진행함. 실험 과정에서 정밀 현미경을 사용하여 세포 분열 과정을 관찰하고 사진으로 기록함. 평소 해외 저널의 기사를 스크랩하여 읽으며 최신 과학 트렌드를 파악함.",
  "issues": [
    { "type": "delete", "severity": "critical", "position": 45, "length": 11, "original_text": "'써모피셔사이언티픽'", "reason": "특정 상호명/제품명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 72, "length": 9, "original_text": "'네이처(Nature)'", "reason": "특정 저널명은 기재할 수 없습니다." },
    { "type": "delete", "severity": "critical", "position": 84, "length": 9, "original_text": "'사이언스(Science)'", "reason": "특정 저널명은 기재할 수 없습니다." }
  ]
}
"""

    user_prompt = f"""다음 세특 내용을 검열해주세요 (최대 {max_bytes}바이트):

{content_to_check}

【검열 작업 지침 - 우선순위 순】

**1순위: 성적 및 시험 관련 (절대 금지)**
1. 모의고사·전국연합학력평가 성적이 언급되어 있는가? (모두 삭제 - 매우 중요)
   - **"모의고사", "전국연합학력평가", "학력평가" 단어 자체도 삭제 대상입니다.**
   - 원점수, 석차, 등급(1등급, 2등급, 3등급 등), 백분위(99%, 95%, 90% 등) 모두 삭제
   - 성적 관련 표현 패턴:
     * "성적을 [거둠/유지/향상/개선]"
     * "성적이 [우수/좋음/높음/향상]"
     * "[우수한/좋은/높은] 성적"
     * "성적 [유지/향상]"
     * "성적 [1등급/2등급/상위]"
   - 등급 표현 패턴:
     * "[숫자]등급" (예: "1등급", "2등급")
     * "등급 [숫자]" (예: "등급 1", "등급 2")
   - 백분위 표현 패턴:
     * "백분위 [숫자]%" (예: "백분위 99%")
     * "[숫자]% 백분위" (예: "99% 백분위")
   - 예시: "모의고사에서도 항상 1등급을 유지하며 백분위 99%의 우수한 성적을 거둠"
     → "모의고사", "1등급", "백분위 99%", "성적을 거둠" 모두 삭제 (delete, critical)
   - 예시: "전국연합학력평가에서 2등급을 받았다" → "전국연합학력평가", "2등급" 모두 삭제

2. 공인어학시험명 및 성적이 언급되어 있는가? (TOEIC, TOEFL, TEPS, HSK, JPT, JLPT, DELF, DSH, DELE 등 - 모두 삭제)
3. 한자시험이 언급되어 있는가? (한자능력검정, 실용한자, YBM 상무한검 등 - 모두 삭제)
4. 교내·외 인증시험 참여 사실이 언급되어 있는가? (있으면 삭제)
5. 자격증 명칭이 있는가? (있으면 삭제, 단 '자격증 취득' 항목란 제외)

**2순위: 대회 및 수상 관련**
6. 교내·외 대회 명칭 및 수상 실적이 언급되어 있는가?
   - 교내 행사: "대회" → "행사"/"축제"로 순화 (modify, warning)
     * 예: "체육대회" → "체육행사" 또는 "체육한마당"
     * 예: "합창대회" → "합창제"
   - 교외 대회나 경시대회: 삭제 (delete, critical)
     - 우승, 수상, 입상 등 모든 수상 실적: 삭제 (delete, critical)
     - **'~상' 패턴의 모든 수상 명칭: 삭제 (delete, critical)**
       * 예: '응원상', '장려상', '우수상', '최우수상', '대상', '금상', '은상', '동상', '공로상', '참가상' 등
       * **중요: '~상'으로 끝나는 모든 수상 관련 표현을 반드시 검출하세요.**
       * 예: '응원상을 받음' → '응원상' 삭제
       * 예: '장려상을 수상함' → '장려상' 삭제
       * 예: '우수상을 받았음' → '우수상' 삭제
     - 교외 기관·단체(장) 수상 실적: 표창장, 감사장, 공로상 등 모두 삭제
     - 주의: "대전"이라는 단어는 "대회"가 아니므로 검출하지 마세요.
   - 주의: "국제 청소년 과학 창의 대전"과 같은 대회명에서 "국제"만 단독으로 검출하지 마세요.

**3순위: 기관 및 브랜드 관련**
7. 상호명/회사명이 언급되어 있는가? (삼성, 애플, 구글, 유튜브, 틱톡, TED, 넷플릭스 등 - 모두 삭제)
8. 특정 앱/사이트명이 언급되어 있는가? (인바디, 멜론, 당근마켓, 사운드클라우드 등 - 모두 삭제)

**4순위: 기타 금지 사항**
9. 논문 발표 관련 내용이 있는가? (학술지/학회에서의 논문 발표만 해당 - 모두 삭제)
   - **중요: "발표"라는 단어 자체는 검열하지 마세요.**
   - ✅ 검열해야 함: "논문을 발표함", "학술지에 발표", "학회에서 발표", "논문을 학회에서 발표함"
   - ❌ 검열하지 말 것: "영어 에세이를 작성해서 발표함", "수업 시간에 발표", "프로젝트 발표", "발표회", "수업 발표", "과제 발표"
   - 문맥을 정확히 파악하여 논문/학술 맥락에서의 발표만 검열하세요.
10. 특수기호가 있는가? (작은따옴표, 큰따옴표 등 - 모두 삭제)
   - 작은따옴표(''), 큰따옴표("), 가운뎃점(·) 등 특수기호 삭제
   - 예: "'KAIST'" → "'" (작은따옴표) 삭제
   - 예: "네이처(Nature)" → "(" 삭제
   - 주의: 특수기호만 단독으로 검출하지 말고, 특수기호가 포함된 전체 표현을 검출하세요
11. 도서출간 사실이 언급되어 있는가? (있으면 삭제)
12. 지식재산권 관련 내용이 있는가? (특허, 실용신안, 상표, 디자인 등 출원 또는 등록 사실 - 모두 삭제)
13. 부모(친인척 포함)의 사회·경제적 지위 암시 내용이 있는가? (직종명, 직업명, 직장명, 직위명 등 - 모두 삭제)
14. 해외 활동 실적이 언급되어 있는가? (어학연수, 해외 봉사활동 등 - 모두 삭제)
    - **매우 중요: 반드시 검출해야 합니다. "어학연수"라는 단어가 있으면 무조건 검출하세요.**
    - **중요: 전체 구문을 잡아내세요. 단어만 잡지 마세요.**
    - "필리핀 어학연수", "미국 어학연수", "해외 어학연수" 등 모든 어학연수 관련 표현을 검출하세요.
    - "필리핀"이라는 단어가 "어학연수"와 함께 나오면, "필리핀 어학연수" 전체를 잡으세요.
    - ✅ 올바른 예: 
      * "필리핀 어학연수" → 전체를 잡으세요.
      * "미국 어학연수" → 전체를 잡으세요.
      * "해외 어학연수" → 전체를 잡으세요.
      * "필리핀에서 어학연수" → 전체를 잡으세요.
      * "필리핀 어학연수를 다녀옴" → 전체를 잡으세요.
      * "여름방학 동안 '필리핀' 어학연수를 다녀온 경험" → "'필리핀' 어학연수" 또는 "'필리핀 어학연수'" 전체를 잡으세요.
    - ❌ 잘못된 예: "필리핀"만 잡기 (어학연수와 함께 나오지 않은 경우는 제외)
    - 패턴: "[국가명] 어학연수", "[국가명]에서 어학연수", "해외 어학연수", "[국가명] 봉사활동" 등 전체 구문을 잡으세요.
15. 장학생, 장학금 관련 내용이 있는가? (있으면 삭제)
16. 특정 강사명이 언급되어 있는가? (있으면 삭제)
17. 기부 관련 내용이 있는가? (있으면 삭제)
18. 사교육 의존 내용이 있는가? (사설 학원명, 사교육 관련 표현 등 - 모두 삭제)

**주의사항**
- 대학명, 기관명, 영재교육원, 논문 관련(소논문, 학술지, 투고, 등재), 학회명/협회명, 어학연수는 1차 규칙 기반 필터에서 이미 검출되므로 LLM에서는 검출하지 않아도 됩니다.
- 논문 발표는 문맥 판단이 필요하므로 LLM에서 검출해야 합니다 (일반 발표는 허용, 논문/학술 맥락의 발표만 검열).
- 해외 활동 실적(어학연수, 해외 봉사활동)은 1차 규칙 기반 필터에서 기본 검출되지만, LLM은 더 긴 구문이나 복합적인 표현을 찾아야 합니다 (예: "필리핀 어학연수를 다녀온 경험" 전체).
- LLM은 1차 규칙 기반 필터에서 놓친 복합적인 맥락이나 문맥적 위반 사항을 찾는 데 집중하세요.

【주의사항】
- 원본 텍스트를 문자 단위로 정확히 분석하여 position과 length를 정확히 계산하세요.
- original_text는 원본 텍스트에서 발견된 정확한 텍스트여야 합니다 (공백 포함).
- suggestion은 modify 타입일 경우 반드시 제공해야 합니다 (delete일 경우 null).
- issues 배열은 position 순서대로 정렬해야 합니다.
- 각 문제마다 정확한 위치 정보를 제공해야 합니다.
- **맞춤법이나 띄어쓰기 오류는 검사하지 마십시오. 오직 기재 금지 위반 사항만 찾아내십시오.**"""

    try:
        # OpenAI API 호출 (chat completions 사용)
        from openai import OpenAI
        
        # OpenAI 클라이언트 초기화
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # 사용할 모델 결정 (파인튜닝된 모델이 있으면 사용, 없으면 기본 모델)
        model_to_use = OPENAI_MODEL
        logger.debug(f"사용할 모델: {model_to_use}")
        
        response = client.chat.completions.create(
            model=model_to_use,  # 파인튜닝된 모델 또는 기본 모델
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0,
            top_p=0.1,  # 높은 확률 토큰만 선택하여 일관성 향상
            presence_penalty=0.1,  # 반복 방지
            frequency_penalty=0.1,  # 중복 방지
            response_format={"type": "json_object"}
        )
        
        # 토큰 사용량 로깅 (디버그 레벨)
        if hasattr(response, 'usage') and response.usage:
            usage = response.usage
            logger.debug(f"토큰 사용량 - 입력: {usage.prompt_tokens}, 출력: {usage.completion_tokens}, 총: {usage.total_tokens}")
        
        response_text = response.choices[0].message.content
        
        # [최적화] 캐시에 저장
        _llm_cache[content_hash] = response_text
        logger.info(f"LLM 응답 캐시 저장 완료 (Keys: {len(_llm_cache)})")
        
        # 응답 전체를 파일로 저장 (디버깅용)
        try:
            debug_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "debug")
            os.makedirs(debug_dir, exist_ok=True)
            timestamp = int(time.time())
            debug_file = os.path.join(debug_dir, f"chatgpt_response_{timestamp}.json")
            with open(debug_file, 'w', encoding='utf-8') as f:
                f.write(response_text)
            logger.info(f"ChatGPT 응답을 파일로 저장: {debug_file}")
        except Exception as debug_error:
            logger.warning(f"디버그 파일 저장 실패 (무시): {debug_error}")
        
        # JSON 파싱 (복구 로직 포함)
        result = _parse_json_with_recovery(response_text, content_to_check)
        
        # 응답 검증 및 변환
        filtered_content = result.get("filtered_content", content_to_check)
        issues_data = result.get("issues", [])
        
        # [수정된 로직] 1차(규칙 기반) 결과를 우선하여 먼저 추가
        rule_based_issues = []
        logger.debug(f"규칙 기반 필터 결과 {len(rule_detections)}개를 issues로 변환 중...")
        
        for rule_det in rule_detections:
            rule_word = rule_det.get("word", "")
            rule_position = rule_det.get("position", 0)
            rule_category = rule_det.get("category", "")
            
            # 위치가 범위를 벗어나지 않는지 확인
            if rule_position >= len(content):
                logger.warning(f"위치 범위 초과: 위치 {rule_position}는 텍스트 길이 {len(content)}를 초과함")
                continue
            
            # 위치에서 단어 길이만큼 추출하여 비교 (검증)
            extracted_text = content[rule_position:rule_position+len(rule_word)]
            
            # 텍스트가 일치하는지 확인
            if extracted_text != rule_word:
                logger.warning(f"위치 불일치: 위치 {rule_position}에서 예상 '{rule_word}' 실제 '{extracted_text}'")
                continue
            
            # 1차 필터 결과를 issue로 추가
            rule_replacement = rule_det.get("replacement", "")
            
            # 교내 행사 순화는 modify 타입으로 처리
            if rule_category == "교내행사순화":
                issue = FilterIssue(
                    type="modify",
                    severity="warning",
                    position=rule_position,
                    length=len(rule_word),
                    original_text=rule_word,
                    suggestion=rule_replacement,
                    reason=f"교내 행사 명칭 순화 필요: '{rule_word}'를 '{rule_replacement}'로 수정 권장",
                    source="rule_based"  # 1차 검열
                )
            else:
                # USER_DEFINED 카테고리는 "사용자 기반 금지어"로 표시
                if rule_category == "USER_DEFINED":
                    reason_text = "사용자 기반 금지어"
                else:
                    reason_text = f"규칙 기반 필터: {rule_category} 카테고리의 금지어"
                
                issue = FilterIssue(
                    type="delete",  # 1차 필터는 삭제 타입으로 (X로 치환하기 위해)
                    severity="critical",  # 규칙 기반 필터는 모두 critical
                    position=rule_position,
                    length=len(rule_word),
                    original_text=rule_word,
                    suggestion=None,  # suggestion 제거 (X로 치환할 것이므로)
                    reason=reason_text,
                    source="rule_based"  # 1차 검열
                )
            rule_based_issues.append(issue)
            logger.debug(f"규칙 기반 필터 결과 추가: '{rule_word}' 위치 {rule_position} (타입: {issue.type}, 심각도: {issue.severity})")
        
        # [수정된 로직] 1차 결과를 final_issues에 먼저 추가
        final_issues = rule_based_issues.copy()
        
        # [수정된 로직] 2차(LLM) 결과 처리: 더 넓은 범위나 다른 타입이면 포함
        logger.debug(f"LLM 결과 {len(issues_data)}개를 처리 중... (더 넓은 범위나 다른 타입이면 포함)")
        
        # LLM 결과를 먼저 모두 파싱
        llm_issues_parsed = []
        for issue_data in issues_data:
            # reason 필드가 None이거나 빈 문자열일 경우 기본값 사용
            reason_value = issue_data.get("reason")
            if not reason_value or reason_value is None:
                reason_value = "문제 발견"
            
            # severity 필드 파싱 (기본값: critical)
            severity_value = issue_data.get("severity", "critical")
            if severity_value not in ["critical", "warning"]:
                # type에 따라 기본 severity 설정
                if issue_data.get("type") == "delete":
                    severity_value = "critical"
                elif issue_data.get("type") == "spelling":
                    severity_value = "critical"
                else:
                    severity_value = "warning"
                
            # [검증 로직] Position 및 Length 검증
            issue_position = issue_data.get("position", 0)
            issue_length = issue_data.get("length", 0)
            issue_original_text = issue_data.get("original_text", "")
                
            # Position 범위 체크
            if issue_position < 0 or issue_position >= len(content):
                logger.warning(f"LLM 이슈 검증 실패: Invalid position {issue_position} (텍스트 길이: {len(content)})")
                continue
            
            # Length 체크
            if issue_length <= 0 or issue_position + issue_length > len(content):
                logger.warning(f"LLM 이슈 검증 실패: Invalid length {issue_length} (position: {issue_position}, 텍스트 길이: {len(content)})")
                continue
                
            # Original_text 일치 확인 및 자동 수정
            # LLM이 반환한 original_text를 우선적으로 신뢰하고, position을 재계산
            extracted_text = content[issue_position:issue_position + issue_length] if issue_position + issue_length <= len(content) else ""
                
            # original_text를 정규화 (앞뒤 공백 제거, 따옴표는 유지)
            original_text_normalized = issue_original_text.strip()
                
            # 1차: 정확히 일치하는지 확인
            if extracted_text == original_text_normalized:
                # 정확히 일치하면 그대로 사용
                issue_original_text = extracted_text
            else:
                # 불일치 시 재검색 로직
                logger.warning(f"LLM 이슈 텍스트 불일치: 예상 '{original_text_normalized}', 실제 '{extracted_text[:50] if len(extracted_text) > 50 else extracted_text}'")
                
                # 재검색을 위한 후보 텍스트 목록 (우선순위 순)
                search_candidates = []
                
                # 1순위: 원본 그대로 (따옴표 포함)
                search_candidates.append(original_text_normalized)
                
                # 2순위: 따옴표 제거 버전
                original_text_no_quotes = original_text_normalized.strip("'\"")
                if original_text_no_quotes != original_text_normalized:
                    search_candidates.append(original_text_no_quotes)
                
                # 3순위: 앞뒤 공백 제거 버전
                original_text_trimmed = original_text_normalized.strip()
                if original_text_trimmed != original_text_normalized:
                    search_candidates.append(original_text_trimmed)
                
                # 4순위: 따옴표 제거 + 공백 제거
                original_text_cleaned = original_text_no_quotes.strip()
                if original_text_cleaned not in search_candidates:
                    search_candidates.append(original_text_cleaned)
                
                # 각 후보에 대해 검색
                found_match = False
                for candidate_text in search_candidates:
                    if not candidate_text:  # 빈 문자열은 건너뛰기
                        continue
                    
                    found_positions = []
                    start_idx = 0
                    
                    # 원본 텍스트에서 모든 위치 찾기
                    while True:
                        pos = content.find(candidate_text, start_idx)
                        if pos == -1:
                            break
                        found_positions.append(pos)
                        start_idx = pos + 1
                    
                    if found_positions:
                        # 가장 가까운 위치 선택 (원래 position과 가장 가까운 위치)
                        closest_pos = min(found_positions, key=lambda x: abs(x - issue_position))
                        extracted_candidate = content[closest_pos:closest_pos + len(candidate_text)]
                        
                        if extracted_candidate == candidate_text:
                            logger.info(f"텍스트 재검색 성공: '{candidate_text}' 위치 {closest_pos}로 수정 (원래 위치: {issue_position})")
                            issue_position = closest_pos
                            issue_length = len(candidate_text)
                            issue_original_text = extracted_candidate
                            found_match = True
                            break
                
                # 모든 후보를 시도했지만 찾지 못한 경우
                if not found_match:
                    # 부분 일치 시도: original_text의 핵심 단어만 추출하여 검색
                    # 예: "서울특별시 환경정책과"를 찾지 못하면 "서울특별시"만 찾기
                    words = original_text_cleaned.split()
                    if len(words) > 1:
                        # 가장 긴 단어부터 시도
                        words_sorted = sorted(words, key=len, reverse=True)
                        for word in words_sorted:
                            if len(word) >= 2:  # 최소 2글자 이상
                                word_positions = []
                                start_idx = 0
                                while True:
                                    pos = content.find(word, start_idx)
                                    if pos == -1:
                                        break
                                    word_positions.append(pos)
                                    start_idx = pos + 1
                                
                                if word_positions:
                                    closest_pos = min(word_positions, key=lambda x: abs(x - issue_position))
                                    extracted_word = content[closest_pos:closest_pos + len(word)]
                                    if extracted_word == word:
                                        logger.warning(f"부분 일치로 재검색: '{word}' 위치 {closest_pos}로 수정 (원본 '{original_text_normalized}'는 찾지 못함)")
                                        issue_position = closest_pos
                                        issue_length = len(word)
                                        issue_original_text = extracted_word
                                        found_match = True
                                        break
                    
                    if not found_match:
                        logger.warning(f"원본 텍스트에서 '{original_text_normalized}'를 찾을 수 없음 - 이슈 제외")
                        continue
            
            llm_issue = FilterIssue(
                type=issue_data.get("type", "modify"),
                severity=severity_value,
                position=issue_position,
                length=issue_length,
                original_text=issue_original_text,
                suggestion=issue_data.get("suggestion"),
                reason=reason_value,
                source="llm"  # 2차 검열
            )
            llm_issues_parsed.append(llm_issue)
            logger.debug(f"LLM 이슈 검증 통과: '{issue_original_text}' 위치 {issue_position} (길이: {issue_length})")
        
        # LLM 결과를 처리하면서 1차 결과와 비교
        for llm_issue in llm_issues_parsed:
            llm_start = llm_issue.position
            llm_end = llm_issue.position + llm_issue.length
            
            # 1차 결과와 겹치는지 확인
            overlapping_rules = []
            for rule_issue in rule_based_issues:
                rule_start = rule_issue.position
                rule_end = rule_issue.position + rule_issue.length
                
                # 겹침 체크: 두 구간이 겹치거나 포함 관계인지 확인
                if llm_start < rule_end and llm_end > rule_start:
                    overlapping_rules.append(rule_issue)
            
            if overlapping_rules:
                # 겹치는 경우: LLM이 더 넓은 범위를 잡았거나 다른 타입이면 포함
                should_include_llm = False
                should_remove_rules = []
                
                # overlapping_rules를 position 순으로 정렬하여 결정적 순서 보장
                overlapping_rules_sorted = sorted(overlapping_rules, key=lambda x: (x.position, x.length))
                
                for rule_issue in overlapping_rules_sorted:
                    rule_start = rule_issue.position
                    rule_end = rule_issue.position + rule_issue.length
                    
                    # [중요 수정] Rule-based 이슈는 절대 제거하지 않음
                    # 사용자가 명시적으로 추가한 금지어는 반드시 표시되어야 함
                    if rule_issue.source == "rule_based":
                        logger.debug(f"Rule-based 이슈 보호: '{rule_issue.original_text}' at {rule_issue.position}")
                        # LLM 이슈가 같은 위치를 가리키면 LLM 이슈는 추가하지 않음
                        if llm_start == rule_start and llm_end == rule_end:
                            should_include_llm = False
                            break
                        # LLM이 더 넓은 범위거나 다른 타입이면 둘 다 유지
                        continue
                    
                    # 케이스 1: LLM이 spelling이나 modify 타입이면 항상 포함 (1차는 delete만)
                    if llm_issue.type in ['spelling', 'modify']:
                        should_include_llm = True
                        logger.debug(f"LLM 이슈 포함: 타입 {llm_issue.type}이므로 1차 결과와 겹쳐도 포함")
                        break  # 이미 결정되었으므로 중단
                    
                    # 케이스 2: LLM이 더 넓은 범위를 잡은 경우 (1차 결과를 포함)
                    if llm_start <= rule_start and llm_end >= rule_end:
                        should_include_llm = True
                        # Rule-based가 아닌 경우만 제거 대상에 추가
                        if rule_issue.source != "rule_based":
                            should_remove_rules.append(rule_issue)
                        logger.debug(f"LLM 이슈 포함: 더 넓은 범위 (LLM: {llm_start}-{llm_end}, 1차: {rule_start}-{rule_end})")
                        continue  # 다음 rule_issue 확인
                    
                    # 케이스 3: 1차 결과가 LLM 결과를 완전히 포함하는 경우만 제외
                    elif rule_start <= llm_start and rule_end >= llm_end:
                        # 같은 delete 타입이고 1차가 완전히 포함하면 제외
                        if llm_issue.type == 'delete':
                            logger.debug(f"LLM 이슈 제외: 1차 결과가 완전히 포함함 (1차: {rule_start}-{rule_end}, LLM: {llm_start}-{llm_end})")
                            should_include_llm = False  # 명시적으로 False 설정
                            break  # 이미 결정되었으므로 중단
                        else:
                            # 다른 타입이면 포함
                            should_include_llm = True
                            logger.debug(f"LLM 이슈 포함: 타입이 다름 (LLM: {llm_issue.type})")
                            break  # 이미 결정되었으므로 중단
                    
                    # 케이스 4: 부분적으로만 겹치는 경우 (LLM 포함)
                    else:
                        should_include_llm = True
                        logger.debug(f"LLM 이슈 포함: 부분 겹침 (LLM: {llm_start}-{llm_end}, 1차: {rule_start}-{rule_end})")
                        # break하지 않고 계속 확인 (다른 rule_issue도 확인 필요)
                
                # LLM 결과 포함
                if should_include_llm:
                    final_issues.append(llm_issue)
                    # 겹치는 1차 결과 제거 (LLM이 더 넓은 범위를 잡은 경우)
                    # [중요] Rule-based 이슈는 제거하지 않음
                    # should_remove_rules를 역순으로 제거하여 인덱스 문제 방지
                    for rule_to_remove in reversed(should_remove_rules):
                        if rule_to_remove in final_issues and rule_to_remove.source != "rule_based":
                            final_issues.remove(rule_to_remove)
                            logger.debug(f"1차 결과 제거: LLM이 더 넓은 범위를 잡음 - '{rule_to_remove.original_text}'")
            else:
                # 겹치지 않으면 추가
                final_issues.append(llm_issue)
                logger.debug(f"LLM 이슈 추가: 위치 {llm_start}-{llm_end}의 '{llm_issue.original_text}' (1차 결과와 겹치지 않음)")
        
        # 위치 순서대로 정렬
        final_issues.sort(key=lambda x: x.position)
        
        # 중복 제거: 같은 위치에서 같은 단어가 여러 번 나온 경우만 제거
        # [중요] 위치(position)가 다르면 같은 단어라도 허용해야 함 (예: "서울대"가 두 번 나오면 두 번 다 검출)
        seen_issues = set()
        unique_issues = []
        for issue in final_issues:
            # 위치 + 단어 + 길이 조합으로 중복 확인 (위치가 다르면 다른 이슈로 처리)
            issue_key = (issue.position, issue.original_text, issue.length)
            if issue_key not in seen_issues:
                seen_issues.add(issue_key)
                unique_issues.append(issue)
            else:
                logger.debug(f"중복 제거: 위치 {issue.position}의 '{issue.original_text}' (길이 {issue.length}) - 같은 위치의 중복만 제거")
        
        # 중복 제거 전후 개수 비교
        if len(final_issues) != len(unique_issues):
            logger.info(f"중복 제거: {len(final_issues)}개 → {len(unique_issues)}개 (제거된 중복: {len(final_issues) - len(unique_issues)}개)")
        
        issues = unique_issues
        
        # 디버깅: 최종 issues 개수 로깅
        logger.debug(f"최종 issues 개수: {len(issues)}")
        
        # 최종 필터링된 텍스트 생성 (원본 기준)
        # ChatGPT 결과가 있을 때는 suggestion으로 치환, 없으면 원본 유지
        final_filtered_content = content
        offset = 0
        for issue in sorted(issues, key=lambda x: x.position):
            # 1차 필터 결과인지 확인 (reason에 "규칙 기반 필터" 포함)
            is_rule_based = issue.reason and "규칙 기반 필터" in issue.reason
            
            if issue.suggestion:
                # modify 또는 spelling 타입: suggestion으로 치환
                start_pos = issue.position + offset
                end_pos = start_pos + issue.length
                final_filtered_content = (
                    final_filtered_content[:start_pos] +
                    issue.suggestion +
                    final_filtered_content[end_pos:]
                )
                offset += len(issue.suggestion) - issue.length
            # 1차 필터 결과나 delete 타입은 프론트엔드에서 삭제 버튼 클릭 시 X로 치환하므로 여기서는 원본 유지
            # (삭제 버튼 클릭 전까지는 원본 텍스트를 보여줘야 함)
        
        return ContentFilterResponse(
            filtered_content=final_filtered_content,  # suggestion이 있으면 치환, 없으면 원본 유지
            issues=issues,
            total_issues=len(issues),
            byte_count=len(final_filtered_content.encode('utf-8')),
            max_bytes=max_bytes
        )
        
    except Exception as e:
        error_str = str(e).lower()
        error_msg = str(e)
        
        # JSON 형식 관련 오류인지 확인
        if "json" in error_str and "response_format" in error_str:
            logger.warning(f"JSON 형식 요구사항 오류: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail="프롬프트 형식 오류가 발생했습니다. 관리자에게 문의하세요."
            )
        
        # API 키 관련 오류인지 확인
        if "api key" in error_str or "authentication" in error_str or ("invalid" in error_str and "key" in error_str):
            logger.error("OpenAI API 키가 유효하지 않거나 인증에 실패했습니다.")
            logger.error(f"에러 메시지: {error_msg[:200]}")
            raise HTTPException(
                status_code=500,
                detail="OpenAI API 키가 유효하지 않습니다. 환경변수 OPENAI_API_KEY를 확인하세요."
            )
        
        # 기타 오류
        logger.error(f"ChatGPT API 호출 오류: {error_msg[:200]}")
        logger.debug(f"에러 상세: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"검열 중 오류가 발생했습니다: {error_msg[:100]}"
        )


class SetuekCheckRequest(BaseModel):

    """세특 검열 요청 모델 (새로운 형식)"""
    text: str = Field(..., description="검열할 세특 내용", max_length=2000)


class ErrorDetail(BaseModel):
    """오류 상세 모델 (프론트엔드 형식) - 객체 기반 (각 위치마다 별도 객체)"""
    id: str = Field(..., description="고유 ID (단어 + 위치 기반)")
    original: str = Field(..., description="오류 원본 단어")
    corrected: Optional[str] = Field(None, description="교정 제안")
    type: str = Field(..., description="오류 유형")
    help: str = Field(..., description="도움말")
    start_index: int = Field(..., description="오류 시작 위치 (문자 인덱스)")


class CheckResponse(BaseModel):
    """세특 검열 응답 모델 (프론트엔드 형식)"""
    original_text: str = Field(..., description="원본 텍스트")
    errors: List[ErrorDetail] = Field(default_factory=list, description="오류 목록")


class RefineRequest(BaseModel):
    """문맥 교정 요청 모델"""
    text: str = Field(..., description="XXX 처리가 포함된 텍스트")


class RefineResponse(BaseModel):
    """문맥 교정 응답 모델"""
    refined_text: str = Field(..., description="문맥이 교정된 텍스트")


@router.get("/check/api-key-status")
async def check_api_key_status():
    """
    OpenAI API 키 상태를 확인합니다 (디버깅용).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    key_status = {
        "has_key": bool(OPENAI_API_KEY),
        "key_length": len(OPENAI_API_KEY) if OPENAI_API_KEY else 0,
        "key_preview": OPENAI_API_KEY[:10] + "..." if OPENAI_API_KEY and len(OPENAI_API_KEY) > 10 else "N/A",
        "key_starts_with_sk": OPENAI_API_KEY.startswith("sk-") if OPENAI_API_KEY else False,
        "key_starts_with_sk_proj": OPENAI_API_KEY.startswith("sk-proj-") if OPENAI_API_KEY else False,
        "key_format_valid": (OPENAI_API_KEY.startswith("sk-") or OPENAI_API_KEY.startswith("sk-proj-")) if OPENAI_API_KEY else False,
        "source": "unknown"
    }
    
    # 모델 정보 추가
    model_info = {
        "default_model": DEFAULT_MODEL,
        "current_model": OPENAI_MODEL
    }
    
    # 환경변수에서 확인
    env_key = os.getenv("OPENAI_API_KEY")
    if env_key and env_key.strip():
        key_status["source"] = "environment_variable"
    else:
        key_status["source"] = "secrets_manager_or_not_set"
    
    return {
        "status": "ok" if OPENAI_API_KEY else "no_key",
        "key_info": key_status,
        "model_info": model_info,
        "message": "OpenAI API 키가 설정되어 있습니다." if OPENAI_API_KEY else "OpenAI API 키가 설정되지 않았습니다."
    }


@check_router.post("/check/setuek", response_model=CheckResponse)
async def check_setuek(request: SetuekCheckRequest):
    """
    세특 내용을 검열합니다 (새로운 형식).
    
    Args:
        request: 검열 요청 (text)
        
    Returns:
        CheckResponse: 검열 결과 (프론트엔드 형식)
    """
    import logging
    import traceback
    import uuid
    
    logger = logging.getLogger(__name__)
    
    try:
        # 요청 로깅
        logger.info(f"세특 검열 요청 수신 (/check/setuek): 내용 길이={len(request.text)}자")
        
        # OpenAI 키 확인 (빈 문자열도 체크)
        if not OPENAI_API_KEY or (isinstance(OPENAI_API_KEY, str) and OPENAI_API_KEY.strip() == ""):
            logger.warning("OpenAI API 키가 설정되지 않았습니다. 빈 결과를 반환합니다.")
            return CheckResponse(
                original_text=request.text,
                errors=[]
            )
        
        # 기존 필터링 함수 호출
        max_bytes = 2000
        result = await call_chatgpt_for_filtering(request.text, max_bytes)
        
        # 프론트엔드 형식으로 변환 (객체 기반: 각 위치마다 별도 객체)
        # 같은 단어가 여러 번 나와도 각 위치마다 별도의 객체로 생성
        logger.info(f"result.issues 개수: {len(result.issues)}")
        logger.info(f"result.total_issues: {result.total_issues}")
        
        errors = []
        # 중복 제거를 위한 집합 (위치 + 단어 조합)
        seen_issues = set()
        
        for idx, issue in enumerate(result.issues):
            # 중복 확인: 같은 위치에서 같은 단어가 이미 추가되었는지 확인
            # [중요] 위치(position)가 다르면 같은 단어라도 허용해야 함 (예: "서울대"가 두 번 나오면 두 번 다 검출)
            issue_key = f"{issue.position}_{issue.original_text}_{issue.length}"
            if issue_key in seen_issues:
                logger.warning(f"중복 제거: 위치 {issue.position}의 '{issue.original_text}'는 이미 추가됨 (같은 위치의 중복만 제거)")
                continue
            seen_issues.add(issue_key)
            # 타입 변환: delete -> banned_*, modify -> modify, spelling -> spelling
            error_type = issue.type
            if issue.type == "delete":
                # reason에서 금지 유형 추론
                if "대회" in issue.reason or "대회" in issue.original_text:
                    error_type = "banned_competition"
                elif "대학" in issue.reason or any(uni in issue.original_text for uni in ["서울대", "고려대", "하버드", "MIT"]):
                    error_type = "banned_university"
                elif "기관" in issue.reason or any(org in issue.original_text for org in ["보건복지부", "유엔", "OECD", "WHO"]):
                    error_type = "banned_organization"
                elif "회사" in issue.reason or any(comp in issue.original_text for comp in ["삼성", "애플", "구글"]):
                    error_type = "banned_company"
                else:
                    error_type = "banned_word"
            
            # 각 위치마다 별도의 객체 생성 (같은 단어가 여러 번 나와도 모두 별도 객체)
            # ID는 단어 + 위치 + 타입을 조합하여 고유성 보장
            error_id = f"error_{issue.original_text}_{error_type}_{issue.position}_{uuid.uuid4().hex[:8]}"
            
            error_detail = ErrorDetail(
                id=error_id,
                original=issue.original_text,
                corrected=issue.suggestion if issue.suggestion else None,
                type=error_type,
                help=issue.reason,
                start_index=issue.position
            )
            errors.append(error_detail)
        
        logger.info(f"세특 검열 완료: 오류 개수={len(errors)}")
        return CheckResponse(
            original_text=request.text,
            errors=errors
        )
    except HTTPException as http_exc:
        # HTTPException은 그대로 전달하되, OpenAI 키 관련 오류는 빈 결과로 변환
        if "OpenAI API 키" in str(http_exc.detail):
            logger.warning("OpenAI API 키가 설정되지 않아 빈 결과를 반환합니다.")
            return CheckResponse(
                original_text=request.text,
                errors=[]
            )
        # 다른 HTTPException은 그대로 전달
        raise
    except Exception as e:
        # 예상치 못한 오류 로깅
        error_trace = traceback.format_exc()
        logger.error(f"세특 검열 중 예상치 못한 오류 발생: {str(e)}")
        logger.error(f"오류 상세:\n{error_trace}")
        
        # 사용자에게는 간단한 메시지만 전달
        raise HTTPException(
            status_code=500,
            detail=f"검열 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/filter", response_model=ContentFilterResponse)
async def filter_content(request: ContentFilterRequest):
    """
    세특 내용을 검열합니다.
    
    Args:
        request: 검열 요청 (content, max_bytes)
        
    Returns:
        ContentFilterResponse: 검열 결과
    """
    import logging
    import traceback
    
    logger = logging.getLogger(__name__)
    
    try:
        # 요청 로깅
        logger.info(f"세특 검열 요청 수신: 내용 길이={len(request.content)}자, 최대 바이트={request.max_bytes}")
        
        result = await call_chatgpt_for_filtering(request.content, request.max_bytes)
        
        logger.info(f"세특 검열 완료: 이슈 개수={result.total_issues}")
        return result
    except HTTPException:
        # HTTPException은 그대로 전달 (이미 적절한 상태 코드와 메시지 포함)
        raise
    except Exception as e:
        # 예상치 못한 오류 로깅
        error_trace = traceback.format_exc()
        logger.error(f"세특 검열 중 예상치 못한 오류 발생: {str(e)}")
        logger.error(f"오류 상세:\n{error_trace}")
        
        # 사용자에게는 간단한 메시지만 전달
        raise HTTPException(
            status_code=500,
            detail=f"검열 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/refine", response_model=RefineResponse)
async def refine_context(request: RefineRequest):
    """
    XXX로 마스킹된 부분이 포함된 텍스트를 받아, 
    해당 단어를 삭제하고 문맥에 맞게 조사와 서술어를 자연스럽게 다듬어 반환합니다.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="API Key Missing")
    
    system_prompt = """당신은 문장 교정 전문가입니다. 
사용자가 입력한 텍스트에는 금지어가 삭제되어 'XXX'로 표시된 부분들이 있습니다.
당신의 임무는 다음 규칙에 따라 문장을 매끄럽게 수정하는 것입니다.

1. 'XXX' 표시는 완전히 제거하세요.

2. 'XXX'가 제거됨에 따라 어색해진 조사(이/가, 을/를 등)나 서술어를 문맥에 맞게 수정하세요.

3. 문장의 원래 의미를 최대한 유지하되, 금지된 활동(XXX)을 하지 않았더라도 문장이 성립되도록 일반적인 표현으로 변경하세요.
   예시: "교내 과학경시대회(XXX)에 참가하여 금상을 수상함" -> "평소 과학 분야에 깊은 관심을 가지고 탐구 활동에 적극적으로 참여함"
   예시: "XXX를 통해 문제해결력을 기름" -> "다양한 활동을 통해 문제해결력을 기름"

4. 결과는 오직 수정된 텍스트만 반환하세요.
"""
    
    import hashlib
    import json
    
    user_prompt = request.text
    
    # 캐싱을 위한 해시 생성
    content_hash = hashlib.md5((system_prompt + user_prompt).encode('utf-8')).hexdigest()
    
    response_text = None
    
    # 캐시 확인
    if content_hash in _llm_cache:
        response_text = _llm_cache[content_hash]
        logger.info(f"LLM 응답 캐시 히트 (Hash: {content_hash})")
    
    if not response_text:
        try:
            # OpenAI API 호출 (chat completions 사용)
            from openai import OpenAI
            
            # OpenAI 클라이언트 초기화
            client = OpenAI(api_key=OPENAI_API_KEY)
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # 빠른 응답을 위해 3.5 또는 4o-mini 권장
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0,  # 결정론적 결과
                top_p=0.1,  # 높은 확률 토큰만 선택하여 일관성 향상
                presence_penalty=0.1,  # 반복 방지
                frequency_penalty=0.1  # 중복 방지
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # 캐시 저장
            _llm_cache[content_hash] = response_text
            logger.info(f"LLM 응답 캐시 저장 완료 (Hash: {content_hash})")
            
        except Exception as e:
            logger.error(f"OpenAI API 호출 중 오류: {e}")
            raise HTTPException(status_code=500, detail="문맥 교정 중 오류 발생")
        
    return RefineResponse(refined_text=response_text)
