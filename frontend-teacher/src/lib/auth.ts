/**
 * 인증 관련 유틸리티 함수
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * 토큰이 유효한지 확인
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    return response.ok
  } catch (error) {
    console.error('토큰 검증 오류:', error)
    return false
  }
}

/**
 * 현재 로그인 상태 확인
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  const token = localStorage.getItem('token')
  const userInfo = localStorage.getItem('userInfo')
  
  return !!(token && userInfo)
}

/**
 * 토큰 가져오기
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

/**
 * 사용자 정보 가져오기
 */
export function getUserInfo(): any | null {
  if (typeof window === 'undefined') return null
  
  const userInfo = localStorage.getItem('userInfo')
  if (!userInfo) return null
  
  try {
    return JSON.parse(userInfo)
  } catch (error) {
    console.error('사용자 정보 파싱 오류:', error)
    return null
  }
}

/**
 * 로그아웃 처리
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return
  
  const token = getToken()
  
  // 백엔드에 로그아웃 요청 (선택사항)
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      })
    } catch (error) {
      // 백엔드 로그아웃 실패해도 프론트엔드에서는 로그아웃 처리
      console.error('로그아웃 요청 오류:', error)
    }
  }
  
  // 로컬 스토리지 정리
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  sessionStorage.removeItem('has_logged_in')
  
  // 인증 상태 변경 이벤트 발생
  window.dispatchEvent(new Event('authStateChange'))
}

/**
 * 보호된 페이지인지 확인
 */
export function isProtectedPath(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/night-study',
    '/sae-teuk',
    '/study-room',
    '/subject-survey',
    '/attendance',
    '/content-filter',
  ]
  
  return protectedPaths.some(path => pathname.startsWith(path))
}

/**
 * 공개 페이지인지 확인
 */
export function isPublicPath(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/find-account',
  ]
  
  return publicPaths.includes(pathname)
}

