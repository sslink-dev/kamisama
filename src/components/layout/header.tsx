'use client';

export function Header({ title }: { title: string }) {
  // モバイル時はサイドバーのハンバーガー (左上) と被らないよう pl-16 を確保
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white pl-16 pr-6 lg:pl-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </header>
  );
}
