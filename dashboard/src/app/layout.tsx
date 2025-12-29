import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WithB.io - YouTube Intelligence System",
  description: "600 디바이스 기반 YouTube 콘텐츠 인텔리전스 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
