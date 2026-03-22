import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '서비와 대화하기';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Next.js App Router의 내장 OG 이미지 생성기
// /opengraph-image 경로로 자동 서빙되며 og:image 메타태그에 연결됨
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0a0a0f 100%)',
          position: 'relative',
        }}
      >
        {/* 배경 글로우 효과 */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,190,210,0.12) 0%, transparent 70%)',
          }}
        />

        {/* 구체 표현 (원형 그라디언트) */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #e8eaf0, #b0b8c8 40%, #6a7585 80%, #3a4050)',
            boxShadow: '0 0 80px rgba(160,175,200,0.25), inset 0 0 40px rgba(255,255,255,0.05)',
            marginBottom: 48,
          }}
        />

        {/* 타이틀 */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#f0f2f5',
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          서비와 대화하기
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(200,210,225,0.5)',
            letterSpacing: '0.1em',
          }}
        >
          Ask anything about 서비
        </div>
      </div>
    ),
    { ...size }
  );
}
