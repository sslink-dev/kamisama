'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  refreshMaterializedViews as _refresh,
  isCurrentUserAdmin,
  upsertUserRole,
  saveDashboardLayout,
} from './repository';
import type { UserRole, Widget } from './types';

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

/** ユーザーのロールを変更 (admin only) */
export async function assignUserRole(userId: string, role: UserRole): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: 'Forbidden' };
  try {
    await upsertUserRole(userId, role);
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/** ダッシュボードレイアウトを保存 (admin only) */
export async function saveLayout(widgets: Widget[]): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: 'Forbidden' };
  try {
    await saveDashboardLayout(widgets);
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
