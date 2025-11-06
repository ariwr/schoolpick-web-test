import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 모드에서는 export 제거 (프로덕션 빌드 시에만 사용)
  // output: 'export', // 주석 처리 - 개발 시에는 서버 모드 필요
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // 개발 모드에서 프록시가 필요한 경우를 위한 rewrites (선택사항)
  // 현재는 클라이언트에서 직접 API_BASE를 사용하므로 필요 없을 수 있음
  async rewrites() {
    // 개발 모드에서만 rewrites 사용
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
