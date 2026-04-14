'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Trash2 } from 'lucide-react';
import { ChatMessage, ChatMessageData } from './chat-message';
import { ChatInput } from './chat-input';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'kamisama_chat_history';

const SAMPLE_PROMPTS = [
  '最新月のKPIを教えて',
  '取次数TOP5の代理店を表で',
  '月次推移をグラフで見せて',
  'NG理由の内訳を円グラフで',
];

export function ChatDrawer({ open, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 履歴を localStorage で保持（リロード後も会話が残る）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 末尾までスクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const next: ChatMessageData[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `エラー (${res.status})`);
      } else {
        setMessages([...next, { role: 'assistant', content: data.content || '(空の応答)' }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信エラー');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    if (!confirm('チャット履歴をすべて削除しますか？')) return;
    setMessages([]);
    setError(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-gray-50 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold">AI アシスタント</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clear}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
              title="履歴を削除"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
              title="閉じる"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* メッセージ */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3 py-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                データに関する質問にお答えします。代理店別実績、月次推移、NG店舗の分析などを自然文で尋ねてください。
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-gray-500">例:</div>
                {SAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="block w-full rounded-lg border bg-white px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border bg-white px-4 py-2.5 text-sm text-gray-500 shadow-sm">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" style={{ animationDelay: '240ms' }} />
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* 入力 */}
        <ChatInput onSend={send} disabled={loading} />
      </div>
    </div>
  );
}
