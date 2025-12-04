"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getByteLength } from "@/lib/utils"
import CustomRuleSidebar from "@/components/content-filter/custom-rule-sidebar"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { 
  ShieldCheckIcon, 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline"

// 1. 데이터 모델 정의 (심각도 severity 추가)
interface FilterIssue {
  id: string; // 필수: 고유 ID (백엔드에서 없으면 프론트에서 생성)
  type: 'delete' | 'modify' | 'spelling';
  severity: 'critical' | 'warning'; // critical: 빨강(삭제필수), warning: 노랑(검토)
  position: number;
  length: number;
  original_text: string;
  suggestion?: string;
  reason: string;
  source?: 'rule_based' | 'llm'; // 검열 소스 (rule_based: 1차 규칙 기반, llm: 2차 LLM)
  
  // 하이라이트와 카드에서 사용할 표시 정보 (객체 기반)
  displayText?: string;      // 카드에 표시할 텍스트
  displayStart?: number;      // 하이라이트 시작 위치
  displayEnd?: number;        // 하이라이트 끝 위치
}

interface FilterResponse {
  filtered_content: string;
  issues: FilterIssue[];
  total_issues: number;
  byte_count: number;
  max_bytes: number;
}

// 텍스트 구간을 나타내는 객체 (객체 기반 매핑)
interface TextSegment {
  id: string;           // 고유 ID
  start: number;        // 시작 위치
  end: number;          // 끝 위치
  text: string;         // 해당 구간의 텍스트
  issue?: FilterIssue;  // 연결된 이슈 (호환성 유지용, style.primaryIssue 사용 권장)
  type: 'normal' | 'issue'; // 구간 타입
  
  // 스타일 정보 (객체 기반 - 구간 생성 시 결정)
  style?: {
    className: string;        // 완성된 CSS 클래스
    severity: 'critical' | 'warning' | 'spelling' | 'mixed'; // 혼합 상태
    hasCritical: boolean;
    hasWarning: boolean;
    allIssues: FilterIssue[];  // 해당 구간의 모든 이슈
    primaryIssue: FilterIssue; // 클릭 시 이동할 이슈 (우선순위 최고)
  };
}

function ContentFilterPageContent() {
  const [content, setContent] = useState("")
  const [filteredContent, setFilteredContent] = useState("")
  const [issues, setIssues] = useState<FilterIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [byteCount, setByteCount] = useState(0)
  const [maxBytes] = useState(2000)
  const [isFiltered, setIsFiltered] = useState(false)
  const [ruleOnly, setRuleOnly] = useState(false)
  
  // 로딩 중인 이슈 ID 추적 (UX 개선)
  const [processingIssueIds, setProcessingIssueIds] = useState<Set<string>>(new Set())

  const handleContentChange = (value: string) => {
    setContent(value)
    const bytes = getByteLength(value)
    setByteCount(bytes)
    setIsFiltered(false)
    setFilteredContent("")
    setIssues([])
    setError(null)
  }

  const handleFilter = async () => {
    if (!content.trim()) {
      setError("검열할 내용을 입력해주세요.")
      return
    }

    const bytes = getByteLength(content)
    if (bytes > maxBytes) {
      setError(`내용이 최대 바이트 수(${maxBytes}바이트)를 초과했습니다. 현재: ${bytes}바이트`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      // API URL 유효성 검사
      if (!API_BASE_URL) {
        throw new Error("API 서버 주소가 설정되지 않았습니다.")
      }

      let response
      try {
        response = await fetch(`${API_BASE_URL}/api/content-filter/filter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content,
            max_bytes: maxBytes,
            rule_only: ruleOnly,
          }),
        })
      } catch (fetchError) {
        // 네트워크 오류 처리
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error(`서버에 연결할 수 없습니다. 백엔드 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
        }
        throw new Error(`요청 실패: ${fetchError instanceof Error ? fetchError.message : '알 수 없는 오류'}`)
      }

      if (!response.ok) {
        let errorMessage = "검열 중 오류가 발생했습니다."
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          // JSON 파싱 실패 시 상태 텍스트 사용
          errorMessage = `서버 오류 (${response.status}): ${response.statusText || '알 수 없는 오류'}`
        }
        throw new Error(errorMessage)
      }

      let data: FilterResponse
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error("서버 응답을 파싱할 수 없습니다.")
      }
      
      // [객체 기반 설정 1] 백엔드 데이터를 있는 그대로 객체화 (위치 재검색 X)
      // 모든 이슈에 고유 ID가 없다면 여기서 강제로 부여하여 '객체'로서 관리
      const initializedIssues = data.issues.map((issue, idx) => {
        // severity 추론 로직 개선
        let inferredSeverity: 'critical' | 'warning' = 'warning'; // 기본값을 warning으로 변경
        
        if (issue.severity) {
          // 백엔드에서 severity가 있으면 그대로 사용
          inferredSeverity = issue.severity;
        } else {
          // severity가 없으면 type과 reason으로 추론
          if (issue.type === 'delete') {
            inferredSeverity = 'critical';
          } else if (issue.type === 'modify') {
            // modify 타입은 기본적으로 warning (교내 행사 순화 등)
            inferredSeverity = 'warning';
          } else if (issue.type === 'spelling') {
            inferredSeverity = 'critical'; // 맞춤법은 critical
          } else {
            inferredSeverity = 'warning'; // 기본값
          }
        }
        
        return {
          ...issue,
          id: issue.id || `issue-${idx}-${Date.now()}`, // 고유 ID 보장
          severity: inferredSeverity,
          source: issue.source || (issue.reason?.includes('규칙 기반 필터') ? 'rule_based' : 'llm') // 검열 소스 설정
        };
      }).sort((a, b) => a.position - b.position); // 위치 순 정렬 필수
      
      // 모든 이슈가 로드된 후 확장 정보 계산 (하이라이트와 카드에서 동일하게 사용)
      const expandedIssues = initializedIssues.map(issue => 
        expandIssueForDisplay(issue, initializedIssues, content)
      );
      
      setFilteredContent(data.filtered_content)
      setIssues(expandedIssues)
      setIsFiltered(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "검열 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 디바운스 타이머 ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 사용자 정의 금지어 변경 시 검열 재실행 (디바운싱 적용)
  const handleRulesChange = useCallback(() => {
    if (isFiltered && content.trim()) {
      // 디바운싱: 500ms 내에 여러 번 호출되면 마지막 호출만 실행
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        // 이미 검열된 상태면 자동으로 재검열
        handleFilter()
      }, 500)
    }
  }, [isFiltered, content, handleFilter])

  // 모든 수정사항을 자동으로 적용하는 함수
  const handleApplyAll = () => {
    if (issues.length === 0) {
      // 이슈가 없으면 아무 작업도 하지 않음
      return;
    }

    let finalContent = content;
    // displayEnd/displayStart 우선, 없으면 position/length로 (뒤에서부터 적용)
    const sortedIssues = [...issues].sort((a, b) => {
      const aEnd = (a.displayEnd ?? (a.position + a.length));
      const bEnd = (b.displayEnd ?? (b.position + b.length));
      return bEnd - aEnd;
    });
    sortedIssues.forEach((issue) => {
      const issueStart = issue.displayStart ?? issue.position;
      const issueEnd = issue.displayEnd ?? (issue.position + issue.length);
      const currentText = finalContent.substring(issueStart, issueEnd);
      // 공백/따옴표 등 양 끝 문자 무시하고 비교 (이슈에 따라 따옴표 붙는 케이스 대비)
      const normalizedCurrent = currentText.trim().replace(/^['"]|['"]$/g, '');
      const normalizedOriginal = (issue.original_text || issue.displayText || '').trim().replace(/^['"]|['"]$/g, '');
      if (
        normalizedCurrent !== normalizedOriginal &&
        currentText !== issue.original_text &&
        currentText !== issue.displayText // displayText 매칭도 허용
      ) {
        return;
      }
      let replacement = '';
      if (issue.type === 'modify' && issue.suggestion) {
        replacement = issue.suggestion;
      } else if (issue.type === 'delete' || issue.severity === 'critical') {
        replacement = '';
      } else if (issue.suggestion) {
        replacement = issue.suggestion;
      } else {
        replacement = '';
      }
      finalContent = finalContent.substring(0, issueStart) + replacement + finalContent.substring(issueEnd);
    });
    setContent(finalContent);
    setFilteredContent(finalContent);
    setByteCount(getByteLength(finalContent));
    setIssues([]);
  };

  // [객체 기반 설정 2] 클릭 핸들러 - 인덱스 검색이 아닌 'ID 기반' 처리 + '좌표 이동'
  const handleIssueClick = async (targetIssue: FilterIssue, action: 'modify' | 'remove' = 'modify') => {
    if (processingIssueIds.has(targetIssue.id)) return; // 이미 처리 중

    // 1. 현재 상태의 최신 이슈 객체 찾기 (ID로 조회)
    const currentIssueIndex = issues.findIndex(i => i.id === targetIssue.id);
    if (currentIssueIndex === -1) return;
    
    const currentIssue = issues[currentIssueIndex];
    
    // 2. 텍스트 검증: 현재 content의 해당 위치에 그 단어가 실제로 있는지 확인
    // (사용자가 텍스트를 직접 수정했을 수도 있으므로 안전장치)
    const textInContent = content.substring(
        currentIssue.position, 
        currentIssue.position + currentIssue.length
    );
    // 위치가 어긋났다면? -> 이 이슈는 무효화(화면에서 제거)하거나 전체 재검사 유도
    if (textInContent !== currentIssue.original_text) {
        alert("문서 내용이 변경되어 해당 이슈의 위치를 찾을 수 없습니다. 다시 검열해주세요.");
        setIssues(prev => prev.filter(i => i.id !== targetIssue.id)); // 안전하게 제거
        return;
    }

    // 로딩 상태 시작
    setProcessingIssueIds(prev => new Set(prev).add(targetIssue.id));

    try {
        let newTextSegment = "";
        let needsRefine = false;
        
        // [로직 분기] 
        // A. 1차 검열(Critical) 삭제 시 -> XXX 치환 후 문맥 교정
        if (!ruleOnly && action === 'remove' && currentIssue.severity === 'critical') {
            newTextSegment = "XXX";
            needsRefine = true;
        } 
        // B. 수정(Suggestion) 적용 시
        else if (action === 'modify' && currentIssue.suggestion) {
            newTextSegment = currentIssue.suggestion;
        }
        // C. 일반 삭제 (Warning 등) -> 빈 문자열
        else {
            newTextSegment = "";
        }

        // 3. 텍스트 변경 적용 (Slice & Concat)
        const prefix = content.substring(0, currentIssue.position);
        const suffix = content.substring(currentIssue.position + currentIssue.length);
        const tempContent = prefix + newTextSegment + suffix;

        // 4. [핵심] 좌표 이동 (Coordinate Shifting)
        // 변경된 길이 차이만큼 뒤에 있는 모든 이슈들의 position을 조정해야 함
        const lengthDiff = newTextSegment.length - currentIssue.length;
        
        // 우선 UI에 반영 (낙관적 업데이트)
        setContent(tempContent);
        setFilteredContent(tempContent); // 교정 문서도 동기화
        setByteCount(getByteLength(tempContent));

        // 이슈 목록 업데이트: 처리된 이슈 제거 + 나머지 이슈 좌표 이동 (displayStart/displayEnd 포함)
        let nextIssues = issues
          .filter(i => i.id !== targetIssue.id)
          .map(i => {
            const issueStart = i.displayStart ?? i.position;
            const issueEnd = i.displayEnd ?? (i.position + i.length);
            const currentStart = currentIssue.displayStart ?? currentIssue.position;
            const currentEnd = currentIssue.displayEnd ?? (currentIssue.position + currentIssue.length);
            
            // 겹치는 이슈 처리: 현재 이슈와 겹치면 제거
            if (issueStart < currentEnd && issueEnd > currentStart) {
              return null;
            }
            
            // 좌표 업데이트 (position, displayStart, displayEnd 모두)
            let updatedPosition = i.position;
            let updatedDisplayStart = issueStart;
            let updatedDisplayEnd = issueEnd;
            
            if (i.position > currentIssue.position) {
              updatedPosition += lengthDiff;
            }
            if (issueStart > currentIssue.position) {
              updatedDisplayStart += lengthDiff;
            }
            if (issueEnd > currentIssue.position) {
              updatedDisplayEnd += lengthDiff;
            }
            
            return {
              ...i,
              position: updatedPosition,
              displayStart: updatedDisplayStart,
              displayEnd: updatedDisplayEnd,
              displayText: i.original_text, // displayText도 명시적으로 설정
            };
          })
          .filter(i => i !== null) as FilterIssue[];

        setIssues(nextIssues);
        
        // 하이브리드 방식: 복잡한 경우 자동 재검열 (디바운스)
        // 문맥 교정이 필요하거나 남은 이슈가 많으면 자동 재검열
        if (needsRefine || nextIssues.length > 10) {
          // 디바운스: 500ms 후 재검열 (사용자가 빠르게 여러 번 클릭해도 마지막에만 실행)
          setTimeout(() => {
            if (isFiltered && tempContent.trim()) {
              handleFilter();
            }
          }, 500);
        }

        // 5. 문맥 교정이 필요한 경우 (비동기 LLM 호출)
        if (needsRefine) {
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                const refineRes = await fetch(`${API_BASE_URL}/api/content-filter/refine`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: tempContent }),
                });

                if (refineRes.ok) {
                    const refineData = await refineRes.json();
                    // 교정된 전체 텍스트로 업데이트
                    setContent(refineData.refined_text);
                    setFilteredContent(refineData.refined_text);
                    setByteCount(getByteLength(refineData.refined_text));
                    
                    // 하이브리드 방식: 문맥 교정 후 자동 재검열 (텍스트가 크게 바뀌었으므로)
                    setTimeout(() => {
                      if (isFiltered && refineData.refined_text.trim()) {
                        handleFilter();
                      }
                    }, 300);
                }
            } catch (e) {
                console.error("Refine failed", e);
                // 실패 시 fallback: XXX를 그냥 빈칸으로 변경
                const fallbackText = prefix + "" + suffix; // 빈 문자열
                setContent(fallbackText);
                setFilteredContent(fallbackText);
                setByteCount(getByteLength(fallbackText));
                
                // 좌표 다시 계산 (XXX(3글자) -> ""(0글자) 이므로 -3만큼 추가 이동)
                const fallbackDiff = -3; 
                setIssues(prev => prev.map(i => {
                    if (i.position > currentIssue.position) {
                        return { ...i, position: i.position + fallbackDiff };
                    }
                    return i;
                }));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        setProcessingIssueIds(prev => {
            const next = new Set(prev);
            next.delete(targetIssue.id);
            return next;
        });
    }
  }

  // [구간 분할 방식] 우선순위 점수 계산 헬퍼 함수
  const getSeverityScore = (severity: string): number => {
    if (severity === 'critical') return 3;
    if (severity === 'warning') return 2;
    return 1; // spelling 등
  };

  // 이슈 확장 로직을 공통 함수로 분리 (하이라이트와 카드에서 동일하게 사용)
  const expandIssueForDisplay = useCallback((issue: FilterIssue, allIssues: FilterIssue[], content: string): FilterIssue => {
    return {
      ...issue,
      displayText: issue.original_text,
      displayStart: issue.position,
      displayEnd: issue.position + issue.length,
    };
  }, []);

  // [객체 기반] 스타일 결정 로직을 별도 함수로 분리 (severity 기반 단순화)
  const determineSegmentStyle = (
    activeIssues: FilterIssue[], 
    segmentStart: number,
    segmentEnd: number,
    allIssues: FilterIssue[],
    content: string
  ): TextSegment['style'] | undefined => {
    if (activeIssues.length === 0) {
      return undefined; // 일반 텍스트
    }

    // 우선순위: Critical > Warning
    const sortedActive = [...activeIssues].sort((a, b) => {
      return getSeverityScore(b.severity) - getSeverityScore(a.severity);
    });
    const primaryIssue = sortedActive[0];

    // 가장 높은 severity 기준 색상
    const highestSeverity = primaryIssue.severity;

    let className = "";
    let severity: 'critical' | 'warning' | 'spelling' | 'mixed' = 'warning';

    if (highestSeverity === 'critical') {
      className = "bg-red-100 text-red-900";
      severity = 'critical';
    } else {
      className = "bg-yellow-100 text-yellow-900";
      severity = 'warning';
    }

    // 검열 소스 정보 유지 (카드와 동일 정보)
    const ruleBasedIssues = activeIssues.filter(i => i.source === 'rule_based');
    const llmIssues = activeIssues.filter(i => i.source === 'llm');
    const hasRuleBased = ruleBasedIssues.length > 0;
    const hasLlm = llmIssues.length > 0;

    return {
      className,
      severity,
      hasCritical: hasRuleBased || highestSeverity === 'critical',
      hasWarning: hasLlm || highestSeverity === 'warning',
      allIssues: activeIssues,
      primaryIssue
    };
  };

  // [구간 분할 방식] 텍스트를 구간 객체 배열로 변환하는 함수 (겹침 처리 포함)
  const createTextSegments = useCallback((content: string, issues: FilterIssue[]): TextSegment[] => {
    const segments: TextSegment[] = [];
    
    if (issues.length === 0) {
      // 이슈가 없으면 전체를 일반 텍스트로
      segments.push({
        id: 'normal-0-full',
        start: 0,
        end: content.length,
        text: content,
        type: 'normal'
      });
      return segments;
    }
    
    // issues는 이미 displayStart, displayEnd가 설정된 상태 (expandIssueForDisplay에서 계산됨)
    // 하이라이트는 displayStart/displayEnd를 사용하고, 원본 position/length는 유지
    
    // 1. 모든 경계점(Boundary) 수집 (시작점, 끝점) - displayStart/displayEnd 사용
    const boundaries = new Set<number>([0, content.length]);
    
    issues.forEach(issue => {
      // displayStart, displayEnd가 있으면 사용, 없으면 원본 position 사용
      const start = issue.displayStart ?? issue.position;
      const end = issue.displayEnd ?? (issue.position + issue.length);
      
      // 범위 검사 (텍스트 길이 내에 있는지)
      const safeStart = Math.max(0, Math.min(start, content.length));
      const safeEnd = Math.max(0, Math.min(end, content.length));
      
      // 유효한 구간만 추가
      if (safeStart < safeEnd) {
        boundaries.add(safeStart);
        boundaries.add(safeEnd);
      }
    });
    
    // 2. 경계점 정렬
    const sortedPoints = Array.from(boundaries).sort((a, b) => a - b);
    
    // 3. 각 구간별로 처리
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      const segmentText = content.substring(start, end);
      
      // 빈 구간은 건너뛰기
      if (!segmentText) continue;
      
      // 현재 구간을 포함하는 모든 이슈 찾기 (displayStart/displayEnd 사용)
      const activeIssues = issues.filter(issue => {
        const issueStart = issue.displayStart ?? issue.position;
        const issueEnd = issue.displayEnd ?? (issue.position + issue.length);
        
        // 이슈 구간이 현재 세그먼트와 겹칠 때
        // (이슈가 세그먼트를 완전히 포함하거나, 세그먼트가 이슈를 포함하거나, 부분적으로 겹치는 경우)
        return issueStart < end && issueEnd > start;
      });
      
      if (activeIssues.length === 0) {
        // 이슈 없는 일반 텍스트
        segments.push({
          id: `normal-${start}-${end}`,
          start,
          end,
          text: segmentText,
          type: 'normal'
        });
      } else {
        // [객체 기반] 스타일 결정 (인접 이슈 정보 포함)
        const style = determineSegmentStyle(activeIssues, start, end, issues, content);
        
        if (style) {
          // 이슈 구간 (스타일 정보 포함)
          segments.push({
            id: `issue-${style.primaryIssue.id}-${start}-${end}`,
            start,
            end,
            text: segmentText,
            issue: style.primaryIssue, // 호환성 유지
            type: 'issue',
            style // 스타일 정보 포함
          });
        }
      }
    }
    
    return segments;
  }, []);

  // [구간 분할 방식] 렌더링 - 겹치는 이슈도 정확하게 처리
  const renderHighlightedContent = () => {
    if (!isFiltered || issues.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
    }

    // 텍스트를 구간 객체 배열로 변환 (겹침 처리 포함)
    const segments = createTextSegments(content, issues);
    
    // 구간 객체들을 JSX로 렌더링
    return (
      <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
        {segments.map((segment) => {
          if (segment.type === 'normal') {
            // 일반 텍스트 구간
            return (
              <span key={segment.id}>
                {segment.text}
          </span>
            );
          } else {
            // [객체 기반] 구간 객체의 스타일 정보만 사용
            const style = segment.style!;
            const isProcessing = processingIssueIds.has(style.primaryIssue.id);
            
            // 모든 관련 이슈의 reason 결합
            const reasons = style.allIssues.map((i: FilterIssue) => i.reason).join(' | ');
            
            return (
          <span
                key={segment.id}
                className={`${style.className} cursor-pointer transition-all px-0.5 rounded mx-0.5 ${
                  isProcessing ? 'opacity-50 animate-pulse' : 'hover:opacity-80'
                }`}
                title={`${reasons} (클릭 시 카드 이동)`}
                  onClick={(e) => {
                  e.stopPropagation();
                  // 해당 이슈 카드로 스크롤 이동
                  const card = document.getElementById(`card-${style.primaryIssue.id}`);
                  if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // 카드 깜빡임 효과
                    card.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
                    setTimeout(() => {
                      card.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500');
                    }, 1500);
                  }
                }}
              >
                {segment.text}
            </span>
            );
          }
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-godding-text-primary">세특 검열</h1>
              <p className="text-lg text-godding-text-secondary mt-2">
                ChatGPT를 활용한 세특 내용 검열 시스템 (최대 {maxBytes}바이트)
              </p>
            </div>
          </div>
        </div>

        {/* 레이아웃: 사이드바 + 메인 컨텐츠 */}
        <div className="flex gap-6">
          {/* 좌측 사이드바 (PC에서만 표시, 검열 전에만 표시) */}
          {!isFiltered && (
            <div className="hidden md:block w-80 shrink-0">
              <CustomRuleSidebar onRulesChange={handleRulesChange} />
            </div>
          )}

          {/* 우측 메인 컨텐츠 */}
          <div className="flex-1 min-w-0">
        {!isFiltered ? (
          /* 검열 전: 입력 화면만 표시 */
          <div className="max-w-3xl mx-auto">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>원문</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  검열할 세특 내용을 입력하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="내용을 입력해 주세요."
                    rows={20}
                    className="resize-none text-base"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className={`font-medium ${
                      byteCount > maxBytes ? 'text-red-600' : 
                      byteCount > maxBytes * 0.9 ? 'text-yellow-600' : 
                      'text-gray-600'
                    }`}>
                      {byteCount}자
                    </span>
                  </div>
                  {maxBytes && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          byteCount > maxBytes ? 'bg-red-500' : 
                          byteCount > maxBytes * 0.9 ? 'bg-yellow-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((byteCount / maxBytes) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 1차 필터만 사용 옵션 */}
                <div className="flex items-center space-x-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="ruleOnly"
                    checked={ruleOnly}
                    onChange={(e) => setRuleOnly(e.target.checked)}
                    className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="ruleOnly" className="text-sm font-medium text-yellow-800 cursor-pointer">
                    테스트 모드: 1차 규칙 기반 필터만 사용 (ChatGPT 건너뛰기)
                  </label>
                </div>

                <Button
                  onClick={handleFilter}
                  disabled={!content.trim() || isLoading || byteCount > maxBytes}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      검열 중...
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="w-4 h-4 mr-2" />
                      세특검열하기
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* 검열 후: 좌우 분할 화면 */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 교정 문서 */}
            <Card className="bg-white backdrop-blur-sm border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    교정 문서
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{getByteLength(filteredContent || content)}자</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(filteredContent || content)
                      }}
                      className="h-7 px-2"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[500px] max-h-[700px] overflow-y-auto">
                  {renderHighlightedContent()}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setContent("")
                      setFilteredContent("")
                      setIssues([])
                      setIsFiltered(false)
                      setError(null)
                      setByteCount(0)
                    }}
                    className="flex-1"
                  >
                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                    새글쓰기
                  </Button>
                  <Button
                    onClick={handleApplyAll}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    적용하기
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(filteredContent || content)
                    }}
                    className="flex-1"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                    복사하기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 오른쪽: 맞춤법/문법 오류 목록 */}
            <Card className="bg-white backdrop-blur-sm border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-800">
                  맞춤법/문법 오류 {issues.length}개
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  발견된 문제를 확인하고 수정하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {issues.length > 0 ? (
                  <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
                    {issues.map((issue) => {
                      // 검출된 단어만 표시 (확장된 텍스트 대신 original_text 사용)
                      const displayText = issue.original_text;
                      
                      if (!displayText) {
                        return null
                      }
                      
                      const isProcessing = processingIssueIds.has(issue.id);
                      
                      return (
                        <div
                          id={`card-${issue.id}`} // 스크롤 이동을 위한 ID
                          key={issue.id} // 객체 ID 사용
                          className={`bg-white border rounded-lg p-4 transition-all shadow-sm
                            ${issue.severity === 'critical' ? 'border-red-200 bg-red-50/30' : 
                              issue.severity === 'warning' ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}
                            ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'}
                          `}
                        >
                          {/* 입력 내용 */}
                          <div className="mb-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${
                                issue.severity === 'critical' ? 'bg-red-500' : 
                                issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}></div>
                              <span className="text-xs font-medium text-gray-600">입력 내용</span>
                            </div>
                            <div className="text-sm font-medium text-gray-800 pl-4">
                              "{displayText}"
                            </div>
                          </div>

                          {/* 대치어 (수정 제안이 있는 경우) */}
                          {issue.suggestion && (
                            <div className="mb-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <PencilIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-medium text-gray-600">대치어</span>
                              </div>
                              <div className="text-sm font-medium text-blue-700 pl-4">
                                {issue.suggestion}
                              </div>
                            </div>
                          )}

                          {/* 도움말 */}
                          <div className="mb-3">
                            <span className="text-xs font-medium text-gray-600">도움말</span>
                            <div className="text-xs text-gray-600 mt-1 pl-4">
                              {issue.reason}
                            </div>
                          </div>

                          {/* 액션 버튼 */}
                          <div className="flex space-x-2 pt-3 border-t border-gray-100/50 mt-3">
                            {/* 수정 버튼 */}
                            {issue.suggestion && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIssueClick(issue, 'modify')}
                                disabled={isProcessing}
                                className="flex-1 text-xs h-8"
                              >
                                <PencilIcon className="w-3 h-3 mr-1.5" />
                                수정
                              </Button>
                            )}
                            
                            {/* 삭제 버튼 */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleIssueClick(issue, 'remove')}
                              disabled={isProcessing}
                              className={`flex-1 text-xs h-8 ${
                                issue.severity === 'critical' 
                                ? 'text-red-600 border-red-200 hover:bg-red-50' 
                                : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {isProcessing ? (
                                <ArrowPathIcon className="w-3 h-3 mr-1.5 animate-spin" />
                              ) : (
                                <TrashIcon className="w-3 h-3 mr-1.5" />
                              )}
                              {isProcessing ? '처리 중...' : '삭제'}
                            </Button>
                          </div>

                          {/* 오류 제보 링크 */}
                          <div className="mt-2 text-right">
                            <button className="text-xs text-gray-400 hover:text-gray-600">
                              ◀ 오류 제보
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 font-medium">
                      문제가 발견되지 않았습니다!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContentFilterPage() {
  return (
    <ProtectedRoute>
      <ContentFilterPageContent />
    </ProtectedRoute>
  )
}
