'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function ApiTestPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/auth/login', {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-godding-text-primary mb-8">API 테스트</h1>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-godding-card-border p-8 space-y-6">
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
          
          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-godding-text-primary mb-4">결과:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
