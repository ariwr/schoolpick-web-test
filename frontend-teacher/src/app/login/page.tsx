'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    setError('');

    const loginUrl = `${API_BASE}/api/auth/login`;
    console.log('로그인 시도:', loginUrl);

    // AbortController를 사용하여 타임아웃 설정 (30초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 백엔드 API 호출
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
        signal: controller.signal, // 타임아웃 신호 추가
      });

      clearTimeout(timeoutId); // 성공 시 타임아웃 제거

      // 응답 본문을 텍스트로 먼저 읽기 (JSON 파싱 실패 대비)
      const responseText = await response.text();
      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // JSON 파싱 실패 시 원본 텍스트 사용
        console.error('JSON 파싱 실패:', responseText);
        setError(`서버 응답 오류 (${response.status}): ${responseText.substring(0, 200)}`);
        setIsLoading(false);
        return;
      }

      if (response.ok && data.access_token) {
        // 로그인 성공 - 토큰 저장
        localStorage.setItem('token', data.access_token);

        // 로그인 성공 플래그 설정 (개발 환경에서 토큰 유지용)
        sessionStorage.setItem('has_logged_in', 'true');

        // 사용자 정보 조회 (선택사항)
        try {
          const userController = new AbortController();
          const userTimeoutId = setTimeout(() => userController.abort(), 10000);

          const userResponse = await fetch(`${API_BASE}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Content-Type': 'application/json'
            },
            signal: userController.signal,
          });

          clearTimeout(userTimeoutId);

          if (userResponse.ok) {
            const userData = await userResponse.json();
            localStorage.setItem('userInfo', JSON.stringify(userData));
          } else {
            // 응답은 받았지만 오류 상태인 경우
            const errorData = await userResponse.json().catch(() => ({ detail: '알 수 없는 오류' }));
            console.error('사용자 정보 조회 실패:', userResponse.status, errorData);
          }
        } catch (err) {
          // 네트워크 오류 또는 기타 오류
          console.error('사용자 정보 조회 오류:', err);
          // 사용자 정보 조회 실패는 치명적이지 않으므로 로그만 남기고 계속 진행
        }

        // 헤더에 인증 상태 변경 알림
        window.dispatchEvent(new Event('authStateChange'));

        // 교사용 대시보드로 이동
        router.push('/dashboard');
      } else {
        // 서버 응답이 있지만 오류 상태인 경우
        const errorMessage = data.detail || data.message || `로그인에 실패했습니다. (상태 코드: ${response.status})`;

        // 데이터베이스 연결 오류인 경우 더 명확한 메시지 표시
        if (response.status === 503 && errorMessage.includes('데이터베이스')) {
          setError(`${errorMessage}\n\n해결 방법:\n1. backend-teacher 폴더에 .env 파일이 있는지 확인하세요\n2. .env 파일에 DATABASE_PASSWORD가 올바르게 설정되어 있는지 확인하세요\n3. env.example 파일을 참고하여 .env 파일을 생성하세요`);
        } else {
          setError(errorMessage);
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId); // 에러 발생 시 타임아웃 제거
      console.error('로그인 오류:', error);

      // 더 구체적인 에러 메시지 제공
      let errorMessage = '서버 연결에 실패했습니다.';

      if (error.name === 'AbortError' || error.message === 'The user aborted a request.') {
        errorMessage = `요청 시간이 초과되었습니다. 백엔드 서버(${API_BASE})가 실행 중인지 확인해주세요.`;
      } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = `백엔드 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. 백엔드 서버가 실행 중인지 확인 (${API_BASE})\n2. 터미널에서 다음 명령어로 서버 실행:\n   cd backend-teacher\n   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000\n3. CORS 설정 확인\n4. 네트워크 연결 확인`;
      } else if (error.message) {
        errorMessage = `연결 오류: ${error.message}`;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 섹션 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-godding-text-primary mb-2">스쿨픽</h1>
          <p className="text-godding-text-secondary text-sm">교사용</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-8">
          <h2 className="text-2xl font-semibold text-godding-text-primary text-center mb-8">로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 입력 */}
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
                className="h-12 text-base"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-godding-text-primary">
                비밀번호
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="h-12 text-base"
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap break-words">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-godding-primary hover:bg-godding-primary/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          {/* 링크들 */}
          <div className="mt-6 space-y-2 text-center">
            <Link
              href="/find-account"
              className="text-sm text-godding-text-secondary hover:text-godding-primary transition-colors block"
            >
              아이디/비밀번호 찾기
            </Link>
            <div>
              <span className="text-sm text-godding-text-secondary">계정이 없으신가요? </span>
              <Link
                href="/register"
                className="text-sm text-godding-primary hover:text-godding-primary/80 font-semibold transition-colors"
              >
                회원가입
              </Link>
            </div>
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
