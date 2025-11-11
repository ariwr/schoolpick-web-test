"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * 토큰 검증 컴포넌트
 * 앱 시작 시 토큰을 검증하고, 유효하지 않으면 자동으로 제거합니다.
 */
export default function TokenValidator() {
  const router = useRouter()
  const pathname = usePathname()
  
  // 로그인 페이지는 제외
  const isLoginPage = pathname === '/login' || pathname === '/register' || pathname === '/find-account'

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isLoginPage) return // 로그인 페이지에서는 검증하지 않음

    const validateToken = async () => {
      const token = localStorage.getItem('token')
      const userInfo = localStorage.getItem('userInfo')
      
      // 토큰이 없으면 검증 불필요
      if (!token || !userInfo) {
        return
      }

      // 개발 환경에서 토큰 초기화 옵션
      // 개발 환경에서는 기본적으로 토큰을 초기화하여 깨끗한 상태로 시작
      // 단, 로그인 성공 후에는 토큰을 유지 (sessionStorage로 체크)
      // NEXT_PUBLIC_CLEAR_TOKEN_ON_START=false로 설정하면 토큰 유지
      const isDevelopment = process.env.NODE_ENV === 'development'
      const hasLoggedIn = sessionStorage.getItem('has_logged_in') === 'true'
      const shouldClearToken = process.env.NEXT_PUBLIC_CLEAR_TOKEN_ON_START !== 'false' && isDevelopment && !hasLoggedIn
      
      if (shouldClearToken) {
        console.log('개발 모드: 토큰 초기화 (깨끗한 상태로 시작)')
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        window.dispatchEvent(new Event('authStateChange'))
        
        // 보호된 페이지에 있으면 로그인 페이지로 리다이렉트
        const protectedPaths = ['/dashboard', '/night-study', '/sae-teuk', '/study-room', '/subject-survey', '/attendance']
        if (protectedPaths.some(path => pathname.startsWith(path))) {
          router.push('/login')
        }
        return
      }

      // 토큰 유효성 검증 (간단한 API 호출)
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // 빠른 실패를 위한 짧은 타임아웃
          signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
          // 401 또는 다른 인증 오류인 경우 토큰 제거
          if (response.status === 401 || response.status === 403) {
            console.log('토큰이 유효하지 않습니다. 자동 로그아웃합니다.')
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            window.dispatchEvent(new Event('authStateChange'))
            
            // 현재 페이지가 보호된 페이지인 경우에만 로그인 페이지로 리다이렉트
            const protectedPaths = ['/dashboard', '/night-study', '/sae-teuk', '/study-room', '/subject-survey', '/attendance']
            if (protectedPaths.some(path => pathname.startsWith(path))) {
              router.push('/login')
            }
          }
        }
      } catch (error) {
        // 네트워크 오류나 타임아웃인 경우는 토큰을 유지
        // (서버가 실행되지 않았을 수 있으므로)
        console.log('토큰 검증 중 오류 발생 (네트워크 오류일 수 있음):', error)
        // 토큰은 유지하고 계속 진행
      }
    }

    validateToken()
  }, [router, pathname, isLoginPage])

  return null // UI를 렌더링하지 않음
}

