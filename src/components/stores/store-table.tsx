'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { StoreWithMetrics } from '@/lib/data/types';
import { formatPercent, formatNumber } from '@/lib/utils/year-month';

interface StoreTableProps {
  stores: StoreWithMetrics[];
}

export function StoreTable({ stores }: StoreTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<StoreWithMetrics>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'コード',
        cell: ({ row }) => (
          <Link href={`/stores/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
            {row.original.code}
          </Link>
        ),
        size: 120,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            店舗名 <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
      },
      {
        accessorKey: 'agencyName',
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            代理店 <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 140,
      },
      {
        accessorKey: 'unit',
        header: 'ユニット',
        size: 100,
      },
      {
        accessorKey: 'rank',
        header: 'ランク',
        cell: ({ getValue }) => {
          const rank = getValue() as string | null;
          if (!rank) return '-';
          const colors: Record<string, string> = {
            A: 'bg-green-100 text-green-800',
            B: 'bg-blue-100 text-blue-800',
            C: 'bg-yellow-100 text-yellow-800',
            D: 'bg-red-100 text-red-800',
            NG: 'bg-gray-100 text-gray-800',
          };
          return <Badge variant="outline" className={colors[rank] || ''}>{rank}</Badge>;
        },
        size: 80,
      },
      {
        accessorKey: 'isNg',
        header: 'NG',
        cell: ({ getValue }) => getValue() ? <Badge variant="destructive">NG</Badge> : null,
        size: 60,
      },
      {
        id: 'referrals',
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            取次数 <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        accessorFn: (row) => row.latestMetrics?.referrals ?? 0,
        cell: ({ getValue }) => formatNumber(getValue() as number),
        size: 80,
      },
      {
        id: 'referralRate',
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            取次率 <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        accessorFn: (row) => row.latestMetrics?.referralRate ?? null,
        cell: ({ getValue }) => formatPercent(getValue() as number | null),
        size: 80,
      },
    ],
    []
  );

  const table = useReactTable({
    data: stores,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const store = row.original;
      return (
        store.name.toLowerCase().includes(search) ||
        store.code.toLowerCase().includes(search) ||
        store.companyName.toLowerCase().includes(search) ||
        store.agencyName.toLowerCase().includes(search)
      );
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="店舗名・コード・企業名で検索..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} 件
        </span>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          ページ {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
