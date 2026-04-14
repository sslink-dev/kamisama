'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  show: boolean;
  /** 表示するメッセージ（任意） */
  message?: string;
  /** 全画面固定 (true=fixed, false=absolute 親要素基準) */
  fullscreen?: boolean;
  className?: string;
}

/**
 * ローディング中に画面中央にくるくる回るスピナーを表示するオーバーレイ
 *
 * 使い方:
 *   <div className="relative">
 *     <LoadingOverlay show={loading} message="送信中..." />
 *     ...フォーム等
 *   </div>
 *
 * または全画面:
 *   <LoadingOverlay show={loading} fullscreen message="処理中..." />
 */
export function LoadingOverlay({ show, message, fullscreen = false, className }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        fullscreen ? 'fixed' : 'absolute',
        'inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm',
        'animate-in fade-in duration-150',
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg ring-1 ring-gray-200">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        {message && (
          <p className="text-sm font-medium text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}

/** スケルトン内などで使う、インライン用の小さめスピナー */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className={cn('h-6 w-6 animate-spin text-blue-600', className)} />
    </div>
  );
}
