"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isProtectedPath, isPublicPath, validateToken, getToken, logout } from "@/lib/auth"

/**
 * 토큰 검증 컴포넌트
 * 앱 시작 시 토큰을 검증하고, 유효하지 않으면 자동으로 제거합니다.
 */
export default function TokenValidator() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // 공개 페이지는 검증하지 않음
    if (isPublicPath(pathname)) return

    // 보호된 페이지는 ProtectedRoute에서 처리하므로 여기서는 리다이렉트하지 않음
    // ProtectedRoute에서 모달을 표시하고 사용자 확인 후 리다이렉트 처리

    // 토큰이 있으면 백그라운드에서 검증 (페이지 렌더링을 막지 않음)
    const validateTokenInBackground = async () => {
      const token = getToken()
      const userInfo = localStorage.getItem('userInfo')
      
      // 토큰이 없으면 ProtectedRoute에서 처리하므로 여기서는 리다이렉트하지 않음
      if (!token || !userInfo) {
        // ProtectedRoute에서 모달을 표시하고 처리하므로 여기서는 아무것도 하지 않음
        return
      }

      // 개발 환경에서 토큰 초기화 옵션 (선택사항)
      const isDevelopment = process.env.NODE_ENV === 'development'
      const hasLoggedIn = sessionStorage.getItem('has_logged_in') === 'true'
      const shouldClearToken = process.env.NEXT_PUBLIC_CLEAR_TOKEN_ON_START !== 'false' && isDevelopment && !hasLoggedIn
      
      if (shouldClearToken) {
        console.log('개발 모드: 토큰 초기화 (깨끗한 상태로 시작)')
        await logout()
        
        // ProtectedRoute에서 모달을 표시하고 처리하므로 여기서는 리다이렉트하지 않음
        // 대신 인증 상태 변경 이벤트만 발생시킴
        window.dispatchEvent(new Event('authStateChange'))
        return
      }

      // 토큰 유효성 검증 (백그라운드에서 비동기로 수행)
      try {
        const isValid = await validateToken(token)
        
        if (!isValid) {
          console.log('토큰이 유효하지 않습니다. 자동 로그아웃합니다.')
          await logout()
          
          // ProtectedRoute에서 모달을 표시하고 처리하므로 여기서는 리다이렉트하지 않음
          // 대신 인증 상태 변경 이벤트만 발생시킴
          window.dispatchEvent(new Event('authStateChange'))
        }
      } catch (error) {
        // 네트워크 오류나 타임아웃인 경우는 토큰을 유지
        // (서버가 실행되지 않았을 수 있으므로)
        console.log('토큰 검증 중 오류 발생 (네트워크 오류일 수 있음):', error)
        // 토큰은 유지하고 계속 진행
      }
    }

    // 백그라운드에서 검증 (페이지 렌더링을 막지 않음)
    validateTokenInBackground()
  }, [router, pathname])

  return null // UI를 렌더링하지 않음
}

