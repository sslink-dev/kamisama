import { Loader2 } from 'lucide-react';

export function PageSkeleton({ title }: { title: string }) {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </header>
      <div className="relative space-y-4 p-6">
        <div className="h-10 w-full max-w-2xl animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-lg border bg-white" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-lg border bg-white" />
          <div className="h-80 animate-pulse rounded-lg border bg-white" />
        </div>
        <div className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg ring-1 ring-gray-200">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-700">読み込み中...</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function TableSkeleton({ title }: { title: string }) {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </header>
      <div className="relative space-y-4 p-6">
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-9 w-36 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
        <div className="rounded-md border bg-white">
          <div className="h-12 border-b bg-gray-50" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-12 animate-pulse border-b bg-white" />
          ))}
        </div>
        <div className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg ring-1 ring-gray-200">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-700">読み込み中...</p>
          </div>
        </div>
      </div>
    </>
  );
}
