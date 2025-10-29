"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  BookOpenIcon, 
  UserGroupIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline"

const navigation = [
  { name: "세특 작성", href: "/sae-teuk", icon: ClipboardDocumentListIcon },
  { name: "과목 수요 조사", href: "/subject-survey", icon: ChartBarIcon },
  { name: "정독실", href: "/study-room", icon: BookOpenIcon },
  { name: "야자 출첵", href: "/attendance", icon: UserGroupIcon },
  { name: "세특 검열", href: "/content-filter", icon: ShieldCheckIcon },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-godding-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                <span className="text-white font-bold text-lg">고</span>
              </div>
              <div>
                <span className="text-xl font-bold text-white">고딩픽 교사용</span>
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
            <Button variant="glass" size="sm">
              로그인
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
