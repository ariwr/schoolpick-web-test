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
  ArrowPathIcon
} from "@heroicons/react/24/outline"

interface FilterIssue {
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
      const validatedIssues = data.issues.map((issue) => {
        const originalText = issue.original_text || ''
        if (!originalText) {
          return issue
        }
        
        // 원본 content에서 original_text 찾기
        const searchResult = findTextInContent(originalText, content, issue.position)
        if (searchResult.position !== -1) {
          // 실제 찾은 위치와 텍스트로 업데이트
          return {
            ...issue,
            position: searchResult.position,
            length: searchResult.length,
            original_text: searchResult.actualText || originalText
          }
        }
        
        // 못 찾으면 원래대로 반환
        return issue
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
      const allIssues = [...validatedIssues, ...missingIssues].sort((a, b) => a.position - b.position)
      
      setFilteredContent(data.filtered_content)
      setIssues(allIssues)
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
  const handleIssueClick = (issue: FilterIssue, issueIndex: number) => {
    // original_text를 직접 찾아서 교체하는 방식 사용 (position 기반보다 정확함)
    const originalText = issue.original_text || ''
    
    // 현재 컨텐츠에서 original_text 찾기 (여러 변형으로 시도)
    const searchResult = findTextInContent(originalText, content, issue.position)
    let foundPosition = searchResult.position
    const foundText = searchResult.actualText || originalText
    
    let newContent = content
    let newFilteredContent = filteredContent || content
    let offset = 0
    
    if (foundPosition !== -1 && foundText.length > 0) {
      const foundLength = foundText.length
      if (issue.type === 'delete') {
        // 삭제 타입: 해당 텍스트 제거
        newContent = content.substring(0, foundPosition) + 
                     content.substring(foundPosition + foundLength)
        newFilteredContent = newContent
        offset = -foundLength
      } else if (issue.suggestion) {
        // 수정/맞춤법 타입: suggestion으로 교체
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
      if (issue.type === 'delete' || !issue.suggestion) {
        const before = content.substring(0, issue.position)
        const after = content.substring(issue.position + issue.length)
        newContent = before + after
        newFilteredContent = newContent
        offset = -issue.length
      } else {
        const before = content.substring(0, issue.position)
        const after = content.substring(issue.position + issue.length)
        newContent = before + issue.suggestion + after
        newFilteredContent = newContent
        offset = issue.suggestion.length - issue.length
      }
      foundPosition = issue.position
    }

    // 상태 업데이트
    setContent(newContent)
    setFilteredContent(newFilteredContent)
    const newByteCount = getByteLength(newContent)
    setByteCount(newByteCount)
    
    // 처리된 이슈 제거 및 나머지 이슈의 position 조정
    const updatedIssues = issues
      .filter((_, i) => i !== issueIndex) // 클릭한 이슈 제거
      .map(remainingIssue => {
        // 실제 교체된 위치 기준으로 조정
        const actualPosition = foundPosition !== -1 ? foundPosition : issue.position
        
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

  // 텍스트에 하이라이트 적용
  const renderHighlightedContent = () => {
    if (!isFiltered || issues.length === 0) {
      return <p className="whitespace-pre-wrap">{content}</p>
    }

    // position 기준으로 정렬 (이미 validatedIssues로 재계산된 position 사용)
    const sortedIssues = [...issues].sort((a, b) => a.position - b.position)

    let result: JSX.Element[] = []
    let lastIndex = 0

    sortedIssues.forEach((issue, idx) => {
      // validatedIssues에서 이미 실제 위치와 텍스트로 재계산되었으므로 직접 사용
      // 하지만 한번 더 검증하여 정확도 향상
      const originalText = issue.original_text || ''
      let actualPosition = issue.position
      let actualText = originalText
      let actualLength = issue.length
      
      // 실제 컨텐츠에서 해당 위치의 텍스트 확인
      const actualContentText = content.substring(actualPosition, Math.min(actualPosition + actualLength, content.length))
      
      // original_text가 실제 컨텐츠와 정확히 일치하는지 확인
      if (actualContentText === originalText) {
        // 일치하면 그대로 사용
        actualText = originalText
      } else if (originalText.length > 0) {
        // 다르면 다시 찾기 (더 넓은 범위에서 검색)
        const searchResult = findTextInContent(originalText, content, Math.max(0, actualPosition - 100))
        if (searchResult.position !== -1) {
          actualPosition = searchResult.position
          actualText = searchResult.actualText
          actualLength = searchResult.length
        } else {
          // 그래도 못 찾으면 실제 컨텐츠의 텍스트 사용 (가장 가까운 것)
          actualText = actualContentText || originalText
        }
      } else {
        // original_text가 없으면 position 기반으로
        actualText = actualContentText
      }
      
      const actualEnd = actualPosition + actualLength

      // 이슈 전 텍스트
      if (actualPosition > lastIndex) {
        result.push(
          <span key={`text-${idx}`}>
            {content.substring(lastIndex, actualPosition)}
          </span>
        )
      }

      // 이슈 텍스트 (하이라이트) - 실제 찾은 텍스트 사용
      const issueText = actualText
        
      const colorClass = issue.type === "delete" 
        ? "bg-red-200 text-red-900 underline decoration-red-500"
        : issue.type === "modify"
        ? "bg-yellow-200 text-yellow-900 underline decoration-yellow-500"
        : "bg-blue-200 text-blue-900 underline decoration-blue-500"

      // 중복 방지: lastIndex보다 앞에 있으면 건너뛰기
      if (actualPosition < lastIndex) {
        // 겹치는 경우: 이전 이슈가 끝나는 지점부터 시작
        if (actualEnd > lastIndex) {
          // 겹치는 부분만 하이라이트
          const overlapStart = lastIndex
          const overlapText = content.substring(overlapStart, Math.min(actualEnd, content.length))
          if (overlapText.length > 0) {
            result.push(
              <span
                key={`issue-${idx}`}
                className={`${colorClass} cursor-help`}
                title={`${getIssueLabel(issue.type)}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
              >
                {overlapText}
              </span>
            )
          }
          lastIndex = Math.max(lastIndex, actualEnd)
        }
        // 완전히 포함된 경우는 건너뛰기
      } else {
        // 정상적인 경우: 하이라이트 추가
        result.push(
          <span
            key={`issue-${idx}`}
            className={`${colorClass} cursor-help`}
            title={`${getIssueLabel(issue.type)}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
          >
            {issueText}
          </span>
        )
        lastIndex = actualEnd
      }
    })

    // 마지막 이슈 이후 텍스트
    if (lastIndex < content.length) {
      result.push(
        <span key="text-end">
          {content.substring(lastIndex)}
        </span>
      )
    }

    return <p className="whitespace-pre-wrap">{result}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 입력 영역 */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
            <CardHeader>
              <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                <DocumentTextIcon className="w-5 h-5" />
                <span>세특 내용 입력</span>
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
                  placeholder="세특 내용을 입력하세요..."
                  rows={15}
                  className="resize-none"
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className={`font-medium ${
                    byteCount > maxBytes ? 'text-red-600' : 
                    byteCount > maxBytes * 0.9 ? 'text-yellow-600' : 
                    'text-gray-600'
                  }`}>
                    바이트: {byteCount} / {maxBytes}
                  </span>
                  {byteCount > maxBytes && (
                    <span className="text-red-600 font-bold">
                      초과: {byteCount - maxBytes}바이트
                    </span>
                  )}
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
                    세특 검열하기
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

          {/* 검열 결과 영역 */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
            <CardHeader>
              <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                <ShieldCheckIcon className="w-5 h-5" />
                <span>검열 결과</span>
                {isFiltered && issues.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    {issues.length}개 문제 발견
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-godding-text-secondary">
                {isFiltered 
                  ? "검열된 결과와 발견된 문제들을 확인하세요"
                  : "검열 버튼을 클릭하면 결과가 표시됩니다"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isFiltered ? (
                <div className="text-center py-12 text-godding-text-secondary">
                  <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>검열 결과가 여기에 표시됩니다</p>
                </div>
              ) : (
                <>
                  {/* 검열된 내용 표시 */}
                  <div className="p-4 bg-white/50 rounded-lg border border-gray-200 min-h-[200px] max-h-[400px] overflow-y-auto">
                    <div className="text-sm font-medium text-godding-text-primary mb-2">
                      원본 내용 (문제 부분 하이라이트):
                    </div>
                    <div className="text-sm text-godding-text-secondary">
                      {renderHighlightedContent()}
                    </div>
                  </div>

                  {/* 검열된 최종 내용 */}
                  {filteredContent && filteredContent !== content && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 min-h-[100px] max-h-[200px] overflow-y-auto">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          검열된 최종 내용:
                        </span>
                      </div>
                      <div className="text-sm text-green-900 whitespace-pre-wrap">
                        {filteredContent}
                      </div>
                    </div>
                  )}

                  {/* 문제 목록 */}
                  {issues.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      <div className="text-sm font-medium text-godding-text-primary mb-2">
                        발견된 문제 ({issues.length}개):
                      </div>
                      {issues.map((issue, idx) => {
                        // 실제 content에서 해당 위치의 텍스트 확인 (카드와 하이라이트 매칭을 위해)
                        const cardOriginalText = issue.original_text || ''
                        const cardPosition = issue.position
                        const cardTextFromContent = content.substring(
                          cardPosition, 
                          Math.min(cardPosition + (issue.length || cardOriginalText.length), content.length)
                        )
                        // 실제 매칭되는 텍스트 찾기
                        const cardSearchResult = findTextInContent(cardOriginalText, content, cardPosition)
                        const displayText = cardSearchResult.actualText || cardTextFromContent || cardOriginalText
                        
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${getIssueColor(issue.type)} cursor-pointer hover:opacity-80 hover:shadow-md transition-all`}
                            onClick={() => handleIssueClick(issue, idx)}
                            title={`클릭하여 ${issue.type === 'delete' ? '삭제' : issue.suggestion ? '수정' : '처리'}하기`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-bold">
                                {getIssueLabel(issue.type)}
                              </span>
                              <span className="text-xs">
                                위치: {cardSearchResult.position !== -1 ? cardSearchResult.position : issue.position}번째 문자
                              </span>
                            </div>
                            <div className="text-sm font-medium mb-1">
                              "{displayText}"
                            </div>
                            {issue.suggestion && (
                              <div className="text-sm mb-1 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                <span className="text-gray-600">대치어: </span>
                                <span className="font-medium text-blue-700">{issue.suggestion}</span>
                              </div>
                            )}
                            <div className="text-xs mt-1 opacity-75">
                              {issue.reason}
                            </div>
                            <div className="text-xs mt-2 pt-2 border-t border-opacity-20 text-center text-blue-600 font-semibold">
                              클릭하여 {issue.type === 'delete' ? '삭제' : '수정'}하기 →
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                      <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-800 font-medium">
                        문제가 발견되지 않았습니다!
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

