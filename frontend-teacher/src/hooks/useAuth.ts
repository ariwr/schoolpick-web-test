'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated, validateToken, getToken, isProtectedPath, logout as authLogout } from '@/lib/auth'

/**
 * 인증 상태를 관리하는 훅
 * 최적화: 초기 상태는 동기적으로 설정하고, 토큰 검증은 백그라운드에서 수행
 */
export function useAuth() {
  const router = useRouter()
  const pathname = usePathname()
  
  // 초기 인증 상태를 동기적으로 체크 (서버 사이드에서는 false)
  const initialAuth = useMemo(() => {
    if (typeof window === 'undefined') return false
    return isAuthenticated()
  }, [])
  
  const [isAuth, setIsAuth] = useState(initialAuth)
  const [isLoading, setIsLoading] = useState(false) // 초기 로딩 상태를 false로 설정

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // 초기 상태 설정 (동기적)
    setIsAuth(initialAuth)
    setIsLoading(false)

    // 토큰이 있으면 백그라운드에서 유효성 검증 (비동기)
    const token = getToken()
    if (token && initialAuth) {
      // 백그라운드에서 토큰 검증 (페이지 렌더링을 막지 않음)
      validateToken(token).then((isValid) => {
        if (!isValid) {
          // 토큰이 유효하지 않으면 로그아웃 처리
          authLogout().then(() => {
            setIsAuth(false)
            
            if (isProtectedPath(pathname)) {
              router.replace('/login')
            }
          })
        } else {
          setIsAuth(true)
        }
      }).catch((error) => {
        console.error('인증 확인 오류:', error)
        // 네트워크 오류 등은 무시하고 현재 상태 유지
      })
    }

    // 인증 상태 변경 감지
    const handleAuthChange = () => {
      const currentAuth = isAuthenticated()
      setIsAuth(currentAuth)
      
      // ProtectedRoute에서 모달을 표시하고 처리하므로 여기서는 리다이렉트하지 않음
      // 상태만 업데이트
    }

    window.addEventListener('authStateChange', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      window.removeEventListener('authStateChange', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [router, pathname, initialAuth])

  return { isAuthenticated: isAuth, isLoading }
}

