'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { refreshMaterializedViews as _refresh } from './repository';

/**
 * 認証済みユーザーのみ呼び出せる、マテリアライズドビューのリフレッシュ
 * (データインポート後に呼び出す)
 */
export async function refreshViews(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' };
  try {
    await _refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
