'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ChatDrawer } from './chat-drawer';

export function ChatFloatButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-20 left-3 z-40 flex h-12 w-12 flex-col items-center justify-center rounded-full bg-[#F76FAB] text-white shadow-lg ring-4 ring-pink-100 transition hover:scale-105 active:scale-95"
        title="AI チャット"
        aria-label="AI チャットを開く"
        type="button"
      >
        <Sparkles className="h-5 w-5" />
        <span className="absolute -bottom-4 text-[9px] font-medium text-white drop-shadow">AIチャット</span>
      </button>
      <ChatDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
