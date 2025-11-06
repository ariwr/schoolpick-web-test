"""
세특 검열 API 엔드포인트
ChatGPT API를 사용하여 세특 내용의 부적절한 단어를 검열하고 맞춤법을 검사합니다.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import openai
import os
import json
from app.config import settings

router = APIRouter()

# OpenAI API 키 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY가 설정되지 않았습니다. 세특 검열 기능을 사용하려면 환경변수를 설정하세요.")

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY


class ContentFilterRequest(BaseModel):
    """세특 검열 요청 모델"""
    content: str = Field(..., description="검열할 세특 내용", max_length=2000)
    max_bytes: int = Field(default=2000, description="최대 바이트 수", ge=1, le=2000)


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


async def call_chatgpt_for_filtering(content: str, max_bytes: int = 2000) -> ContentFilterResponse:
    """
    ChatGPT API를 호출하여 세특 내용을 검열합니다.
    
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
    
    if not OPENAI_API_KEY:
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
    
    # ChatGPT에 전달할 프롬프트 작성 (개선된 버전: 위치 정보 정확성 향상)
    system_prompt = """당신은 한국어 세특(세부능력 및 특기사항) 검열 전문가입니다.
학교생활기록부 정검단 규정에 따라 다음 내용을 엄격하게 검열해야 합니다.

【금지 용어 및 표현】

1. 대회 관련 (완전 금지):
   - "대회"라는 단어 자체를 사용할 수 없음 (예: 체육대회, 국제대회, 쇼트트랙 대회 등 모두 금지)
   - 대회 관련 내용은 모두 삭제하거나 다른 표현으로 수정

2. 대학명 (모든 대학 금지):
   - 서울대, 고려대, 하버드, MIT공대 등 모든 대학명
   - 해외 대학명 포함 (하버드, MIT, 옥스포드, 케임브리지 등)

3. 기관명 및 공공기관 (금지):
   - 국민연금관리공단, 보건복지부, 환경부, 통계청, YMCA
   - CDC, 유엔, OECD, 안보리, 유네스코, 한국연구재단
   - 세계보건기구, WHO, 식품안전처, 식약처, 질병관리청

4. 상호명 및 회사명 (금지):
   - 삼성, 애플, 구글, 유튜브, 틱톡, TED, 인스타그램, 넷플릭스
   - 모든 회사명, 브랜드명, 서비스명

5. 협회 및 학회 (금지):
   - "~협회", "~학회" 형태의 모든 표현 (예: 과학협회, 수학학회 등)

6. 자격증 명칭 (금지):
   - 모든 자격증 명칭은 언급 불가

7. 기부 내용 (금지):
   - 기부 관련 내용은 모두 삭제

8. 특수기호 (금지):
   - 큰따옴표 (" ")
   - 가운뎃점 (·)
   - < > 괄호
   - 모든 특수기호는 일반 텍스트로 수정

9. 맞춤법 오류 (수정 필수):
   - "이끔" → "이끌며"
   - "뿐" → 올바른 형태로 수정
   - "만듬" → "만듦" 또는 "만들었음"
   - "을/를" 조사 오류
   - "균형 있게" → "균형있게" 또는 "균형 있게" (맥락에 맞게)
   - "게 되" → "게 되었다" 또는 적절한 형태
   - "지 않" → "지 않았다" 또는 적절한 형태
   - "값" → "가치" 또는 문맥에 맞는 표현

10. 띄어쓰기 오류:
    - 가운뎃점 사용 금지, 띄어쓰기로 수정

11. 부적절한 표현:
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
- "delete": 삭제해야 할 금지 용어 (대회, 기관명, 대학명, 상호명, 협회, 학회, 자격증, 기부 등). suggestion은 null이어야 함.
- "modify": 수정이 필요한 내용 (특수기호를 일반 텍스트로 변경 등). suggestion 필수.
- "spelling": 맞춤법 오류. suggestion 필수.

중요 사항:
1. 원본 텍스트를 정확히 분석하여 각 문제의 위치를 정확히 찾아야 합니다.
2. position과 length는 원본 텍스트 기준이며, issues 배열의 순서는 position 순서대로 정렬해야 합니다.
3. 같은 위치에 여러 문제가 겹치면 각각을 별도의 issue로 추가하되, position은 정확히 일치해야 합니다.
4. filtered_content는 모든 수정이 적용된 최종 텍스트입니다."""

    user_prompt = f"""다음 세특 내용을 검열해주세요 (최대 {max_bytes}바이트):

{content}

【검열 작업 지침】
위 내용을 문자 단위로 정확히 분석하여 다음 항목들을 확인하세요:

1. "대회"라는 단어가 포함되어 있는가? (있으면 삭제, position과 length 정확히 지정)
2. 대학명이 언급되어 있는가? (서울대, 고려대, 하버드, MIT 등 - 모두 삭제)
3. 기관명이 언급되어 있는가? (보건복지부, 유엔, OECD, WHO 등 - 모두 삭제)
4. 상호명/회사명이 언급되어 있는가? (삼성, 애플, 구글, 유튜브, 틱톡 등 - 모두 삭제)
5. "~협회", "~학회" 표현이 있는가? (있으면 삭제)
6. 자격증 명칭이 있는가? (있으면 삭제)
7. 기부 관련 내용이 있는가? (있으면 삭제)
8. 특수기호가 있는가? (큰따옴표, 가운뎃점, < > 등 - 일반 텍스트로 수정, suggestion 필수)
9. 맞춤법 오류가 있는가? (이끔, 만듬, 을/를, 게 되, 지 않 등 - 수정, suggestion 필수)
10. 띄어쓰기 오류가 있는가? (수정, suggestion 필수)

【주의사항】
- 원본 텍스트를 문자 단위로 정확히 분석하여 position과 length를 정확히 계산하세요.
- original_text는 원본 텍스트에서 발견된 정확한 텍스트여야 합니다 (공백 포함).
- suggestion은 modify나 spelling 타입일 경우 반드시 제공해야 합니다.
- issues 배열은 position 순서대로 정렬해야 합니다.
- 각 문제마다 정확한 위치 정보를 제공해야 합니다."""

    try:
        # OpenAI API 호출 (chat completions 사용)
        from openai import OpenAI
        
        logger.info("OpenAI 클라이언트 초기화 시작...")
        
        # OpenAI 클라이언트 초기화
        # httpx 버전을 0.27.2로 다운그레이드하여 proxies 파라미터 호환성 문제 해결
        client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("OpenAI 클라이언트 초기화 완료")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # GPT-3.5 모델 사용
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        # 토큰 사용량 로깅
        if hasattr(response, 'usage') and response.usage:
            usage = response.usage
            logger.info(f"토큰 사용량 - 입력: {usage.prompt_tokens} 토큰, 출력: {usage.completion_tokens} 토큰, 총: {usage.total_tokens} 토큰")
            logger.info(f"예상 비용 (GPT-3.5-turbo): 입력 ${usage.prompt_tokens / 1000 * 0.0005:.6f}, 출력 ${usage.completion_tokens / 1000 * 0.0015:.6f}, 총 ${usage.total_tokens / 1000 * 0.0008:.6f} (대략적)")
        
        # 응답 파싱
        response_text = response.choices[0].message.content
        result = json.loads(response_text)
        
        # 응답 검증 및 변환
        filtered_content = result.get("filtered_content", content)
        issues_data = result.get("issues", [])
        
        issues = []
        for issue_data in issues_data:
            issue = FilterIssue(
                type=issue_data.get("type", "modify"),
                position=issue_data.get("position", 0),
                length=issue_data.get("length", 0),
                original_text=issue_data.get("original_text", ""),
                suggestion=issue_data.get("suggestion"),
                reason=issue_data.get("reason", "문제 발견")
            )
            issues.append(issue)
        
        return ContentFilterResponse(
            filtered_content=filtered_content,
            issues=issues,
            total_issues=len(issues),
            byte_count=len(filtered_content.encode('utf-8')),
            max_bytes=max_bytes
        )
        
    except json.JSONDecodeError as e:
        error_msg = f"ChatGPT 응답 파싱 오류: {str(e)}"
        logger.error(error_msg)
        logger.error(f"응답 내용: {response_text[:500] if 'response_text' in locals() else '응답 없음'}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"ChatGPT API 호출 오류: {str(e)}"
        logger.error(error_msg)
        logger.error(f"에러 타입: {type(e).__name__}")
        logger.error(f"에러 상세: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
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

