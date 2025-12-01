"""
필터 데이터 로더 모듈
카테고리별 JSON 파일에서 필터 패턴을 로드합니다.
"""
import json
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# 필터 데이터 디렉토리 경로
FILTER_DATA_DIR = Path(__file__).parent / "filter_data"

# 카테고리 매핑 (기존 카테고리명 → 새 카테고리명)
CATEGORY_MAPPING = {
    "어학시험": "CERT",
    "기업브랜드": "COMPANY",
    "대회수상": "PROGRAM",
    "부모직업": "FORBIDDEN",
    "대학명": "UNIVERSITY",
    "기관명": "ORGANIZATION",
    "연구저작": "FORBIDDEN",
    "기타금지": "FORBIDDEN",
}

# 파일명 → 카테고리 매핑
FILE_TO_CATEGORY = {
    "company.json": "COMPANY",
    "edu_brand.json": "EDU_BRAND",
    "university.json": "UNIVERSITY",
    "cert.json": "CERT",
    "organization.json": "ORGANIZATION",
    "media.json": "MEDIA",
    "program.json": "PROGRAM",
    "forbidden_words.json": "FORBIDDEN",
    "family_job.json": "FAMILY_JOB",
    "family_env.json": "FAMILY_ENV",
    "custom_rules.json": "USER_DEFINED",
}


class FilterPattern:
    """필터 패턴을 담는 클래스"""
    
    def __init__(
        self,
        pattern: str,
        label: str,
        category: str,
        use_regex: bool = True,
        use_kiwi: bool = False,
        abbreviations: Optional[List[str]] = None
    ):
        self.pattern = pattern
        self.label = label
        self.category = category
        self.use_regex = use_regex
        self.use_kiwi = use_kiwi
        self.abbreviations = abbreviations or []
        self.compiled_pattern = None
        
        if self.use_regex:
            try:
                self.compiled_pattern = re.compile(pattern, re.IGNORECASE)
            except re.error as e:
                logger.warning(f"정규식 컴파일 실패: {pattern} - {e}")
    
    def to_tuple(self) -> Tuple[str, str, str]:
        """기존 형식 (패턴, 치환어, 카테고리) 튜플로 변환"""
        return (self.pattern, self.label, self.category)


def create_korean_word_boundary_pattern(word: str) -> str:
    """
    한글 단어 경계를 제대로 처리하는 정규식 패턴을 생성합니다.
    앞뒤에 한글이 오지 않도록 확인하여 "상"이 "영상", "동상"에서 매칭되지 않도록 합니다.
    
    Args:
        word: 검색할 단어
        
    Returns:
        str: 한글 단어 경계를 고려한 정규식 패턴
    """
    escaped_word = re.escape(word)
    # 앞에 한글이 오지 않고, 뒤에도 한글이 오지 않도록
    # (?<![가-힣]) : Negative Lookbehind - 앞에 한글이 오지 않음
    # (?![가-힣]) : Negative Lookahead - 뒤에 한글이 오지 않음
    return f"(?<![가-힣]){escaped_word}(?![가-힣])"


