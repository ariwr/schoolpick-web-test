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

# 파인튜닝된 모델 ID 설정 (환경변수 또는 기본값)
FINE_TUNED_MODEL_ID = os.getenv("FINE_TUNED_MODEL_ID", None)

# 파인튜닝 모델 ID를 파일에서 읽기 시도
if not FINE_TUNED_MODEL_ID:
    fine_tuned_model_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "fine-tuning",
        "fine_tuned_model.json"
    )
    if os.path.exists(fine_tuned_model_file):
        try:
            with open(fine_tuned_model_file, 'r', encoding='utf-8') as f:
                model_info = json.load(f)
                FINE_TUNED_MODEL_ID = model_info.get("model_id")
                if FINE_TUNED_MODEL_ID:
                    logger.info(f"파인튜닝된 모델 ID를 파일에서 로드했습니다: {FINE_TUNED_MODEL_ID[:20]}...")
        except Exception as e:
            logger.debug(f"파인튜닝 모델 파일 읽기 실패 (무시): {e}")

# 기본 모델 (파인튜닝된 모델이 없을 경우)
DEFAULT_MODEL = "gpt-3.5-turbo"

# 사용할 모델 결정
OPENAI_MODEL = FINE_TUNED_MODEL_ID if FINE_TUNED_MODEL_ID else DEFAULT_MODEL

# 모델 정보 로깅
if FINE_TUNED_MODEL_ID:
    logger.info(f"파인튜닝된 모델이 설정되어 있습니다: {FINE_TUNED_MODEL_ID[:20]}...")
else:
    logger.info(f"기본 모델을 사용합니다: {DEFAULT_MODEL}")

# 키가 있는지 확인 (빈 문자열도 체크)
if OPENAI_API_KEY:
    # 키의 앞 10자만 로깅 (보안)
    key_preview = OPENAI_API_KEY[:10] + "..." if len(OPENAI_API_KEY) > 10 else "***"
    logger.info(f"OpenAI API 키가 로드되었습니다. (길이: {len(OPENAI_API_KEY)}, 미리보기: {key_preview})")
    
    # 키가 유효한 형식인지 확인 (sk- 또는 sk-proj-로 시작하는지)
    if not (OPENAI_API_KEY.startswith("sk-") or OPENAI_API_KEY.startswith("sk-proj-")):
        logger.warning(f"OpenAI API 키 형식이 올바르지 않을 수 있습니다. (sk- 또는 sk-proj-로 시작하지 않음)")
    else:
        logger.info(f"OpenAI API 키 형식이 올바릅니다.")
    
    openai.api_key = OPENAI_API_KEY
else:
    logger.warning("Warning: OPENAI_API_KEY가 설정되지 않았습니다. 세특 검열 기능을 사용하려면 환경변수를 설정하세요.")
    OPENAI_API_KEY = None  # 명시적으로 None으로 설정


class ContentFilterRequest(BaseModel):
    """세특 검열 요청 모델"""
    content: str = Field(..., description="검열할 세특 내용", max_length=2000)
    max_bytes: int = Field(default=2000, description="최대 바이트 수", ge=1, le=2000)
    rule_only: bool = Field(default=False, description="1차 규칙 기반 필터만 사용 (ChatGPT 건너뛰기)")


class FilterIssue(BaseModel):
    """검열 발견 이슈 모델"""
    type: str = Field(..., description="이슈 유형 (delete, modify, spelling)")
    position: int = Field(..., description="문제가 발견된 위치 (문자 인덱스)")
    length: int = Field(..., description="문제가 있는 텍스트 길이")
    original_text: str = Field(..., description="원본 텍스트")
    suggestion: Optional[str] = Field(None, description="수정 제안")
    reason: str = Field(..., description="문제 사유")


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


