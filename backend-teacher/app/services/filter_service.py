"""
규칙 기반 필터 서비스
Kiwi 형태소 분석기를 사용하여 1차 필터링을 수행합니다.
"""
import re
import logging
from typing import Dict, List, Optional, Tuple
from kiwipiepy import Kiwi
from app.core.filter_loader import load_filters, load_kiwi_abbreviations, FilterPattern

logger = logging.getLogger(__name__)

# 교내 행사 대체어 사전 (순화 대상)
EVENT_REPLACEMENTS = {
    "체육대회": "체육행사",
    "체육 대회": "체육행사",
    "운동회": "체육한마당",
    "합창대회": "합창제",
    "합창 대회": "합창제",
    "축구대회": "축구 경기",
    "농구대회": "농구 경기",
    "토론대회": "토론회",
    # 경시대회는 교외 대회로 간주하여 삭제 대상이지만, 혹시 모를 경우를 대비해 추가
    "경시대회": "경시 행사는 기재 불가(참가 사실 자체 기재 금지일 수 있음)"
}

# Kiwi 인스턴스는 전역으로 한 번만 초기화 (성능 최적화)
_kiwi_instance: Optional[Kiwi] = None


def get_kiwi_instance() -> Kiwi:
    """
    Kiwi 인스턴스를 싱글톤으로 반환합니다.
    
    Returns:
        Kiwi: Kiwi 형태소 분석기 인스턴스
    """
    global _kiwi_instance
    if _kiwi_instance is None:
        _kiwi_instance = Kiwi()
        logger.info("Kiwi 형태소 분석기 초기화 완료")
    return _kiwi_instance


class FilterDetection:
    """검출된 금지어 정보를 담는 클래스"""
    
    def __init__(self, word: str, category: str, position: int, replacement: str):
        self.word = word
        self.category = category
        self.position = position
        self.replacement = replacement
    
    def to_dict(self) -> Dict:
        """Dictionary 형태로 변환"""
        return {
            "word": self.word,
            "category": self.category,
            "position": self.position,
            "replacement": self.replacement
        }


