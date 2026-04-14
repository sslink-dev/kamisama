'use client';

import { useRef, useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex items-end gap-2 border-t bg-white p-3">
      <textarea
        ref={ref}
        value={text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="質問を入力 (Enterで送信、Shift+Enterで改行)"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <Button
        size="sm"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="h-10 w-10 shrink-0 p-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