async def call_chatgpt_for_filtering(content: str, max_bytes: int = 2000, skip_chatgpt: bool = False) -> ContentFilterResponse:
    """
    ChatGPT API를 호출하여 세특 내용을 검열합니다.
    LLM 호출 전에 1차 규칙 기반 필터를 적용합니다.
    
    Args:
        content: 검열할 세특 내용
        max_bytes: 최대 바이트 수
        skip_chatgpt: True이면 ChatGPT 호출을 건너뛰고 1차 필터 결과만 반환
        
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
    
    # skip_chatgpt가 False일 때만 API 키 확인
    if not skip_chatgpt and not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API 키가 설정되지 않았습니다. 환경변수 OPENAI_API_KEY를 설정하세요."
        )
    
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
    
    # [수정된 로직 시작] ============================================================
    # 2. 원본 텍스트 재스캔 (Re-scanning)
    # 1차 필터가 찾아낸 단어들을 키워드로 해서, 원본 텍스트 내의 '모든' 등장 위치를 다시 찾습니다.
    
    all_matches = []
    
    # 중복 단어 제거 (예: 1차 필터가 '대회'를 3번 리턴해도 단어는 '대회' 하나로 취급)
    # 단어별 메타데이터(대체어, 카테고리 등)를 저장
    detected_words_map = {d.get("word"): d for d in raw_detections if d.get("word")}
    
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
    
    # 1차 필터링된 텍스트를 LLM에 전달
    content_to_check = pre_filtered_content
    # [수정된 로직 끝] ==============================================================
    
    # 1차 필터만 사용하는 경우 (LLM 건너뛰기)
    if skip_chatgpt:
        logger.debug(f"1차 규칙 기반 필터만 사용합니다: {len(rule_detections)}개 검출")
        
        issues = []
        for rule_det in rule_detections:
            issue = FilterIssue(
                type="delete",  # 1차 필터는 기본적으로 삭제/금지어
                position=rule_det['position'],
                length=len(rule_det['word']),
                original_text=rule_det['word'],
                suggestion=None,
                reason=f"규칙 기반 필터: {rule_det['category']} 관련 금지어입니다."
            )
            issues.append(issue)
        
        # 위치 순서대로 정렬
        issues.sort(key=lambda x: x.position)
        
        return ContentFilterResponse(
            filtered_content=content,  # 원본 반환 (프론트에서 처리)
            issues=issues,
            total_issues=len(issues),
            byte_count=byte_count,
            max_bytes=max_bytes
        )
    
    # ChatGPT에 전달할 프롬프트 작성 (2025 기재요령 PDF 기준 보강)
    system_prompt = """당신은 한국어 세특(세부능력 및 특기사항) 검열 전문가입니다.
학교생활기록부 기재요령(교육부훈령)에 따라 다음 내용을 엄격하게 검열해야 합니다.

【금지 용어 및 표현】

1. 대회, 수상, 성적 관련 (기재 불가)[cite: 365, 366]:
   - "대회"라는 단어 (예: 체육대회, 과학경진대회). (단, '수상경력' 항목 제외) [cite: 365, 1157]
   - 교외 기관·단체(장) 수상 실적 (표창장, 감사장, 공로상 등)
   - 모의고사·전국연합학력평가 성적 (원점수, 석차, 등급, 백분위 등)

2. 어학시험 및 인증 (기재 불가)[cite: 363, 364, 366]:
   - 각종 공인어학시험명 및 성적 (TOEIC, TOEFL, TEPS, HSK, JPT, JLPT, DELF, DSH, DELE 등) [cite: 364]
   - 각종 한자시험 (한자능력검정, 실용한자, YBM 상무한검 등) [cite: 364]
   - 교내·외 인증시험 참여 사실
   - 자격증 명칭 (단, '자격증 취득' 항목란 제외) [cite: 392]

3. 대학, 기관, 상호명 (기재 불가)[cite: 383]:
   - 구체적인 특정 대학명 (서울대, 고려대, 하버드, MIT, 옥스포드 등) [cite: 383]
   - 기관명 (보건복지부, 통계청, YMCA, 유엔, OECD, WHO 등) [cite: 383]
     (단, 교육부 및 그 소속기관, 시도교육청 및 직속기관 등 교육관련기관은 허용) [cite: 384, 385]
   - 상호명 및 회사명 (삼성, 애플, 구글, 유튜브, 틱톡, TED, 넷플릭스 등) [cite: 383]

4. 연구, 저작물, 지식재산권 (기재 불가)[cite: 367, 368]:
   - 논문 (학회지 투고, 등재, 발표 포함)
   - 도서출간 사실
   - 지식재산권 (특허, 실용신안, 상표, 디자인 등) 출원 또는 등록 사실
   - 협회, 학회명 (~협회, ~학회)

5. 개인 신상 및 기타 (기재 불가)[cite: 368, 369]:
   - 부모(친인척 포함)의 사회·경제적 지위 암시 내용 (직종명, 직업명, 직장명, 직위명 등)
   - 해외 활동 실적 (어학연수, 해외 봉사활동 등)
   - 장학생, 장학금 관련 내용
   - 특정 강사명
   - 기부 내용

6. 특수기호 (수정):
   - 큰따옴표 (" ")
   - 가운뎃점 (·)
   - < > 괄호
   - 모든 특수기호는 일반 텍스트로 수정

