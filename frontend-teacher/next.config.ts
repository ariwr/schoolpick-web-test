import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Static export 활성화
  trailingSlash: true, // 정적 파일 호환성
  images: {
    unoptimized: true, // 정적 export에서 이미지 최적화 비활성화
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://godingpick.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
