import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// ビルド時にコミットハッシュを注入してサイドバーのバージョンに表示する。
// 優先順位: Vercel の VERCEL_GIT_COMMIT_SHA → ローカルの git → 'dev'
function resolveCommitSha(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveCommitSha(),
  },
};

export default nextConfig;