7. 맞춤법 오류 (수정 필수):
   - "이끔" → "이끌며"
   - "뿐" → 올바른 형태로 수정
   - "만듬" → "만듦" 또는 "만들었음"
   - "을/를" 조사 오류
   - "균형 있게" → "균형있게" 또는 "균형 있게" (맥락에 맞게)
   - "게 되" → "게 되었다" 또는 적절한 형태
   - "지 않" → "지 않았다" 또는 적절한 형태
   - "값" → "가치" 또는 문맥에 맞는 표현

8. 띄어쓰기 오류:
   - 가운뎃점 사용 금지, 띄어쓰기로 수정

9. 부적절한 표현:
   - 욕설, 비속어, 혐오 표현 등

【응답 형식 - 매우 중요】
반드시 다음 JSON 형식으로 응답해야 합니다. position과 length는 원본 텍스트에서의 정확한 위치를 나타냅니다:

{
  "filtered_content": "검열된 내용 (금지 용어는 삭제하거나 수정, 맞춤법은 교정)",
  "issues": [
    {
      "type": "delete|modify|spelling",
      "position": 정확한_문자_인덱스_0부터_시작,
      "length": 원본_텍스트에서의_정확한_길이,
      "original_text": "원본 텍스트에서 발견된 정확한 텍스트",
      "suggestion": "수정 제안 텍스트 (modify나 spelling 타입일 경우 필수, delete일 경우 null)",
      "reason": "문제 사유 설명 (예: '대회'라는 단어는 학교생활기록부에 기재할 수 없습니다)"
    }
  ]
}

【위치 정보 정확성 요구사항 - 매우 중요】
1. position: 원본 텍스트에서 해당 텍스트가 시작되는 정확한 문자 인덱스 (0부터 시작)
2. length: original_text의 정확한 문자 길이 (바이트가 아닌 문자 수)
3. original_text: 원본 텍스트에서 발견된 정확한 텍스트 (공백, 특수문자 포함 정확히 일치해야 함)
4. suggestion: 수정할 텍스트 (modify나 spelling 타입일 경우 필수, delete일 경우 null 또는 빈 문자열)

예시:
원본 텍스트: "체육대회에서 우승했다."
- position: 0 (첫 번째 문자부터)
- length: 4 ("체육대회"의 문자 수)
- original_text: "체육대회"
- type: "delete"
- suggestion: null 또는 빈 문자열

원본 텍스트: "이끔 팀을 이끌었다."
- position: 0
- length: 2 ("이끔"의 문자 수)
- original_text: "이끔"
- type: "spelling"
- suggestion: "이끌며"

type 설명:
- "delete": 삭제해야 할 금지 용어 (대회, 수상 실적, 성적, 어학시험, 한자시험, 인증시험, 자격증, 대학명, 기관명, 상호명, 논문, 도서출간, 지식재산권, 협회, 학회, 부모 신상 정보, 해외 활동, 장학금, 강사명, 기부 등). suggestion은 null이어야 함.
- "modify": 수정이 필요한 내용 (특수기호를 일반 텍스트로 변경 등). suggestion 필수.
- "spelling": 맞춤법 오류. suggestion 필수.

중요 사항:
1. 원본 텍스트를 정확히 분석하여 각 문제의 위치를 정확히 찾아야 합니다.
2. position과 length는 원본 텍스트 기준이며, issues 배열의 순서는 position 순서대로 정렬해야 합니다.
3. 같은 위치에 여러 문제가 겹치면 각각을 별도의 issue로 추가하되, position은 정확히 일치해야 합니다.
4. filtered_content는 모든 수정이 적용된 최종 텍스트입니다."""

    user_prompt = f"""다음 세특 내용을 검열해주세요 (최대 {max_bytes}바이트):

{content_to_check}

【검열 작업 지침】
위 내용을 문자 단위로 정확히 분석하여 다음 항목들을 확인하세요:

1. "대회"라는 단어가 포함되어 있는가? (있으면 삭제, position과 length 정확히 지정)
   - 주의: "대전"이라는 단어는 "대회"가 아니므로 검출하지 마세요.
   - 주의: "국제 청소년 과학 창의 대전"과 같은 대회명에서 "국제"만 단독으로 검출하지 마세요. 전체 대회명을 검출하거나 검출하지 마세요.
   - "대회"라는 단어가 정확히 포함된 경우만 검출하세요 (예: "체육대회", "과학경진대회").
