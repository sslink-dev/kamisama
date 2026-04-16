import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 全プラットフォームで Noto Sans JP を統一適用 (iOS の Hiragino 等への置換を防ぐ)
const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "神様CRM",
  description: "代理店・店舗取次管理プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full`}>
      <body className="h-full bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
