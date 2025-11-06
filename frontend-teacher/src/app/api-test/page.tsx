'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export default function ApiTestPage() {
  const [testType, setTestType] = useState<'login' | 'content-filter'>('content-filter');
  
  // 로그인 테스트
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  
  // 세특 검열 테스트
  const [content, setContent] = useState('학생은 매우 뛰어난 성적을 보여주고 있습니다.');
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
  
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  // 백엔드 연결 상태 확인
  const checkBackendConnection = async () => {
    try {
      setConnectionStatus('연결 확인 중...');
      const response = await fetch(`${apiUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(`✅ 백엔드 연결 성공! 상태: ${data.status}, 버전: ${data.version}`);
        return true;
      } else {
        setConnectionStatus(`❌ 백엔드 응답 오류: ${response.status}`);
        return false;
      }
    } catch (error) {
      setConnectionStatus(`❌ 백엔드 연결 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      return false;
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testContentFilter = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/content-filter/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          max_bytes: 2000,
        }),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        ok: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionIssue: error instanceof Error && error.message.includes('fetch') ? '백엔드 서버가 실행 중인지 확인하세요.' : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-godding-text-primary mb-4">API 연결 테스트</h1>
        <p className="text-godding-text-secondary mb-8">백엔드 API 연결 상태를 확인하고 테스트할 수 있습니다.</p>
        
        {/* 백엔드 연결 상태 확인 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-godding-text-primary mb-2">백엔드 서버 연결 확인</h2>
              <p className="text-sm text-godding-text-secondary">백엔드 서버 주소:</p>
              <Input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="mt-2 max-w-md"
                placeholder="http://localhost:8000"
              />
            </div>
            <Button onClick={checkBackendConnection} variant="outline">
              연결 확인
            </Button>
          </div>
          {connectionStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              connectionStatus.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus}
            </div>
          )}
        </div>

        {/* 테스트 타입 선택 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <Button
              variant={testType === 'content-filter' ? 'default' : 'outline'}
              onClick={() => setTestType('content-filter')}
            >
              세특 검열 API 테스트
            </Button>
            <Button
              variant={testType === 'login' ? 'default' : 'outline'}
              onClick={() => setTestType('login')}
            >
              로그인 API 테스트
            </Button>
          </div>

          {/* 세특 검열 테스트 */}
          {testType === 'content-filter' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-godding-text-primary mb-2">
                  검열할 세특 내용
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="검열할 세특 내용을 입력하세요..."
                  className="min-h-[150px]"
                />
                <p className="text-xs text-godding-text-secondary mt-2">
                  바이트 수: {new Blob([content]).size} / 2000
                </p>
              </div>
              
              <Button
                onClick={testContentFilter}
                disabled={loading || !content.trim()}
                className="w-full"
              >
                {loading ? '검열 중...' : '세특 검열 API 테스트'}
              </Button>
            </div>
          )}

          {/* 로그인 테스트 */}
          {testType === 'login' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-godding-text-primary mb-2">
                  이메일
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-godding-text-primary mb-2">
                  비밀번호
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                />
              </div>
              
              <Button
                onClick={testLogin}
                disabled={loading}
                className="w-full"
              >
                {loading ? '테스트 중...' : '로그인 API 테스트'}
              </Button>
            </div>
          )}
        </div>
        
        {/* 결과 표시 */}
        {result && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-6">
            <h3 className="text-lg font-semibold text-godding-text-primary mb-4">테스트 결과:</h3>
            <div className={`p-4 rounded-lg mb-4 ${
              result.status === 200 || result.ok === true
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="text-sm">
                <div className="font-semibold mb-2">
                  상태 코드: {result.status || 'N/A'} 
                  {result.status === 200 || result.ok === true ? ' ✅' : ' ❌'}
                </div>
                {result.connectionIssue && (
                  <div className="text-red-600 mb-2">{result.connectionIssue}</div>
                )}
              </div>
            </div>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