2. 교외 기관·단체(장) 수상 실적이 언급되어 있는가? (표창장, 감사장, 공로상 등 - 모두 삭제)
3. 모의고사·전국연합학력평가 성적이 언급되어 있는가? (원점수, 석차, 등급, 백분위 등 - 모두 삭제)
4. 공인어학시험명 및 성적이 언급되어 있는가? (TOEIC, TOEFL, TEPS, HSK, JPT, JLPT, DELF, DSH, DELE 등 - 모두 삭제)
5. 한자시험이 언급되어 있는가? (한자능력검정, 실용한자, YBM 상무한검 등 - 모두 삭제)
6. 교내·외 인증시험 참여 사실이 언급되어 있는가? (있으면 삭제)
7. 자격증 명칭이 있는가? (있으면 삭제, 단 '자격증 취득' 항목란 제외)
8. 대학명이 언급되어 있는가? (서울대, 고려대, 하버드, MIT, 옥스포드 등 - 모두 삭제)
9. 기관명이 언급되어 있는가? (보건복지부, 통계청, YMCA, 유엔, OECD, WHO 등 - 모두 삭제, 단 교육관련기관은 허용)
   - 주의: "국제"라는 단어만 단독으로 검출하지 마세요. "국제통화기금"처럼 완전한 기관명만 검출하세요.
   - 주의: "국제 청소년 과학 창의 대전"과 같은 대회명에서 "국제"만 단독으로 검출하지 마세요.
10. 상호명/회사명이 언급되어 있는가? (삼성, 애플, 구글, 유튜브, 틱톡, TED, 넷플릭스 등 - 모두 삭제)
11. 논문 관련 내용이 있는가? (학회지 투고, 등재, 발표 포함 - 모두 삭제)
12. 도서출간 사실이 언급되어 있는가? (있으면 삭제)
13. 지식재산권 관련 내용이 있는가? (특허, 실용신안, 상표, 디자인 등 출원 또는 등록 사실 - 모두 삭제)
14. "~협회", "~학회" 표현이 있는가? (있으면 삭제)
15. 부모(친인척 포함)의 사회·경제적 지위 암시 내용이 있는가? (직종명, 직업명, 직장명, 직위명 등 - 모두 삭제)
16. 해외 활동 실적이 언급되어 있는가? (어학연수, 해외 봉사활동 등 - 모두 삭제)
17. 장학생, 장학금 관련 내용이 있는가? (있으면 삭제)
18. 특정 강사명이 언급되어 있는가? (있으면 삭제)
19. 기부 관련 내용이 있는가? (있으면 삭제)
20. 특수기호가 있는가? (큰따옴표, 가운뎃점, < > 등 - 일반 텍스트로 수정, suggestion 필수)
21. 맞춤법 오류가 있는가? (이끔, 만듬, 을/를, 게 되, 지 않 등 - 수정, suggestion 필수)
22. 띄어쓰기 오류가 있는가? (수정, suggestion 필수)