class RuleBasedFilterService:
    """규칙 기반 필터 서비스 클래스"""
    
    def __init__(self):
        self.kiwi = get_kiwi_instance()
        self.patterns = load_filters()  # FilterPattern 객체 리스트
        self.abbreviations = load_kiwi_abbreviations()  # 축약형 사전
        # 축약형 정규식 패턴을 미리 컴파일하여 성능 최적화
        self._abbrev_patterns = [
            (re.compile(r'\b' + re.escape(abbrev) + r'\b', re.IGNORECASE), full_form)
            for abbrev, full_form in self.abbreviations.items()
        ]
        logger.info(f"규칙 기반 필터 서비스 초기화 완료 (패턴 수: {len(self.patterns)}, 축약형: {len(self.abbreviations)}개)")
    
    def reload_patterns(self):
        """
        패턴을 다시 로드합니다 (사용자 정의 금지어 추가/삭제 후 호출).
        custom_rules.json이 변경되었을 때 실시간으로 반영하기 위해 사용됩니다.
        """
        self.patterns = load_filters()
        logger.info(f"패턴 리로드 완료: {len(self.patterns)}개 패턴")
    
    def _normalize_text_with_abbreviations(self, text: str) -> str:
        """
        축약형 사전을 사용하여 텍스트를 정규화합니다.
        미리 컴파일된 정규식 패턴을 사용하여 성능 최적화.
        
        Args:
            text: 원본 텍스트
            
        Returns:
            str: 정규화된 텍스트
        """
        normalized = text
        
        # 미리 컴파일된 패턴 사용
        for pattern, full_form in self._abbrev_patterns:
            normalized = pattern.sub(full_form, normalized)
        
        return normalized
    
    def _find_matches_with_kiwi(self, text: str, pattern_obj: FilterPattern) -> List[Tuple[int, int, str, str, str]]:
        """
        Kiwi 형태소 분석을 사용하여 패턴을 찾습니다.
        원본 텍스트에서 직접 검색하여 모든 매칭을 찾습니다.
        
        Args:
            text: 검색할 텍스트
            pattern_obj: FilterPattern 객체
            
        Returns:
            List[Tuple[int, int, str, str, str]]: (시작위치, 끝위치, 매칭텍스트, 치환어, 카테고리) 리스트
        """
        matches = []
        
        try:
            # 축약형 정규화 (매칭 확인용)
            normalized_text = self._normalize_text_with_abbreviations(text)
            
            # 원본 텍스트와 정규화된 텍스트 모두에서 검색
            if pattern_obj.compiled_pattern:
                # 1. 원본 텍스트에서 직접 검색 (가장 정확한 위치)
                for match in pattern_obj.compiled_pattern.finditer(text):
                    start_pos = match.start()
                    end_pos = match.end()
                    matched_text = match.group(0)
                    matches.append((start_pos, end_pos, matched_text, pattern_obj.label, pattern_obj.category))
                
                # 2. 정규화된 텍스트에서도 검색 (축약형이 정규화된 경우)
                # 원본 텍스트에서 찾지 못한 경우에만 정규화된 텍스트에서 찾은 결과 추가
                if normalized_text != text:
                    # 정규화된 텍스트에서 찾은 매칭 중 원본 텍스트에 없는 것만 추가
                    normalized_matches = list(pattern_obj.compiled_pattern.finditer(normalized_text))
                    for norm_match in normalized_matches:
                        matched_text = norm_match.group(0)
                        # 원본 텍스트에서 해당 텍스트를 모두 찾기
                        search_start = 0
                        while True:
                            pos = text.find(matched_text, search_start)
                            if pos == -1:
                                break
                            
                            # 이미 추가된 매칭인지 확인 (중복 방지)
                            is_duplicate = False
                            for existing_start, existing_end, existing_text, _, _ in matches:
                                if existing_start == pos and existing_end == pos + len(matched_text) and existing_text == matched_text:
                                    is_duplicate = True
                                    break
                            
                            if not is_duplicate:
                                start_pos = pos
                                end_pos = pos + len(matched_text)
                                matches.append((start_pos, end_pos, matched_text, pattern_obj.label, pattern_obj.category))
                            
                            search_start = pos + 1
        
        except Exception as e:
            logger.warning(f"Kiwi 형태소 분석 오류 ({pattern_obj.pattern}): {e}")
            # 오류 발생 시 원본 텍스트에서 직접 검색
            if pattern_obj.compiled_pattern:
                try:
                    # 원본 텍스트에서 직접 검색 (정규화 없이)
                    for match in pattern_obj.compiled_pattern.finditer(text):
                        start_pos = match.start()
                        end_pos = match.end()
                        matched_text = match.group(0)
                        matches.append((start_pos, end_pos, matched_text, pattern_obj.label, pattern_obj.category))
                except Exception as fallback_error:
                    logger.warning(f"폴백 정규식 매칭 오류 ({pattern_obj.pattern}): {fallback_error}")
        
        return matches
    
    def _is_valid_match(self, matched_text: str, category: str) -> bool:
        """
        매칭된 텍스트가 유효한지 검증합니다.
        오탐을 방지하기 위한 검증 로직입니다.
        
        Args:
            matched_text: 매칭된 텍스트
            category: 카테고리
            
        Returns:
            bool: 유효한 매칭이면 True
        """
        # 공백 제거한 실제 텍스트 길이 확인
        actual_text = matched_text.strip()
        
        # 빈 문자열 체크
        if not actual_text:
            return False
        
        # [수정됨] 길이 제한 완화: 1글자만 제외 (기존 2글자 이하 제외 로직 수정)
        if len(actual_text) < 2:
            return False
        
        # 한글 포함 여부 확인
        korean_chars = ''.join([c for c in actual_text if '\uAC00' <= c <= '\uD7A3'])
        
        # [수정됨] 길이 제한 완전 제거: len(korean_chars) <= 2 제한을 제거하여 '대회', '만듬' 등 2글자 단어도 검출 가능
        # 대학명(UNIVERSITY) 카테고리에서도 길이 제한 없이 검출
        # 영문명 패턴에서 공백이 있는 경우, 전체 단어가 매칭되었는지 확인
        if ' ' in actual_text:
            # 공백이 있는 경우, 각 단어가 최소 2글자 이상인지 확인
            words = actual_text.split()
            if any(len(w.strip()) < 2 for w in words if w.strip().isalpha()):
                return False
        
        # 영문 약칭은 최소 2글자 이상이어야 함
        if actual_text.isupper() and len(actual_text) < 2:
            return False
        
        # [수정됨] '대회'라는 단어 자체를 잡아야 하므로, PROGRAM 카테고리 예외 처리 제거
        # if category == "PROGRAM":
        #     if actual_text.strip() == "대회":
        #         return False
        
        return True
    
    def _find_matches(self, text: str) -> List[Tuple[int, int, str, str, str]]:
        """
        텍스트에서 금지어 패턴을 찾습니다.
        use_kiwi 플래그에 따라 정규식 또는 형태소 분석을 사용합니다.
        
        Args:
            text: 검색할 텍스트
            
        Returns:
            List[Tuple[int, int, str, str, str]]: (시작위치, 끝위치, 매칭텍스트, 치환어, 카테고리) 리스트
        """
        matches = []
        
        # 1. 교내 행사 순화 대상 검출 (기존 금지어 검출 이전에 처리)
        for event_term, replacement in EVENT_REPLACEMENTS.items():
            # 정확한 매칭을 위해 단어 경계를 고려한 정규식 사용
            pattern = re.compile(re.escape(event_term))
            for match in pattern.finditer(text):
                start_pos = match.start()
                end_pos = match.end()
                matched_text = match.group(0)
                
                # 유효성 검증
                if self._is_valid_match(matched_text, "EVENT"):
                    matches.append((start_pos, end_pos, matched_text, replacement, "교내행사순화"))
        
        # 오탐 방지: 특정 패턴 제외
        exclusion_patterns = [
            r'의사소통',  # '의사'를 잡지 않도록
            r'의사\s*소통',  # '의사 소통'도 제외
        ]
        
        # 모든 패턴에 대해 매칭 검색 (정적 패턴 + 사용자 정의 금지어는 필터 로더가 자동으로 포함)
        for pattern_obj in self.patterns:
            try:
                # use_kiwi가 True인 경우 형태소 분석 사용
                if pattern_obj.use_kiwi:
                    kiwi_matches = self._find_matches_with_kiwi(text, pattern_obj)
                    
                    # 제외 패턴 확인
                    filtered_matches = []
                    for start_pos, end_pos, matched_text, replacement, category in kiwi_matches:
                        # 최소 길이 및 유효성 검증
                        if not self._is_valid_match(matched_text, category):
                            continue
                        
                        # 오탐 방지: 제외 패턴 확인
                        context_start = max(0, start_pos - 2)
                        context_end = min(len(text), end_pos + 2)
                        context = text[context_start:context_end]
                        
                        is_excluded = False
                        for excl_pattern in exclusion_patterns:
                            if re.search(excl_pattern, context, re.IGNORECASE):
                                is_excluded = True
                                break
                        
                        if not is_excluded:
                            filtered_matches.append((start_pos, end_pos, matched_text, replacement, category))
                    
                    matches.extend(filtered_matches)
                    continue
                
                # use_kiwi가 False인 경우 기존 정규식 방식 사용
                if not pattern_obj.compiled_pattern:
                    continue
                
                # 정규식으로 패턴 검색 (모든 매칭을 찾기 위해 finditer 사용)
                # 같은 패턴이 여러 번 나와도 모두 찾아야 하므로, 각 패턴마다 독립적으로 검색
                pattern_matches = []
                for match in pattern_obj.compiled_pattern.finditer(text):
                    start_pos = match.start()
                    end_pos = match.end()
                    matched_text = match.group(0)
                    
                    # 최소 길이 및 유효성 검증
                    if not self._is_valid_match(matched_text, pattern_obj.category):
                        continue
                    
                    # 오탐 방지: 제외 패턴 확인
                    context_start = max(0, start_pos - 2)
                    context_end = min(len(text), end_pos + 2)
                    context = text[context_start:context_end]
                    
                    is_excluded = False
                    for excl_pattern in exclusion_patterns:
                        if re.search(excl_pattern, context, re.IGNORECASE):
                            is_excluded = True
                            break
                    
                    if is_excluded:
                        continue
                    
                    # 같은 단어가 여러 번 나와도 모두 검출해야 하므로, 중복 제거하지 않음
                    # finditer는 이미 모든 매칭을 찾아주므로, 그대로 추가
                    pattern_matches.append((start_pos, end_pos, matched_text, pattern_obj.label, pattern_obj.category))
                
                # 이 패턴에서 찾은 모든 매칭을 matches에 추가
                # 다른 패턴과의 겹침은 나중에 처리 (같은 단어가 다른 패턴으로도 매칭될 수 있으므로)
                matches.extend(pattern_matches)
            
            except re.error as e:
                logger.warning(f"정규식 패턴 오류 ({pattern_obj.pattern}): {e}")
                continue
            except Exception as e:
                logger.warning(f"패턴 매칭 오류 ({pattern_obj.pattern}): {e}")
                continue
        
        # 위치 순서대로 정렬
        matches.sort(key=lambda x: x[0])
        
        # 디버깅: 매칭 결과 로깅
        if matches:
            logger.debug(f"총 {len(matches)}개의 매칭을 찾았습니다.")
            # 같은 단어가 여러 번 나온 경우 확인
            word_counts = {}
            for start_pos, end_pos, matched_text, label, category in matches:
                if matched_text not in word_counts:
                    word_counts[matched_text] = []
                word_counts[matched_text].append(start_pos)
            
            # 같은 단어가 여러 번 나온 경우 로깅
            for word, positions in word_counts.items():
                if len(positions) > 1:
                    logger.debug(f"단어 '{word}'가 {len(positions)}번 발견됨: 위치 {positions}")
        
        return matches
    
    def _fix_postposition(self, text: str, word: str, replacement: str, word_start: int, word_end: int) -> str:
        """
        치환어에 맞는 조사를 자동으로 교정합니다.
        치환 후 문맥을 확인하여 조사를 자동으로 조정합니다.
        
        Args:
            text: 전체 텍스트
            word: 원본 단어
            replacement: 치환어
            word_start: 원본 단어의 시작 위치
            word_end: 원본 단어의 끝 위치
            
        Returns:
            str: 조사가 교정된 치환어
        """
        try:
            # 치환어 뒤의 조사 확인 (치환 후 문맥 고려)
            if word_end < len(text):
                next_text = text[word_end:word_end+3]  # 다음 3글자 확인
                
                # 조사 패턴 확인
                postposition_patterns = {
                    '이': '이', '가': '가',
                    '을': '을', '를': '를',
                    '은': '은', '는': '는',
                    '의': '의',
                    '에': '에', '에서': '에서',
                    '로': '로', '으로': '으로',
                }
                
                # 치환어의 마지막 글자 확인
                replacement_last_char = replacement[-1] if replacement else ''
                
                # 받침 유무에 따른 조사 선택
                has_batchim = False
                if replacement_last_char:
                    # 한글 받침 확인 (유니코드 범위: AC00-D7AF)
                    code = ord(replacement_last_char)
                    if 0xAC00 <= code <= 0xD7AF:
                        has_batchim = (code - 0xAC00) % 28 != 0
                
                # 다음 글자가 조사인 경우, 치환어에 맞게 조정
                for postpos_key, postpos_value in postposition_patterns.items():
                    if next_text.startswith(postpos_key):
                        # 받침이 있으면 '이/을/은/의/에/로' 사용
                        # 받침이 없으면 '가/를/는/의/에/으로' 사용
                        if has_batchim:
                            if postpos_key in ['가', '를', '는']:
                                # 받침이 있는데 '가/를/는'이 오면 '이/을/은'으로 변경
                                if postpos_key == '가':
                                    return replacement + '이'
                                elif postpos_key == '를':
                                    return replacement + '을'
                                elif postpos_key == '는':
                                    return replacement + '은'
                        else:
                            if postpos_key in ['이', '을', '은']:
                                # 받침이 없는데 '이/을/은'이 오면 '가/를/는'으로 변경
                                if postpos_key == '이':
                                    return replacement + '가'
                                elif postpos_key == '을':
                                    return replacement + '를'
                                elif postpos_key == '은':
                                    return replacement + '는'
                        break
            
            return replacement
        except Exception as e:
            logger.debug(f"조사 교정 실패 ({word} -> {replacement}): {e}")
            return replacement
    
    def _apply_replacements(self, text: str, matches: List[Tuple[int, int, str, str, str]]) -> Tuple[str, List[FilterDetection]]:
        """
        텍스트에 치환을 적용합니다.
        
        Args:
            text: 원본 텍스트
            matches: 찾은 매칭 정보 리스트
            
        Returns:
            Tuple[str, List[FilterDetection]]: (치환된 텍스트, 검출 정보 리스트)
        """
        if not matches:
            return text, []
        
        # 역순으로 치환 (뒤에서부터 치환하여 인덱스 변화 방지)
        filtered_text = text
        detections = []
        offset = 0  # 치환으로 인한 위치 변화 보정
        
        for start_pos, end_pos, matched_text, replacement, category in reversed(matches):
            # 조사 교정 (전체 텍스트와 위치 정보 전달)
            corrected_replacement = self._fix_postposition(
                text, matched_text, replacement, start_pos, end_pos
            )
            
            # 치환 적용
            filtered_text = (
                filtered_text[:start_pos + offset] + 
                corrected_replacement + 
                filtered_text[end_pos + offset:]
            )
            
            # 검출 정보 저장 (원본 위치 사용, offset 보정 전 위치)
            # 같은 단어가 여러 번 나와도 모두 저장해야 하므로, 원본 위치 그대로 사용
            detection = FilterDetection(
                word=matched_text,
                category=category,
                position=start_pos,  # 원본 텍스트에서의 위치 (offset 보정 전)
                replacement=corrected_replacement
            )
            detections.append(detection)
            
            # 오프셋 업데이트
            offset += len(corrected_replacement) - len(matched_text)
        
        # 검출 정보를 위치 순서대로 정렬 (원본 위치 기준)
        detections.sort(key=lambda x: x.position)
        
        return filtered_text, detections
    
    def filter_text(self, text: str) -> Dict:
        """
        텍스트를 필터링합니다.
        
        Args:
            text: 필터링할 텍스트
            
        Returns:
            Dict: 필터링 결과
                {
                    "original_text": str,
                    "filtered_text": str,
                    "detections": List[Dict]
                }
        """
        if not text or not text.strip():
            return {
                "original_text": text,
                "filtered_text": text,
                "detections": []
            }
        
        try:
            # 패턴 매칭
            matches = self._find_matches(text)
            logger.info(f"filter_text: 총 {len(matches)}개의 매칭을 찾았습니다.")
            
            if not matches:
                return {
                    "original_text": text,
                    "filtered_text": text,
                    "detections": []
                }
            
            # 치환 적용
            filtered_text, detections = self._apply_replacements(text, matches)
            logger.info(f"filter_text: 치환 후 {len(detections)}개의 검출 결과를 반환합니다.")
            
            # 디버깅: 검출 결과 상세 로깅
            if detections:
                word_counts = {}
                for det in detections:
                    word = det.word
                    if word not in word_counts:
                        word_counts[word] = []
                    word_counts[word].append(det.position)
                
                # 같은 단어가 여러 번 나온 경우 로깅
                for word, positions in word_counts.items():
                    if len(positions) > 1:
                        logger.info(f"  단어 '{word}'가 {len(positions)}번 검출됨: 위치 {positions}")
            
            # 결과 반환
            return {
                "original_text": text,
                "filtered_text": filtered_text,
                "detections": [det.to_dict() for det in detections]
            }
            
        except Exception as e:
            logger.error(f"필터링 중 오류 발생: {e}", exc_info=True)
            # 오류 발생 시 원본 텍스트 반환
            return {
                "original_text": text,
                "filtered_text": text,
                "detections": []
            }


# 전역 서비스 인스턴스
_filter_service_instance: Optional[RuleBasedFilterService] = None


def get_filter_service() -> RuleBasedFilterService:
    """
    필터 서비스 인스턴스를 싱글톤으로 반환합니다.
    
    Returns:
        RuleBasedFilterService: 필터 서비스 인스턴스
    """
    global _filter_service_instance
    if _filter_service_instance is None:
        _filter_service_instance = RuleBasedFilterService()
    return _filter_service_instance


def filter_text(text: str) -> Dict:
    """
    텍스트를 필터링하는 편의 함수입니다.
    
    Args:
        text: 필터링할 텍스트
        
    Returns:
        Dict: 필터링 결과
    """
    service = get_filter_service()
    return service.filter_text(text)

