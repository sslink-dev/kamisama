import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="ja" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-gray-50 font-sans antialiased">
        <Sidebar />
        <main className="ml-64 min-h-full">
          {children}
        </main>
      </body>
    </html>
  );
}
