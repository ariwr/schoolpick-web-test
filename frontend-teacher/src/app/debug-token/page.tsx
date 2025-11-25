'use client';

import { useEffect, useState } from 'react';

export default function DebugTokenPage() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');

    if (!token) {
      setError('토큰이 없습니다.');
      return;
    }

    try {
      // JWT 토큰은 세 부분으로 나뉩니다: header.payload.signature
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        setError('토큰 형식이 올바르지 않습니다. (3개 부분이 아님)');
        return;
      }

      // Base64 디코딩 (payload 부분만)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // 만료 시간 확인
      const exp = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      const isExpired = exp < now;
      const expiresAt = new Date(exp * 1000);
      const expiresIn = exp - now;

      setTokenInfo({
        token: token.substring(0, 50) + '...', // 처음 50자만 표시
        tokenLength: token.length,
        payload: payload,
        email: payload.sub || 'N/A',
        expiresAt: expiresAt.toLocaleString(),
        isExpired: isExpired,
        expiresIn: isExpired ? '만료됨' : `${Math.floor(expiresIn / 60)}분 ${expiresIn % 60}초 남음`,
        userInfo: userInfo ? JSON.parse(userInfo) : null
      });
    } catch (err: any) {
      setError(`토큰 디코딩 오류: ${err.message}`);
    }
  }, []);

  const handleTestToken = async () => {
    const token = localStorage.getItem('token');
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_BASE}/api/students/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      alert(`테스트 결과:\nStatus: ${response.status}\n${response.ok ? '성공' : '실패'}\n\n응답: ${JSON.stringify(data, null, 2)}`);
    } catch (err: any) {
      alert(`테스트 실패: ${err.message}`);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">토큰 디버깅</h1>
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('userInfo');
              window.location.href = '/login';
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            토큰 삭제 후 로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">토큰 디버깅</h1>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">토큰 디버깅 정보</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold mb-2">토큰 정보</h2>
            <p><strong>토큰 (처음 50자):</strong> {tokenInfo.token}</p>
            <p><strong>토큰 길이:</strong> {tokenInfo.tokenLength} 문자</p>
          </div>

          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold mb-2">사용자 정보</h2>
            <p><strong>이메일:</strong> {tokenInfo.email}</p>
            {tokenInfo.userInfo && (
              <div className="mt-2">
                <p><strong>이름:</strong> {tokenInfo.userInfo.name || 'N/A'}</p>
                <p><strong>사용자 타입:</strong> {tokenInfo.userInfo.user_type || 'N/A'}</p>
              </div>
            )}
          </div>

          <div className={`rounded p-4 ${tokenInfo.isExpired ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <h2 className="font-semibold mb-2">만료 정보</h2>
            <p><strong>만료 시간:</strong> {tokenInfo.expiresAt}</p>
            <p><strong>상태:</strong> 
              <span className={tokenInfo.isExpired ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {tokenInfo.isExpired ? ' 만료됨' : ` 유효함 (${tokenInfo.expiresIn})`}
              </span>
            </p>
          </div>

          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold mb-2">토큰 Payload (전체)</h2>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(tokenInfo.payload, null, 2)}
            </pre>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleTestToken}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              토큰 테스트 (API 호출)
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              토큰 삭제 후 재로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
















