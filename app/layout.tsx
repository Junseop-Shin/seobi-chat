import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: '서비와 대화하기',
  description: '서비에 대해 무엇이든 물어보세요',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: '서비와 대화하기',
    description: '서비에 대해 무엇이든 물어보세요',
    url: BASE_URL,
    siteName: 'Seobi Chat',
    // app/opengraph-image.tsx 에서 자동 생성됨
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '서비와 대화하기',
    description: '서비에 대해 무엇이든 물어보세요',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