【주의사항】
- 원본 텍스트를 문자 단위로 정확히 분석하여 position과 length를 정확히 계산하세요.
- original_text는 원본 텍스트에서 발견된 정확한 텍스트여야 합니다 (공백 포함).
- suggestion은 modify나 spelling 타입일 경우 반드시 제공해야 합니다.
- issues 배열은 position 순서대로 정렬해야 합니다.
- 각 문제마다 정확한 위치 정보를 제공해야 합니다."""

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
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        # 토큰 사용량 로깅 (디버그 레벨)
        if hasattr(response, 'usage') and response.usage:
            usage = response.usage
            logger.debug(f"토큰 사용량 - 입력: {usage.prompt_tokens}, 출력: {usage.completion_tokens}, 총: {usage.total_tokens}")
        
        # 응답 파싱
        response_text = response.choices[0].message.content
        
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
        
        issues = []
        # skip_chatgpt가 True일 때는 ChatGPT 결과를 완전히 제외 (금지어만 검열)
        if not skip_chatgpt:
            # ChatGPT 결과 처리 (skip_chatgpt=False일 때만)
            for issue_data in issues_data:
                # reason 필드가 None이거나 빈 문자열일 경우 기본값 사용
                reason_value = issue_data.get("reason")
                if not reason_value or reason_value is None:
                    reason_value = "문제 발견"
                
                issue = FilterIssue(
                    type=issue_data.get("type", "modify"),
                    position=issue_data.get("position", 0),
                    length=issue_data.get("length", 0),
                    original_text=issue_data.get("original_text", ""),
                    suggestion=issue_data.get("suggestion"),
                    reason=reason_value
                )
                issues.append(issue)
        
        # 1차 필터 결과를 issue로 추가 (위에서 재스캔한 rule_detections 사용)
        # (LLM이 놓친 부분을 보완)
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
            
            # LLM이 찾은 결과와 중복되는지 확인
            is_already_detected = False
            if not skip_chatgpt:
                for existing_issue in issues:
                    # 위치와 길이가 겹치거나 포함되는지 확인
                    existing_start = existing_issue.position
                    existing_end = existing_issue.position + existing_issue.length
                    rule_start = rule_position
                    rule_end = rule_position + len(rule_word)
                    
                    # 완전히 같은 위치거나 포함 관계인 경우 중복 처리
                    # 같은 위치에서 정확히 같은 텍스트가 매칭된 경우
                    if (existing_start == rule_start and existing_end == rule_end and 
                        existing_issue.original_text == rule_word):
                        is_already_detected = True
                        logger.debug(f"중복 제거: 위치 {rule_position}의 '{rule_word}'는 이미 ChatGPT 결과에 포함됨")
                        break
                    # 포함 관계 체크: 기존 이슈가 이 단어를 포함하거나, 이 단어가 기존 이슈를 포함하는 경우
                    elif (existing_start <= rule_start and existing_end >= rule_end) or \
                         (rule_start <= existing_start and rule_end >= existing_end):
                        # 완전히 포함되는 경우에만 중복으로 처리
                        is_already_detected = True
                        logger.debug(f"중복 제거: 위치 {rule_position}의 '{rule_word}'는 기존 이슈에 포함됨")
                        break
            
            if not is_already_detected:
                # 1차 필터 결과를 issue로 추가
                issue = FilterIssue(
                    type="delete",  # 1차 필터는 삭제 타입으로 (X로 치환하기 위해)
                    position=rule_position,
                    length=len(rule_word),
                    original_text=rule_word,
                    suggestion=None,  # suggestion 제거 (X로 치환할 것이므로)
                    reason=f"규칙 기반 필터: {rule_category} 카테고리의 금지어"
                )
                issues.append(issue)
                logger.debug(f"규칙 기반 필터 결과 추가: '{rule_word}' 위치 {rule_position}")
        
        # 위치 순서대로 정렬
        issues.sort(key=lambda x: x.position)
        
        # 중복 제거: 같은 위치에서 같은 단어가 여러 번 나온 경우만 제거
        # [중요] 위치(position)가 다르면 같은 단어라도 허용해야 함 (예: "서울대"가 두 번 나오면 두 번 다 검출)
        seen_issues = set()
        unique_issues = []
        for issue in issues:
            # 위치 + 단어 + 길이 조합으로 중복 확인 (위치가 다르면 다른 이슈로 처리)
            issue_key = (issue.position, issue.original_text, issue.length)
            if issue_key not in seen_issues:
                seen_issues.add(issue_key)
                unique_issues.append(issue)
            else:
                logger.debug(f"중복 제거: 위치 {issue.position}의 '{issue.original_text}' (길이 {issue.length}) - 같은 위치의 중복만 제거")
        
        # 중복 제거 전후 개수 비교
        if len(issues) != len(unique_issues):
            logger.info(f"중복 제거: {len(issues)}개 → {len(unique_issues)}개 (제거된 중복: {len(issues) - len(unique_issues)}개)")
        
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
        error_msg = f"ChatGPT API 호출 오류: {str(e)}"
        logger.error(error_msg)
        logger.error(f"에러 타입: {type(e).__name__}")
        logger.error(f"에러 상세: {traceback.format_exc()}")
        
        # API 키 관련 오류인지 확인
        error_str = str(e).lower()
        if "api key" in error_str or "authentication" in error_str or "invalid" in error_str:
            logger.error("OpenAI API 키가 유효하지 않거나 인증에 실패했습니다.")
            logger.error(f"현재 설정된 키 미리보기: {OPENAI_API_KEY[:10] + '...' if OPENAI_API_KEY and len(OPENAI_API_KEY) > 10 else 'N/A'}")
            raise HTTPException(
                status_code=500,
                detail="OpenAI API 키가 유효하지 않습니다. 환경변수 OPENAI_API_KEY를 확인하세요."
            )
        
        raise HTTPException(
            status_code=500,
            detail=error_msg
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
        "fine_tuned_model_id": FINE_TUNED_MODEL_ID,
        "current_model": OPENAI_MODEL,
        "is_fine_tuned": bool(FINE_TUNED_MODEL_ID)
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
        logger.info(f"세특 검열 요청 수신: 내용 길이={len(request.content)}자, 최대 바이트={request.max_bytes}, 규칙만 사용={request.rule_only}")
        
        result = await call_chatgpt_for_filtering(request.content, request.max_bytes, skip_chatgpt=request.rule_only)
        
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

