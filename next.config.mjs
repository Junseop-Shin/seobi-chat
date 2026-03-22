/** @type {import('next').NextConfig} */
const nextConfig = {
  // Windows 홈서버 배포용 — tar | ssh 전송을 위한 최소 빌드 출력
  output: 'standalone',
};

export default nextConfig;
