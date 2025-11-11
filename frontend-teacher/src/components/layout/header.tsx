"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  BookOpenIcon, 
  UserGroupIcon,
  ShieldCheckIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline"

const navigation = [
  { name: "세특 작성", href: "/sae-teuk", icon: ClipboardDocumentListIcon },
  { name: "과목 수요 조사", href: "/subject-survey", icon: ChartBarIcon },
  { name: "정독실", href: "/study-room", icon: BookOpenIcon },
  { name: "야자 출첵", href: "/night-study", icon: MoonIcon },
  { name: "세특 검열", href: "/content-filter", icon: ShieldCheckIcon },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    // 로그인 상태 확인
    const checkAuth = () => {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('token')
      const userInfo = localStorage.getItem('userInfo')
      
      if (token && userInfo) {
        setIsAuthenticated(true)
        try {
          const parsedUser = JSON.parse(userInfo)
          setUserName(parsedUser.name || parsedUser.username || null)
        } catch (error) {
          console.error('사용자 정보 파싱 오류:', error)
        }
      } else {
        setIsAuthenticated(false)
        setUserName(null)
      }
    }

    checkAuth()

    // localStorage 변경 감지를 위한 이벤트 리스너
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    
    // 커스텀 이벤트로 로그인 상태 변경 감지 (다른 탭이나 컴포넌트에서 발생)
    window.addEventListener('authStateChange', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChange', handleStorageChange)
    }
  }, [])

  // pathname이 변경될 때마다 인증 상태 다시 확인 (페이지 이동 시)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const token = localStorage.getItem('token')
    const userInfo = localStorage.getItem('userInfo')
    
    setIsAuthenticated(!!(token && userInfo))
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo)
        setUserName(parsedUser.name || parsedUser.username || null)
      } catch (error) {
        setUserName(null)
      }
    } else {
      setUserName(null)
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    setIsAuthenticated(false)
    setUserName(null)
    
    // 다른 컴포넌트에 인증 상태 변경 알림
    window.dispatchEvent(new Event('authStateChange'))
    
    router.push('/login')
  }

  return (
    <header className="bg-godding-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div>
                <span className="text-xl font-bold text-white">스쿨픽 교사용</span>
                <p className="text-xs text-white/80">교사들을 위한 통합 관리 플랫폼</p>
              </div>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/20 backdrop-blur-sm text-white border border-white/30"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {userName && (
                  <span className="text-white/90 text-sm hidden sm:inline">
                    {userName}님
                  </span>
                )}
                <Button 
                  variant="glass" 
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>로그아웃</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="glass" size="sm">
                  로그인
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
