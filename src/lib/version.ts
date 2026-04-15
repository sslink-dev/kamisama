/**
 * アプリのバージョン表示用。
 * ビルド時に next.config.ts で NEXT_PUBLIC_APP_VERSION にコミットハッシュを注入している。
 *   - Vercel: VERCEL_GIT_COMMIT_SHA の先頭 7 文字
 *   - ローカル: git rev-parse --short HEAD
 *   - フォールバック: 'dev'
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
