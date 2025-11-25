"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getByteLength } from "@/lib/utils"
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline"

interface FilterIssue {
  id?: string // 고유 식별자
  type: 'delete' | 'modify' | 'spelling'
  position: number
  length: number
  original_text: string
  suggestion?: string
  reason: string
}

interface FilterResponse {
  filtered_content: string
  issues: FilterIssue[]
  total_issues: number
  byte_count: number
  max_bytes: number
}

export default function ContentFilterPage() {
  const [content, setContent] = useState("")
  const [filteredContent, setFilteredContent] = useState("")
  const [issues, setIssues] = useState<FilterIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [byteCount, setByteCount] = useState(0)
  const [maxBytes] = useState(2000)
  const [isFiltered, setIsFiltered] = useState(false)
  const [ruleOnly, setRuleOnly] = useState(false) // 1차 필터만 사용 옵션

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
      
      // issues의 original_text를 원본 content에서 정확히 찾아서 position 재계산
      // 단, 텍스트는 백엔드에서 받은 original_text를 그대로 사용 (위치 기반 추출 제거)
      const validatedIssues = data.issues.map((issue) => {
        const originalText = issue.original_text || ''
        if (!originalText) {
          return issue
        }
        
        // 원본 content에서 original_text의 위치만 재확인 (텍스트는 백엔드에서 받은 것 사용)
        const searchResult = findTextInContent(originalText, content, issue.position)
        if (searchResult.position !== -1) {
          // 위치만 업데이트하고, 텍스트는 백엔드에서 받은 original_text 그대로 사용
          return {
            ...issue,
            position: searchResult.position,
            length: originalText.length,  // 백엔드에서 받은 텍스트 길이 사용
            original_text: originalText  // 백엔드에서 받은 정확한 텍스트 그대로 사용
          }
        }
        
        // 못 찾으면 원래대로 반환 (텍스트는 백엔드에서 받은 것 그대로 사용)
        return {
          ...issue,
          length: originalText.length,  // 백엔드에서 받은 텍스트 길이 사용
          original_text: originalText  // 백엔드에서 받은 정확한 텍스트 그대로 사용
        }
      })
      
      // 원본과 filtered_content를 비교하여 issues에 없는 삭제된 항목 찾기
      const missingIssues: typeof validatedIssues = []
      const originalContent = content
      const filteredContent = data.filtered_content
      
      // 금지된 단어 패턴 목록
      const forbiddenPatterns = [
        /대회/g,
        /서울대|고려대|하버드|MIT|옥스포드|케임브리지/g,
        /보건복지부|환경부|통계청|YMCA|OECD|유엔|WHO|식약처|질병관리청|국민연금관리공단/g,
        /삼성|애플|구글|유튜브|틱톡|TED|인스타그램|넷플릭스/g,
        /[·]/g, // 가운뎃점
        /[""]/g, // 큰따옴표
        /[<>]/g, // < > 괄호
      ]
      
      // 원본에서 각 금지 단어를 찾아서 filtered_content에 없는지 확인
      let searchIndex = 0
      while (searchIndex < originalContent.length) {
        let foundPattern = false
        let foundText = ''
        let foundPosition = -1
        
        for (const pattern of forbiddenPatterns) {
          pattern.lastIndex = 0 // 패턴 리셋
          const match = originalContent.substring(searchIndex).match(pattern)
          if (match && match.index !== undefined) {
            const matchText = match[0]
            const matchPosition = searchIndex + match.index
            
            // 이 텍스트가 filtered_content에서 삭제되었는지 확인
            // 원본의 해당 위치 주변을 filtered_content에서 찾을 수 없으면 삭제된 것으로 간주
            const contextStart = Math.max(0, matchPosition - 20)
            const contextEnd = Math.min(originalContent.length, matchPosition + matchText.length + 20)
            const originalContext = originalContent.substring(contextStart, contextEnd)
            
            // filtered_content에서 이 문맥을 찾을 수 없거나 해당 단어가 없으면 삭제된 것으로 간주
            if (!filteredContent.includes(matchText) || !filteredContent.includes(originalContext.replace(matchText, ''))) {
              // 이미 issues에 포함되어 있는지 확인
              const alreadyInIssues = validatedIssues.some(issue => {
                const issueStart = issue.position
                const issueEnd = issue.position + issue.length
                return matchPosition >= issueStart && matchPosition + matchText.length <= issueEnd
              })
              
              if (!alreadyInIssues) {
                foundPattern = true
                foundText = matchText
                foundPosition = matchPosition
                searchIndex = matchPosition + matchText.length
                break
              }
            }
          }
        }
        
        if (foundPattern && foundPosition !== -1) {
          // 삭제된 항목을 issues에 추가
          missingIssues.push({
            type: 'delete' as const,
            position: foundPosition,
            length: foundText.length,
            original_text: foundText,
            suggestion: null,
            reason: `금지된 용어로 인해 삭제되었습니다.`
          })
        } else {
          searchIndex++
        }
      }
      
      // validatedIssues와 missingIssues를 합침 (position 기준 정렬)
      // 각 이슈에 고유 ID 부여
      const allIssues = [...validatedIssues, ...missingIssues]
        .map((issue, idx) => ({
          ...issue,
          id: issue.id || `issue-${issue.position}-${issue.type}-${issue.original_text.substring(0, 10)}-${idx}`
        }))
        .sort((a, b) => a.position - b.position)
      
      // 중복 제거: 같은 position과 original_text를 가진 이슈 제거
      const uniqueIssues: FilterIssue[] = []
      const seenIssues = new Set<string>()
      
      allIssues.forEach((issue) => {
        // position과 original_text를 조합한 고유 키 생성
        const key = `${issue.position}-${issue.original_text}-${issue.type}`
        
        // 이미 같은 키가 있으면 건너뛰기
        if (seenIssues.has(key)) {
          return
        }
        
        // 겹치는 위치의 이슈도 확인 (position이 겹치는 경우)
        const isOverlapping = uniqueIssues.some(existing => {
          const existingStart = existing.position
          const existingEnd = existing.position + existing.length
          const issueStart = issue.position
          const issueEnd = issue.position + issue.length
          
          // 완전히 겹치거나 포함되는 경우
          if (issueStart >= existingStart && issueEnd <= existingEnd) {
            return true // 완전히 포함됨
          }
          if (existingStart >= issueStart && existingEnd <= issueEnd) {
            return true // 기존 것이 완전히 포함됨
          }
          
          // 부분적으로 겹치는 경우도 중복으로 간주
          return !(issueEnd <= existingStart || issueStart >= existingEnd)
        })
        
        if (!isOverlapping) {
          seenIssues.add(key)
          uniqueIssues.push(issue)
        }
      })
      
      // 다시 position 기준으로 정렬
      uniqueIssues.sort((a, b) => a.position - b.position)
      
      setFilteredContent(data.filtered_content)
      setIssues(uniqueIssues)
      setIsFiltered(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "검열 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 텍스트 검색 헬퍼 함수 (따옴표 제거, 변형 버전 등으로 검색)
  const findTextInContent = (searchText: string, content: string, startPos: number): { position: number; length: number; actualText: string } => {
    if (!searchText) {
      return { position: -1, length: 0, actualText: '' }
    }

    // 1. 원본 텍스트 그대로 검색
    let pos = content.indexOf(searchText, Math.max(0, startPos - 50))
    if (pos !== -1) {
      return { position: pos, length: searchText.length, actualText: searchText }
    }

    // 2. 따옴표 제거한 버전으로 검색
    const withoutQuotes = searchText.replace(/['"]/g, '').trim()
    if (withoutQuotes && withoutQuotes !== searchText) {
      pos = content.indexOf(withoutQuotes, Math.max(0, startPos - 50))
      if (pos !== -1) {
        return { position: pos, length: withoutQuotes.length, actualText: withoutQuotes }
      }
    }

    // 3. 대소문자 구분 없이 검색
    const lowerSearch = searchText.toLowerCase()
    const lowerContent = content.toLowerCase()
    pos = lowerContent.indexOf(lowerSearch, Math.max(0, startPos - 50))
    if (pos !== -1) {
      // 실제 대소문자로 매칭된 텍스트 가져오기
      const actualText = content.substring(pos, pos + searchText.length)
      return { position: pos, length: actualText.length, actualText }
    }

    // 4. 따옴표 제거 + 대소문자 구분 없이 검색
    if (withoutQuotes && withoutQuotes !== searchText) {
      const lowerWithoutQuotes = withoutQuotes.toLowerCase()
      pos = lowerContent.indexOf(lowerWithoutQuotes, Math.max(0, startPos - 50))
      if (pos !== -1) {
        const actualText = content.substring(pos, pos + withoutQuotes.length)
        return { position: pos, length: actualText.length, actualText }
      }
    }

    // 못 찾으면 -1 반환
    return { position: -1, length: 0, actualText: '' }
  }

  // 이슈 클릭 시 자동 수정/삭제
  const handleIssueClick = (issue: FilterIssue, action: 'modify' | 'remove' = 'modify') => {
    // 고유 ID로 이슈 찾기
    const issueIndex = issues.findIndex(i => i.id === issue.id)
    if (issueIndex === -1) return
    
    const originalText = issue.original_text || ''
    
    // 1차 필터 결과인지 확인 (reason에 "규칙 기반 필터" 포함) - 함수 상단에서 정의
    const isRuleBasedFilter = issue.reason && issue.reason.includes("규칙 기반 필터")
    
    // 현재 컨텐츠에서 original_text 찾기 (여러 변형으로 시도)
    const searchResult = findTextInContent(originalText, content, issue.position)
    let foundPosition = searchResult.position
    const foundText = searchResult.actualText || originalText
    
    let newContent = content
    let newFilteredContent = filteredContent || content
    let offset = 0
    
    if (foundPosition !== -1 && foundText.length > 0) {
      const foundLength = foundText.length
      
      // action이 'remove'이거나 delete 타입이면 X로 치환
      if (action === 'remove' || issue.type === 'delete' || (!issue.suggestion && issue.type !== 'spelling')) {
        // 제거 또는 삭제: 글자수만큼 X로 치환
        const replacement = isRuleBasedFilter || issue.type === 'delete' || action === 'remove'
          ? 'X'.repeat(foundLength)  // 글자수만큼 X로 치환
          : ''  // 일반 삭제는 빈 문자열
        
        newContent = content.substring(0, foundPosition) + 
                     replacement + 
                     content.substring(foundPosition + foundLength)
        newFilteredContent = newContent
        offset = replacement.length - foundLength
      } else if (action === 'modify' && issue.suggestion) {
        // 수정: suggestion으로 교체
        newContent = content.substring(0, foundPosition) + 
                     issue.suggestion + 
                     content.substring(foundPosition + foundLength)
        newFilteredContent = newContent
        offset = issue.suggestion.length - foundLength
      } else {
        // suggestion이 없으면 삭제
        newContent = content.substring(0, foundPosition) + 
                     content.substring(foundPosition + foundLength)
        newFilteredContent = newContent
        offset = -foundLength
      }
    } else {
      // 찾지 못한 경우 position 기반으로 폴백
      console.warn('Original text not found, using position-based replacement')
      
      if (action === 'remove' || issue.type === 'delete' || (!issue.suggestion && issue.type !== 'spelling')) {
        const replacement = isRuleBasedFilter || issue.type === 'delete' || action === 'remove'
          ? 'X'.repeat(issue.length)  // 글자수만큼 X로 치환
          : ''
        const before = content.substring(0, issue.position)
        const after = content.substring(issue.position + issue.length)
        newContent = before + replacement + after
        newFilteredContent = newContent
        offset = replacement.length - issue.length
      } else if (action === 'modify' && issue.suggestion) {
        const before = content.substring(0, issue.position)
        const after = content.substring(issue.position + issue.length)
        newContent = before + issue.suggestion + after
        newFilteredContent = newContent
        offset = issue.suggestion.length - issue.length
      } else {
        const before = content.substring(0, issue.position)
        const after = content.substring(issue.position + issue.length)
        newContent = before + after
        newFilteredContent = newContent
        offset = -issue.length
      }
      foundPosition = issue.position
    }

    // 상태 업데이트
    setContent(newContent)
    setFilteredContent(newFilteredContent)
    const newByteCount = getByteLength(newContent)
    setByteCount(newByteCount)
    
    // 처리된 이슈 제거 및 나머지 이슈의 position 조정
    // 수정/삭제된 텍스트와 겹치는 이슈도 제거
    const actualPosition = foundPosition !== -1 ? foundPosition : issue.position
    const foundLength = foundPosition !== -1 ? foundText.length : issue.length
    
    // replacementLength 계산
    let replacementLength = issue.length
    if (action === 'modify' && issue.suggestion) {
      replacementLength = issue.suggestion.length
    } else if (action === 'remove' || issue.type === 'delete' || (!issue.suggestion && issue.type !== 'spelling')) {
      replacementLength = (isRuleBasedFilter || issue.type === 'delete' || action === 'remove') 
        ? 'X'.repeat(foundLength).length 
        : 0
    }
    
    const updatedIssues = issues
      .filter(i => {
        // 클릭한 이슈 제거
        if (i.id === issue.id) return false
        
        // 수정/삭제된 위치와 겹치는 이슈도 제거
        const issueStart = i.position
        const issueEnd = i.position + i.length
        const modifiedStart = actualPosition
        const modifiedEnd = actualPosition + replacementLength
        
        // 겹치는지 확인
        if (issueStart < modifiedEnd && issueEnd > modifiedStart) {
          return false  // 겹치면 제거
        }
        
        // 수정된 텍스트가 다른 이슈의 original_text와 일치하는지 확인
        if (action === 'modify' && issue.suggestion) {
          const modifiedText = issue.suggestion
          // 수정된 텍스트 위치에 있는 이슈 확인
          if (i.position >= modifiedStart && i.position < modifiedEnd) {
            // 수정된 텍스트와 일치하는 이슈 제거
            if (i.original_text === modifiedText) {
              return false
            }
          }
        }
        
        return true
      })
      .map(remainingIssue => {
        // position이 삭제/수정된 텍스트보다 앞이면 그대로
        if (remainingIssue.position < actualPosition) {
          return remainingIssue
        }
        // position이 삭제/수정된 텍스트보다 뒤면 offset 조정
        const newPosition = Math.max(0, remainingIssue.position + offset)
        return {
          ...remainingIssue,
          position: newPosition
        }
      })
    
    setIssues(updatedIssues)
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case "delete":
        return "bg-red-100 text-red-800 border-red-300"
      case "modify":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "spelling":
        return "bg-blue-100 text-blue-800 border-blue-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getIssueLabel = (type: string) => {
    switch (type) {
      case "delete":
        return "삭제 필요"
      case "modify":
        return "수정 필요"
      case "spelling":
        return "맞춤법 오류"
      default:
        return "문제 발견"
    }
  }

  // 텍스트에 하이라이트 적용 (원본 문서에만 하이라이트 표시)
  const renderHighlightedContent = () => {
    if (!isFiltered || issues.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>
    }

    // position 기준으로 정렬
    const sortedIssues = [...issues].sort((a, b) => a.position - b.position)

    let result: JSX.Element[] = []
    let lastIndex = 0

    sortedIssues.forEach((issue) => {
      // 백엔드에서 받은 original_text를 직접 사용
      const originalText = issue.original_text || ''
      
      // original_text가 없으면 건너뛰기
      if (!originalText) {
        return
      }
      
      // 백엔드에서 받은 position을 직접 사용 (재계산하지 않음)
      let actualPosition = issue.position
      const actualLength = originalText.length
      const actualEnd = actualPosition + actualLength
      const issueId = issue.id || `issue-${actualPosition}`

      // 원본 content에서 해당 위치의 텍스트 확인
      // 위치가 범위를 벗어나면 조정
      if (actualPosition < 0) {
        actualPosition = 0
      }
      if (actualPosition + actualLength > content.length) {
        // 범위를 벗어나면 content 끝까지로 조정
        const adjustedLength = content.length - actualPosition
        if (adjustedLength <= 0) {
          return // 유효하지 않은 위치
        }
      }
      
      // 원본 content에서 해당 위치의 텍스트 추출
      const contentAtPosition = content.substring(actualPosition, Math.min(actualPosition + actualLength, content.length))
      
      // 텍스트가 일치하지 않아도 하이라이트 표시 (백엔드에서 검출된 것이므로)
      // 단, 빈 텍스트는 건너뛰기
      if (contentAtPosition.length === 0) {
        return
      }

      // 이슈 전 텍스트 (원본 content에서 직접 추출)
      if (actualPosition > lastIndex) {
        result.push(
          <span key={`text-${issueId}`}>
            {content.substring(lastIndex, actualPosition)}
          </span>
        )
      }

      // 이슈 텍스트 (하이라이트) - 원본 content에서 해당 위치의 텍스트 직접 사용
      const issueText = content.substring(actualPosition, Math.min(actualEnd, content.length))
      
      // 1차 필터 결과인지 확인 (reason에 "규칙 기반 필터" 포함)
      const isRuleBasedFilter = issue.reason && issue.reason.includes("규칙 기반 필터")
        
      const colorClass = isRuleBasedFilter || issue.type === "delete" 
        ? "bg-red-200 text-red-900 underline decoration-red-500"  // 1차 필터는 빨간색
        : issue.type === "modify"
        ? "bg-yellow-200 text-yellow-900 underline decoration-yellow-500"
        : "bg-blue-200 text-blue-900 underline decoration-blue-500"

      // 중복 방지: lastIndex보다 앞에 있으면 겹치는 부분만 하이라이트
      if (actualPosition < lastIndex) {
        // 겹치는 경우: 이전 이슈가 끝나는 지점부터 시작
        if (actualEnd > lastIndex) {
          // 겹치는 부분만 하이라이트
          const overlapStart = lastIndex
          const overlapText = content.substring(overlapStart, Math.min(actualEnd, content.length))
          if (overlapText.length > 0) {
            result.push(
              <span
                key={`issue-${issueId}`}
                className={`${colorClass} cursor-help`}
                title={`${getIssueLabel(issue.type)}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
              >
                {overlapText}
              </span>
            )
          }
          lastIndex = Math.max(lastIndex, actualEnd)
        }
        // 완전히 포함된 경우도 하이라이트 표시 (모든 이슈를 표시하기 위해)
        else if (actualEnd <= lastIndex) {
          // 완전히 포함된 경우도 하이라이트 추가 (중복 표시되지만 모든 이슈를 보여주기 위해)
          result.push(
            <span
              key={`issue-overlap-${issueId}`}
              className={`${colorClass} cursor-help opacity-70`}
              title={`${getIssueLabel(issue.type)}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
            >
              {issueText}
            </span>
          )
        }
      } else {
        // 정상적인 경우: 하이라이트 추가 (원본 content에서 직접 추출한 텍스트 사용)
        result.push(
          <span
            key={`issue-${issueId}`}
            className={`${colorClass} cursor-help`}
            title={`${getIssueLabel(issue.type)}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
          >
            {issueText}
          </span>
        )
        lastIndex = Math.max(lastIndex, actualEnd)
      }
    })

    // 마지막 이슈 이후 텍스트 (원본 content에서 직접 추출)
    if (lastIndex < content.length) {
      result.push(
        <span key="text-end">
          {content.substring(lastIndex)}
        </span>
      )
    }

    return <div className="whitespace-pre-wrap">{result}</div>
  }

  // 검열된 텍스트에 하이라이트 적용 (검열 후 화면용)
  const renderFilteredContent = () => {
    if (!isFiltered || !filteredContent) {
      return <div className="whitespace-pre-wrap text-gray-700">{content}</div>
    }

    // issues가 있으면 하이라이트 적용
    if (issues.length === 0) {
      return <div className="whitespace-pre-wrap text-gray-700">{filteredContent}</div>
    }

    const sortedIssues = [...issues].sort((a, b) => a.position - b.position)
    let result: JSX.Element[] = []
    let lastIndex = 0

    sortedIssues.forEach((issue) => {
      // 백엔드에서 받은 original_text를 직접 사용 (위치 기반 추출 제거)
      const originalText = issue.original_text || ''
      
      // original_text가 없으면 건너뛰기
      if (!originalText) {
        return
      }
      
      // 위치는 하이라이트 위치 확인용으로만 사용
      const searchResult = findTextInContent(originalText, content, issue.position)
      let actualPosition = searchResult.position !== -1 ? searchResult.position : issue.position
      const actualText = originalText  // 백엔드에서 받은 정확한 텍스트 사용
      const actualLength = originalText.length

      // filteredContent에서 해당 텍스트 찾기 (더 넓은 범위에서 검색)
      let filteredPosition = filteredContent.indexOf(actualText, Math.max(0, lastIndex - 100))
      
      // 찾지 못한 경우, 삭제된 텍스트일 수 있으므로 건너뛰기
      if (filteredPosition === -1) {
        // 삭제된 항목은 표시하지 않음
        return
      }

      const actualEnd = filteredPosition + actualLength

      // 이슈 전 텍스트
      if (filteredPosition > lastIndex) {
        result.push(
          <span key={`text-${issue.id || actualPosition}`}>
            {filteredContent.substring(lastIndex, filteredPosition)}
          </span>
        )
      }

      // 이슈 텍스트 (하이라이트) - 백엔드에서 받은 original_text 직접 사용
      const colorClass = issue.type === "delete" 
        ? "bg-red-200 text-red-900 underline decoration-red-500"
        : issue.type === "modify"
        ? "bg-yellow-200 text-yellow-900 underline decoration-yellow-500"
        : "bg-blue-200 text-blue-900 underline decoration-blue-500"

      if (filteredPosition >= lastIndex) {
        const issueText = actualText  // 위치 기반 추출 대신 original_text 직접 사용
        const issueId = issue.id || `issue-${actualPosition}`
        
        result.push(
          <span
            key={`issue-wrapper-${issueId}`}
            className="relative inline-block"
          >
            {/* 인라인 수정/삭제 버튼 - 텍스트 위에 표시 */}
            <span className="absolute -top-6 left-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              {issue.suggestion && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleIssueClick(issue, 'modify')
                  }}
                  className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg hover:bg-gray-700 whitespace-nowrap"
                  title={`수정: ${issue.suggestion}`}
                >
                  <PencilIcon className="w-3 h-3 inline mr-1" />
                  수정
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleIssueClick(issue, 'remove')
                }}
                className="bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg hover:bg-red-700 whitespace-nowrap"
                title="제거"
              >
                <TrashIcon className="w-3 h-3 inline mr-1" />
                {issue.type === 'delete' ? '삭제' : '제거'}
              </button>
            </span>
            <span
              key={`issue-${issueId}`}
              className={`${colorClass} cursor-help relative group inline-block`}
              title={`${getIssueLabel(issue.type)}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
            >
              {issueText}
            </span>
          </span>
        )
        lastIndex = Math.max(lastIndex, actualEnd)
      }
    })

    // 마지막 이슈 이후 텍스트
    if (lastIndex < filteredContent.length) {
      result.push(
        <span key="text-end">
          {filteredContent.substring(lastIndex)}
        </span>
      )
    }

    return <div className="whitespace-pre-wrap text-gray-700">{result}</div>
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
                    variant="outline"
                    onClick={() => {
                      setIsFiltered(false)
                    }}
                    className="flex-1"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    돌아가기
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
                      // 백엔드에서 받은 original_text를 직접 사용 (위치 기반 추출 제거)
                      const displayText = issue.original_text || ''
                      
                      // original_text가 없으면 건너뛰기
                      if (!displayText) {
                        return null
                      }
                      
                      const issueId = issue.id || `issue-${issue.position}-${issue.type}`
                      
                      return (
                        <div
                          key={issueId}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          {/* 입력 내용 */}
                          <div className="mb-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
                          <div className="flex space-x-2 pt-3 border-t border-gray-100">
                            {issue.suggestion && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIssueClick(issue, 'modify')}
                                className="flex-1 text-xs"
                              >
                                <PencilIcon className="w-3 h-3 mr-1" />
                                수정
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleIssueClick(issue, 'remove')}
                              className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                            >
                              <TrashIcon className="w-3 h-3 mr-1" />
                              {issue.type === 'delete' ? '삭제' : '제거'}
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
  )
}

