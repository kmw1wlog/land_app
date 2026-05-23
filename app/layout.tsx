import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "홈패스 | 공공데이터 기반 주거 구매력 진단",
  description: "청년과 사회초년생, 1주택자를 위한 공공 실거래 데이터 기반 주거 구매력 및 갈아타기 의사결정 보조 서비스"
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
