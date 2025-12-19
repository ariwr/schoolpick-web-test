"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BookOpenIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  SparklesIcon,
  DocumentArrowDownIcon
} from "@heroicons/react/24/outline";

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
    name: "세특 점검",
    description: "학생 세특 내용의 부적절한 단어 점검 시스템",
    icon: ShieldCheckIcon,
    href: "/content-filter",
    color: "bg-red-500",
  },
  {
    name: "시간표 생성",
    description: "교육과정과 시간표의 모순을 해결하는 스마트 배정 시스템",
    icon: DocumentArrowDownIcon,
    href: "/schedule-creation",
    color: "bg-indigo-500",
  },
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');

    setIsAuthenticated(!!(token && userInfo));

    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      const userInfo = localStorage.getItem('userInfo');
      setIsAuthenticated(!!(token && userInfo));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChange', handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-godding-text-primary mb-6">
            스쿨픽 교사용
          </h1>
          <p className="text-xl md:text-2xl text-godding-text-secondary mb-4 max-w-4xl mx-auto leading-relaxed">
            고교학점제 도입에 따른 교사들을 위한 통합 관리 플랫폼
          </p>
          <p className="text-lg text-godding-text-secondary mb-12 max-w-3xl mx-auto">
            <span className="font-semibold text-godding-text-primary">세특 작성부터 과목 수요 조사까지</span> 모든 것을 한 곳에서
          </p>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-4">
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  로그인하기
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                더 알아보기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-godding-text-primary mb-6">
            주요 기능
          </h2>
          <p className="text-xl text-godding-text-secondary">
            교사들의 업무 효율성을 높이는 다양한 도구들을 제공합니다
          </p>
        </div>

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
      </div>
    </div>
  );
}
