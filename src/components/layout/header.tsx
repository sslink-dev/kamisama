'use client';

export function Header({ title }: { title: string }) {
  return (
    <div className="px-8 pt-6">
      <h2 className="text-xl font-extrabold tracking-wide text-gray-800">{title}</h2>
    </div>
  );
}
