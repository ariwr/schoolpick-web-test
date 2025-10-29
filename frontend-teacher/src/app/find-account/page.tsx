'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function FindAccountPage() {
  const [activeTab, setActiveTab] = useState<'id' | 'password'>('id');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: 실제 계정 찾기 로직 구현
    console.log('Find account:', { type: activeTab, data: formData });
    
    // 임시 로딩 시뮬레이션
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <Link 
            href="/login" 
            className="inline-flex items-center text-godding-text-secondary hover:text-godding-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            로그인으로 돌아가기
          </Link>
        </div>

        {/* 로고 섹션 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-godding-primary rounded-full mb-4 shadow-lg">
            <span className="text-xl font-bold text-white">고</span>
          </div>
          <h1 className="text-2xl font-bold text-godding-text-primary mb-2">고딩픽</h1>
          <p className="text-godding-text-secondary text-sm">교사용</p>
        </div>

        {/* 계정 찾기 폼 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-8">
          <h2 className="text-xl font-semibold text-godding-text-primary text-center mb-6">계정 찾기</h2>
          
          {/* 탭 버튼 */}
          <div className="flex mb-6 bg-godding-secondary rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('id')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'id'
                  ? 'bg-white text-godding-primary shadow-sm'
                  : 'text-godding-text-secondary hover:text-godding-text-primary'
              }`}
            >
              아이디 찾기
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'password'
                  ? 'bg-white text-godding-primary shadow-sm'
                  : 'text-godding-text-secondary hover:text-godding-text-primary'
              }`}
            >
              비밀번호 찾기
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'id' ? (
              <>
                {/* 아이디 찾기 폼 */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-godding-text-primary">
                    이름
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-godding-text-primary">
                    이메일
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>
              </>
            ) : (
              <>
                {/* 비밀번호 찾기 폼 */}
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-godding-text-primary">
                    아이디
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-godding-text-primary">
                    이름
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-godding-text-primary">
                    휴대폰 번호
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="휴대폰 번호를 입력하세요"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="h-11"
                  />
                </div>
              </>
            )}

            {/* 찾기 버튼 */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold mt-6"
              disabled={isLoading}
            >
              {isLoading ? '찾는 중...' : `${activeTab === 'id' ? '아이디' : '비밀번호'} 찾기`}
            </Button>
          </form>
        </div>

        {/* 하단 정보 */}
        <div className="text-center mt-6 text-xs text-godding-text-secondary">
          <p>문의사항이 있으시면 관리자에게 연락해주세요</p>
        </div>
      </div>
    </div>
  );
}
