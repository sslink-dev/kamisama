'use client';

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </header>
  );
}
