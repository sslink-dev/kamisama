'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignUserRole } from '@/lib/data/actions';
import type { UserRole } from '@/lib/data/types';

interface Props {
  userId: string;
  currentRole: UserRole;
}

export function UserRoleForm({ userId, currentRole }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(currentRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (next: UserRole) => {
    if (next === role) return;
    const prev = role;
    setRole(next);
    setError(null);
    startTransition(async () => {
      const result = await assignUserRole(userId, next);
      if (!result.ok) {
        setRole(prev);
        setError(result.error || '失敗しました');
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={v => handleChange((v as UserRole) || 'user')} disabled={isPending}>
        <SelectTrigger className="w-32">
          <SelectValue>
            {v => v === 'admin' ? '管理者' : 'ユーザー'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">ユーザー</SelectItem>
          <SelectItem value="admin">管理者</SelectItem>
        </SelectContent>
      </Select>
      {isPending && <span className="text-xs text-gray-500">更新中...</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
