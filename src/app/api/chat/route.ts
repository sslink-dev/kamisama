import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { TOOL_DEFINITIONS, executeTool } from '@/lib/ai/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const MAX_TOOL_ROUNDS = 6;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  // 認証チェック
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が設定されていません。Vercel の環境変数を確認してください。' },
      { status: 500 }
    );
  }

  let body: { messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const userMessages = (body.messages || []).filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );
  if (userMessages.length === 0) {
    return NextResponse.json({ error: 'no messages' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  // OpenAI 形式にメッセージを組み立て
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
      });

      const choice = completion.choices[0];
      if (!choice?.message) {
        return NextResponse.json({ error: 'empty response from model' }, { status: 502 });
      }

      const msg = choice.message;
      messages.push(msg);

      // ツール呼び出しがなければ最終応答
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return NextResponse.json({ content: msg.content || '' });
      }

      // ツール実行
      for (const call of msg.tool_calls) {
        if (call.type !== 'function') continue;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          // 引数が壊れていてもツール側で空オブジェクトとして実行
        }
        let result: unknown;
        try {
          result = await executeTool(call.function.name, parsedArgs);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }
    return NextResponse.json(
      { error: 'ツール呼び出しが多すぎます。質問を分割してお試しください。' },
      { status: 500 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[chat] error', message);
    return NextResponse.json({ error: `AI 応答エラー: ${message}` }, { status: 500 });
  }
}
