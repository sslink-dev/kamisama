'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StructuredBlock } from './structured-block';
import type { Components } from 'react-markdown';

export interface ChatMessageData {
  role: 'user' | 'assistant';
  content: string;
}

const STRUCTURED_LANGS = new Set(['chart:line', 'chart:bar', 'chart:pie', 'table']);

const components: Components = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ inline, className, children, ...rest }: any) => {
    if (inline) {
      return <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]" {...rest}>{children}</code>;
    }
    const lang = (className || '').replace(/^language-/, '').trim();
    const text = String(children).replace(/\n$/, '');
    if (STRUCTURED_LANGS.has(lang)) {
      return <StructuredBlock language={lang} content={text} />;
    }
    return (
      <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100">
        <code>{text}</code>
      </pre>
    );
  },
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h1: ({ children }) => <h1 className="mb-2 text-base font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 text-sm font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
};

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-800 shadow-sm border'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
