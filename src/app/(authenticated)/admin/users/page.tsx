import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllUserRoles, isCurrentUserAdmin } from '@/lib/data/repository';
import { UserRoleForm } from './user-role-form';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  if (!(await isCurrentUserAdmin())) {
    redirect('/dashboard');
  }

  const users = await getAllUserRoles();
  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <>
      <Header title="管理コンソール - ユーザー管理" />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-gray-500">総ユーザー数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{adminCount}</div>
              <p className="text-xs text-gray-500">管理者</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-700">{users.length - adminCount}</div>
              <p className="text-xs text-gray-500">一般ユーザー</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ユーザー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-sm">{u.email}</TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <Badge className="bg-blue-100 text-blue-800">管理者</Badge>
                      ) : (
                        <Badge variant="outline">ユーザー</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ja-JP') : '-'}
                    </TableCell>
                    <TableCell>
                      <UserRoleForm userId={u.user_id} currentRole={u.role} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
