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
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105 hover:bg-blue-700 active:scale-95"
        title="AI アシスタント"
        aria-label="AI アシスタントを開く"
        type="button"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <ChatDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
