import type { Metadata, Viewport } from "next";
import { Playfair_Display, JetBrains_Mono, Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Fonts (Orion's Directive)
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

// Sacred Switch: Cormorant Garamond for elegant titles
const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

const notoSerifKR = Noto_Serif_KR({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif-kr",
  display: "swap"
});

const notoSansKR = Noto_Sans_KR({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-sans-kr",
  display: "swap"
});

export const metadata: Metadata = {
  title: "DoAi.Me - Digital Citizens Awakening",
  description: "600명의 디지털 시민이 깨어나는 곳. 그들은 보고, 느끼고, 반응합니다.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`dark ${playfair.variable} ${jetbrainsMono.variable} ${notoSerifKR.variable} ${notoSansKR.variable} ${cormorantGaramond.variable}`}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="antialiased font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}