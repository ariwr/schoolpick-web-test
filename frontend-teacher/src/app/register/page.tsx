'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    position: '교과',
    hireDate: '',
    isHomeroomTeacher: false,
    certificationNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 필수 필드 확인 (학교 이름은 더 이상 필수 아님)
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      setError('필수 항목을 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('회원가입 요청 시작:', `${API_BASE}/api/auth/register`);
      
      // 먼저 서버 연결 확인
      try {
        const healthCheck = await fetch(`${API_BASE}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5초 타임아웃
        });
        if (!healthCheck.ok) {
          setError('서버 상태가 정상이 아닙니다. 잠시 후 다시 시도해주세요.');
          return;
        }
        console.log('서버 연결 확인됨');
      } catch (healthError: any) {
        console.error('서버 연결 확인 실패:', healthError);
        if (healthError.name === 'TimeoutError' || healthError.name === 'AbortError') {
          setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
        } else {
          setError('서버 연결을 확인할 수 없습니다.');
        }
        return;
      }
      
      // 백엔드 API 호출 (60초 타임아웃 설정)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃
      
      console.log('회원가입 데이터 전송:', {
        email: formData.email,
        name: formData.name,
        phone: formData.phone
      });
      
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          birth_date: null,
          position: formData.position,
          hire_date: formData.hireDate || null,
          is_homeroom_teacher: formData.isHomeroomTeacher,
          certification_number: formData.certificationNumber || null
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('응답 받음:', response.status, response.statusText);

      // 응답 본문을 한 번만 소비하도록 clone 사용
      const responseClone = response.clone();
      let data: any = {};
      try {
        data = await response.json();
      } catch (_) {
        // non-JSON 응답(예: HTML 에러 페이지) 대비
      }

      if (response.ok) {
        // 회원가입 성공 - 로그인 페이지로 이동
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        router.push('/login');
      } else {
        // 오류 메시지 처리
        let errorMessage = '';
        
        if (data && data.detail) {
          // FastAPI 검증 오류는 detail이 배열로 반환됨
          if (Array.isArray(data.detail)) {
            // 첫 번째 오류 메시지 추출
            const firstError = data.detail[0];
            if (firstError && firstError.msg) {
              // "Value error, " 같은 접두사 제거
              errorMessage = firstError.msg.replace(/^(Value error|type_error|value_error)[\s,]*/i, '');
            } else {
              errorMessage = JSON.stringify(data.detail);
            }
          } else if (typeof data.detail === 'string') {
            // 문자열인 경우 그대로 사용
            errorMessage = data.detail;
          } else {
            // 객체인 경우 메시지 추출 시도
            errorMessage = JSON.stringify(data.detail);
          }
        }
        
        if (!errorMessage) {
          // detail이 없으면 다른 방법 시도
          let text = '';
          try {
            text = await responseClone.text();
          } catch (_) {}
          errorMessage = text || `회원가입에 실패했습니다. (status ${response.status})`;
        }
        
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        setError('서버 응답 시간이 초과되었습니다. 데이터베이스 연결 문제일 수 있습니다. 관리자에게 문의하세요.');
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else {
        setError(error.message || '서버 연결에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 로고 섹션 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-godding-primary rounded-full mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">고</span>
          </div>
          <h1 className="text-3xl font-bold text-godding-text-primary mb-2">스쿨픽</h1>
          <p className="text-godding-text-secondary text-sm">교사용 회원가입</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-8">
          <h2 className="text-2xl font-semibold text-godding-text-primary text-center mb-8">회원가입</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-godding-text-primary border-b pb-2">기본 정보</h3>
              
              {/* 이메일 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-godding-text-primary">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-12 text-base"
                />
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-godding-text-primary">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="h-12 text-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-godding-text-primary">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="h-12 text-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 이름 */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-godding-text-primary">
                  이름 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="h-12 text-base"
                />
              </div>

              {/* 전화번호 */}
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-godding-text-primary">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="전화번호를 입력하세요"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* 교사 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-godding-text-primary border-b pb-2">교사 정보</h3>
              
              {/* 학교 이름 입력은 DB 스키마에 없어 폼에서 제거 */}

              {/* 직책 */}
              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-medium text-godding-text-primary">
                  직책
                </label>
                <select
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-godding-primary text-base"
                >
                  <option value="교과">교과</option>
                  <option value="담임">담임</option>
                  <option value="부장">부장</option>
                  <option value="교감">교감</option>
                  <option value="교장">교장</option>
                </select>
              </div>

              {/* 임용일 */}
              <div className="space-y-2">
                <label htmlFor="hireDate" className="text-sm font-medium text-godding-text-primary">
                  임용일
                </label>
                <Input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={handleInputChange}
                  className="h-12 text-base"
                />
              </div>

              {/* 담임 교사 여부 */}
              <div className="flex items-center space-x-2">
                <input
                  id="isHomeroomTeacher"
                  name="isHomeroomTeacher"
                  type="checkbox"
                  checked={formData.isHomeroomTeacher}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-godding-primary border-gray-300 rounded focus:ring-godding-primary"
                />
                <label htmlFor="isHomeroomTeacher" className="text-sm font-medium text-godding-text-primary">
                  담임 교사입니다
                </label>
              </div>

              {/* 교원 자격증 번호 */}
              <div className="space-y-2">
                <label htmlFor="certificationNumber" className="text-sm font-medium text-godding-text-primary">
                  교원 자격증 번호
                </label>
                <Input
                  id="certificationNumber"
                  name="certificationNumber"
                  type="text"
                  placeholder="교원 자격증 번호를 입력하세요"
                  value={formData.certificationNumber}
                  onChange={handleInputChange}
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 회원가입 버튼 */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <span className="text-sm text-godding-text-secondary">이미 계정이 있으신가요? </span>
            <Link 
              href="/login" 
              className="text-sm text-godding-primary hover:text-godding-primary/80 font-semibold transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center mt-8 text-xs text-godding-text-secondary">
          <p>고교학점제 교사 관리 플랫폼</p>
        </div>
      </div>
    </div>
  );
}

