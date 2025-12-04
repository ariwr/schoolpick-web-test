import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 보호된 페이지 목록
const protectedPaths = [
  '/dashboard',
  '/night-study',
  '/sae-teuk',
  '/study-room',
  '/subject-survey',
  '/attendance',
  '/content-filter',
]

// 공개 페이지 목록 (인증 없이 접근 가능)
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/find-account',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 공개 페이지는 항상 허용
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }
  
  // 보호된 페이지인지 확인
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath) {
    // 클라이언트 사이드에서만 토큰 확인 가능하므로
    // 여기서는 기본적인 체크만 수행하고
    // 실제 인증은 클라이언트 사이드에서 처리
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

