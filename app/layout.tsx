import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "내 집, 팔까? 버틸까? 굴릴까?",
  description: "내 월급과 내 집을 기준으로 부동산 선택지를 굴려보는 앱"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
