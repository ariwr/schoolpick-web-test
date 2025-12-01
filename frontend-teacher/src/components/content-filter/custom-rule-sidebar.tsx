"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline"

interface CustomRule {
  id: number
  word: string
  replacement: string
  created_at: string
}

interface CustomRuleSidebarProps {
  onRulesChange?: () => void
}

export default function CustomRuleSidebar({ onRulesChange }: CustomRuleSidebarProps) {
  const [rules, setRules] = useState<CustomRule[]>([])
  const [newWord, setNewWord] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // 금지어 목록 조회
  const fetchRules = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/api/custom-rules`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        // 실제 HTTP 상태 코드와 에러 메시지 확인
        let errorMessage = `서버 오류 (${response.status})`
        try {
          const errorData = await response.json()
          console.error("백엔드 에러 응답:", errorData) // 디버깅용
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch (jsonError) {
          // JSON 파싱 실패 시 텍스트로 읽기 시도
          try {
            const textData = await response.text()
            console.error("백엔드 에러 응답 (텍스트):", textData) // 디버깅용
            errorMessage = textData || `HTTP ${response.status}: ${response.statusText || '알 수 없는 오류'}`
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText || '알 수 없는 오류'}`
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setRules(data)
    } catch (err) {
      // 네트워크 오류와 서버 오류 구분
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(`서버에 연결할 수 없습니다. 백엔드 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
      } else {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      }
      console.error("금지어 목록 조회 오류:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // 금지어 추가
  const handleAddRule = async () => {
    if (!newWord.trim()) {
      setError("금지어를 입력해주세요.")
      return
    }

    const wordToAdd = newWord.trim()
    const tempId = Date.now() // 임시 ID
    
    // 낙관적 업데이트: 서버 응답 전에 UI 업데이트
    const optimisticRule: CustomRule = {
      id: tempId,
      word: wordToAdd,
      replacement: "XXX",
      created_at: new Date().toISOString()
    }
    
    setRules(prev => [...prev, optimisticRule])
    setNewWord("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/custom-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: wordToAdd,
          replacement: "XXX",
        }),
      })

      if (!response.ok) {
        // 실패 시 롤백
        setRules(prev => prev.filter(r => r.id !== tempId))
        let errorMessage = `서버 오류 (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || '알 수 없는 오류'}`
        }
        throw new Error(errorMessage)
      }

      const newRule = await response.json()
      // 서버에서 받은 실제 데이터로 교체
      setRules(prev => prev.map(r => r.id === tempId ? newRule : r))
      
      // 부모 컴포넌트에 변경 알림 (비동기로 처리하여 UI 블로킹 방지)
      if (onRulesChange) {
        setTimeout(() => onRulesChange(), 0)
      }
    } catch (err) {
      // 에러 발생 시 롤백
      setRules(prev => prev.filter(r => r.id !== tempId))
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(`서버에 연결할 수 없습니다. 백엔드 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
      } else {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      }
      console.error("금지어 추가 오류:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // 금지어 삭제
  const handleDeleteRule = async (id: number) => {
    // 낙관적 업데이트: 삭제 전 목록 확인 제거하고 즉시 UI 업데이트
    const ruleToDelete = rules.find(r => r.id === id)
    if (!ruleToDelete) return
    
    setRules(prev => prev.filter(r => r.id !== id))
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/custom-rules/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        // 실패 시 롤백
        setRules(prev => [...prev, ruleToDelete].sort((a, b) => a.id - b.id))
        
        // 404 에러는 이미 삭제된 것으로 간주하고 무시
        if (response.status === 404) {
          return
        }
        
        let errorMessage = `서버 오류 (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || '알 수 없는 오류'}`
        }
        throw new Error(errorMessage)
      }

      // 부모 컴포넌트에 변경 알림 (비동기로 처리하여 UI 블로킹 방지)
      if (onRulesChange) {
        setTimeout(() => onRulesChange(), 0)
      }
    } catch (err) {
      // 에러 발생 시 롤백
      setRules(prev => [...prev, ruleToDelete].sort((a, b) => a.id - b.id))
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(`서버에 연결할 수 없습니다. 백엔드 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
      } else {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      }
      console.error("금지어 삭제 오류:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Enter 키로 추가
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleAddRule()
    }
  }

  // 컴포넌트 마운트 시 목록 조회
  useEffect(() => {
    fetchRules()
  }, [])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">사용자 정의 금지어</CardTitle>
        <CardDescription className="text-xs">
          직접 금지어를 등록하여 검열에 사용할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* 추가 입력 영역 */}
        <div className="flex gap-2">
          <Input
            placeholder="금지어 입력"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleAddRule}
            disabled={isLoading || !newWord.trim()}
            size="sm"
            className="shrink-0"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* 금지어 목록 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && rules.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              로딩 중...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              등록된 금지어가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 flex-1">
                    {rule.word}
                  </span>
                  <Button
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={isLoading}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

