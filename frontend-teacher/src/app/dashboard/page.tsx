'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BookOpenIcon,
    ChartBarIcon,
    ClipboardDocumentListIcon,
    ShieldCheckIcon,
    UserGroupIcon
} from "@heroicons/react/24/outline";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserInfo } from '@/lib/auth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface User {
  id: number;
  name: string;
  email: string;
  user_type: string;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const userInfo = getUserInfo();
      if (userInfo) {
        setUser(userInfo);
      }
    }
  }, [isAuthenticated]);

  return (
    <ProtectedRoute>
      {authLoading ? (
        <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-godding-primary rounded-full mb-4 shadow-lg">
              <span className="text-xl font-bold text-white">고</span>
            </div>
            <p className="text-godding-text-secondary">로딩 중...</p>
          </div>
        </div>
      ) : (
        <DashboardContent user={user} />
      )}
    </ProtectedRoute>
  );
}

function DashboardContent({ user }: { user: User | null }) {

  const features = [
    {
      name: "세특 작성",
      description: "구글폼과 LLM을 활용한 학생 세특 자동 작성 도구",
      icon: ClipboardDocumentListIcon,
      href: "/sae-teuk",
      color: "bg-blue-500",
    },
    {
      name: "과목 수요 조사",
      description: "학생들의 과목 선택 수요를 체계적으로 조사하고 분석",
      icon: ChartBarIcon,
      href: "/subject-survey",
      color: "bg-green-500",
    },
    {
      name: "정독실",
      description: "자율학습실 관리 및 학생 출입 관리 시스템",
      icon: BookOpenIcon,
      href: "/study-room",
      color: "bg-purple-500",
    },
    {
      name: "야자 출첵",
      description: "야간자율학습 출석 체크 및 관리 시스템",
      icon: UserGroupIcon,
      href: "/attendance",
      color: "bg-orange-500",
    },
    {
      name: "세특 검열",
      description: "학생 세특 내용의 부적절한 단어 검열 시스템",
      icon: ShieldCheckIcon,
      href: "/content-filter",
      color: "bg-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary">
      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-godding-text-primary mb-4">
            교사 관리 대시보드
          </h2>
          <p className="text-xl text-godding-text-secondary">
            고교학점제 시대, 교사들의 든든한 파트너
          </p>
        </div>

        {/* 기능 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Link key={feature.name} href={feature.href}>
              <Card className="h-full bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:bg-white transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-2xl">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-godding-text-primary">{feature.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-godding-text-secondary text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 사용자 정보 카드 */}
        <div className="mt-12 max-w-md mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-godding-card-border">
            <CardHeader>
              <CardTitle className="text-lg text-godding-text-primary">사용자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-godding-text-secondary">이름:</span>
                <span className="text-godding-text-primary font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-godding-text-secondary">이메일:</span>
                <span className="text-godding-text-primary font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-godding-text-secondary">사용자 유형:</span>
                <span className="text-godding-text-primary font-medium">{user?.user_type}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
