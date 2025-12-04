'use client'

import { useRouter, usePathname } from 'next/navigation'
import { isProtectedPath, isAuthenticated as checkAuth } from '@/lib/auth'
import LoginRequiredModal from './LoginRequiredModal'
import { useState, useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 보호된 라우트 컴포넌트
 * 인증되지 않은 사용자에게 로그인 확인 모달을 표시하고 로그인 페이지로 리다이렉트합니다.
 * Hydration 오류 방지를 위해 클라이언트 마운트 후에만 인증 체크를 수행합니다.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // 클라이언트 마운트 후에만 인증 체크 수행 (Hydration 오류 방지)
  useEffect(() => {
    setIsMounted(true)
    
    // 보호된 페이지인지 확인
    if (!isProtectedPath(pathname)) {
      setShouldRender(true)
      setShowModal(false)
      return
    }

    // 인증 상태 체크
    const authenticated = checkAuth()
    
    if (!authenticated) {
      // 인증되지 않았으면 모달 표시
      setShouldRender(false)
      setShowModal(true)
    } else {
      setShouldRender(true)
      setShowModal(false)
    }
  }, [pathname])

  // 모달 확인 핸들러
  const handleConfirm = () => {
    router.replace('/login')
  }

  // 모달 취소 핸들러 (홈으로 이동)
  const handleCancel = () => {
    router.replace('/')
  }

  // 서버와 클라이언트 초기 렌더링 일치를 위해 마운트 전에는 children을 렌더링
  // (인증 체크는 useEffect에서 수행되므로 초기에는 일단 렌더링)
  return (
    <>
      {/* 로그인 필요 모달 */}
      {isMounted && showModal && (
        <LoginRequiredModal
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* 인증 체크 완료 후에만 조건부 렌더링 */}
      {isMounted && !shouldRender ? null : <>{children}</>}
    </>
  )
}

