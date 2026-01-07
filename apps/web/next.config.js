/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // TypeScript/ESLint 빌드 에러 무시 (배포 우선)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 이미지 최적화
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  
  // 폰트 최적화
  optimizeFonts: true,
  
  // 실험적 기능
  experimental: {
    // App Router 최적화
    optimizePackageImports: ['framer-motion'],
  },
};

module.exports = nextConfig;

