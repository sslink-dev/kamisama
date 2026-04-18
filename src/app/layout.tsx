import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 全プラットフォームで Noto Sans JP を統一適用
// 400/500 は太さ調整用に保持、表示用には 600(SemiBold) / 700(Bold) / 800(ExtraBold) を使用
const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KamisamaCRM",
  description: "代理店・店舗取次管理プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full`}>
      <body className="h-full bg-gray-50 font-sans font-semibold antialiased">
        {children}
      </body>
    </html>
  );
}
