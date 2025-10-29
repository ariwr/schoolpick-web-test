import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Static export 활성화
  trailingSlash: true, // 정적 파일 호환성
  images: {
    unoptimized: true, // 정적 export에서 이미지 최적화 비활성화
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