def load_json_filters(file_path: Path) -> List[FilterPattern]:
    """
    JSON 파일에서 필터 패턴을 로드합니다.
    
    Args:
        file_path: JSON 파일 경로
        
    Returns:
        List[FilterPattern]: 필터 패턴 리스트
    """
    if not file_path.exists():
        logger.warning(f"필터 파일이 존재하지 않습니다: {file_path}")
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        patterns = []
        
        # 리스트 형태 (university.json 같은 경우)
        if isinstance(data, list):
            if len(data) > 0 and isinstance(data[0], str):
                # 단순 문자열 리스트 (대학명 등)
                for item in data:
                    # 한글 단어 경계를 제대로 처리
                    pattern_str = create_korean_word_boundary_pattern(item)
                    patterns.append(FilterPattern(
                        pattern=pattern_str,
                        label="특정 대학",
                        category=FILE_TO_CATEGORY.get(file_path.name, "UNIVERSITY"),
                        use_regex=True,
                        use_kiwi=False
                    ))
            else:
                # 객체 리스트
                for item in data:
                    if isinstance(item, dict):
                        patterns.append(FilterPattern(
                            pattern=item.get("pattern", ""),
                            label=item.get("label", ""),
                            category=item.get("category", FILE_TO_CATEGORY.get(file_path.name, "UNKNOWN")),
                            use_regex=item.get("use_regex", True),
                            use_kiwi=item.get("use_kiwi", False),
                            abbreviations=item.get("abbreviations", [])
                        ))
        
        # 딕셔너리 형태 (kiwi_abbreviations.json 같은 경우)
        elif isinstance(data, dict):
            # 축약형 사전 형태
            for abbrev, full_form in data.items():
                # 한글 단어 경계를 제대로 처리
                pattern_str = create_korean_word_boundary_pattern(abbrev)
                patterns.append(FilterPattern(
                    pattern=pattern_str,
                    label=full_form,
                    category="ABBREVIATION",
                    use_regex=True,
                    use_kiwi=True
                ))
        
        logger.info(f"로드 완료: {file_path.name} - {len(patterns)}개 패턴")
        return patterns
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON 파싱 오류: {file_path} - {e}")
        return []
    except Exception as e:
        logger.error(f"파일 로드 오류: {file_path} - {e}")
        return []


def load_filters(category: Optional[str] = None) -> List[FilterPattern]:
    """
    모든 필터 패턴을 로드합니다.
    
    Args:
        category: 특정 카테고리만 로드 (None이면 전체)
        
    Returns:
        List[FilterPattern]: 필터 패턴 리스트
    """
    if not FILTER_DATA_DIR.exists():
        logger.warning(f"필터 데이터 디렉토리가 존재하지 않습니다: {FILTER_DATA_DIR}")
        return []
    
    all_patterns = []
    
    # JSON 파일들 로드
    for json_file in FILTER_DATA_DIR.glob("*.json"):
        file_category = FILE_TO_CATEGORY.get(json_file.name)
        
        if category and file_category != category:
            continue
        
        patterns = load_json_filters(json_file)
        all_patterns.extend(patterns)
    
    logger.info(f"총 {len(all_patterns)}개 필터 패턴 로드 완료")
    return all_patterns


def load_filters_by_category(category: str) -> List[FilterPattern]:
    """
    특정 카테고리의 필터만 로드합니다.
    
    Args:
        category: 카테고리 코드 (COMPANY, EDU_BRAND 등)
        
    Returns:
        List[FilterPattern]: 필터 패턴 리스트
    """
    return load_filters(category=category)


def load_kiwi_abbreviations() -> Dict[str, str]:
    """
    kiwi 형태소 분석용 축약형 사전을 로드합니다.
    
    Returns:
        Dict[str, str]: {축약형: 표준형} 딕셔너리
    """
    abbrev_file = FILTER_DATA_DIR / "kiwi_abbreviations.json"
    
    if not abbrev_file.exists():
        logger.warning(f"축약형 사전 파일이 존재하지 않습니다: {abbrev_file}")
        return {}
    
    try:
        with open(abbrev_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict):
            logger.info(f"축약형 사전 로드 완료: {len(data)}개 항목")
            return data
        else:
            logger.warning(f"축약형 사전 형식이 올바르지 않습니다: {abbrev_file}")
            return {}
            
    except Exception as e:
        logger.error(f"축약형 사전 로드 오류: {abbrev_file} - {e}")
        return {}


def get_all_patterns() -> List[Tuple[str, str, str]]:
    """
    모든 필터 패턴을 기존 형식 (패턴, 치환어, 카테고리) 튜플 리스트로 반환합니다.
    하위 호환성을 위한 함수입니다.
    
    Returns:
        List[Tuple[str, str, str]]: (패턴, 치환어, 카테고리) 튜플 리스트
    """
    patterns = load_filters()
    return [p.to_tuple() for p in patterns]

