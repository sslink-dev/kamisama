import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * service_role key を使った管理クライアント。RLS をバイパスするため
 * サーバー専用キャッシュクエリ等で使用。
 *
 * 注意:
 * - NEVER expose to browser
 * - middleware が認証を通した後のみ呼び出す
 */
let _adminClient: SupabaseClient | null = null;

export function getAdminSupabaseClient(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
  _adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _adminClient;
}
