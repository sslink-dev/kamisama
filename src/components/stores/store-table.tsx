'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
} from 'lucide-react';
import type { StoreWithMetrics } from '@/lib/data/types';
import { formatPercent, formatNumber } from '@/lib/utils/year-month';

interface StoreTableProps {
  stores: StoreWithMetrics[];
}

type SortIconProps = { state: false | 'asc' | 'desc' };
function SortIcon({ state }: SortIconProps) {
  if (state === 'asc') return <ArrowUp className="h-3 w-3" />;
  if (state === 'desc') return <ArrowDown className="h-3 w-3" />;
  return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
}

function SortableHeader({
  label,
  sortState,
  onToggle,
}: {
  label: string;
  sortState: false | 'asc' | 'desc';
  onToggle: () => void;
}) {
  return (
    <button className="flex items-center gap-1 hover:text-gray-900" onClick={onToggle}>
      {label}
      <SortIcon state={sortState} />
    </button>
  );
}

export function StoreTable({ stores }: StoreTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(50);

  const columns: ColumnDef<StoreWithMetrics>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <SortableHeader
            label="コード"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <Link href={`/stores/${row.original.id}`} className="font-bold text-[#F76FAB] hover:underline">
            {row.original.code}
          </Link>
        ),
        size: 120,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <SortableHeader
            label="店舗名"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
      },
      {
        accessorKey: 'agencyName',
        header: ({ column }) => (
          <SortableHeader
            label="代理店"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        size: 140,
      },
      {
        accessorKey: 'companyName',
        header: ({ column }) => (
          <SortableHeader
            label="企業名"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        size: 180,
      },
      {
        accessorKey: 'unit',
        header: ({ column }) => (
          <SortableHeader
            label="ユニット"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        cell: ({ getValue }) => (getValue() as string | null) || '-',
        size: 100,
      },
      {
        accessorKey: 'rank',
        header: ({ column }) => (
          <SortableHeader
            label="ランク"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
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
        accessorKey: 'companyFlag',
        header: ({ column }) => (
          <SortableHeader
            label="企業フラグ"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        cell: ({ getValue }) => (getValue() as string | null) || '-',
        size: 100,
      },
      {
        accessorKey: 'isNg',
        header: ({ column }) => (
          <SortableHeader
            label="NG"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        cell: ({ getValue }) => getValue() ? <Badge variant="destructive">NG</Badge> : null,
        size: 60,
      },
      {
        id: 'referrals',
        header: ({ column }) => (
          <SortableHeader
            label="取次数"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        accessorFn: (row) => row.latestMetrics?.referrals ?? 0,
        cell: ({ getValue }) => formatNumber(getValue() as number),
        size: 80,
      },
      {
        id: 'referralRate',
        header: ({ column }) => (
          <SortableHeader
            label="取次率"
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
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
    state: { sorting, globalFilter, pagination: { pageIndex: 0, pageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater({ pageIndex: table.getState().pagination.pageIndex, pageSize })
        : updater;
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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

  const exportCsv = () => {
    const filtered = table.getFilteredRowModel().rows.map(r => {
      const s = r.original;
      return {
        コード: s.code,
        店舗名: s.name,
        代理店: s.agencyName,
        企業名: s.companyName,
        ユニット: s.unit || '',
        ランク: s.rank || '',
        企業フラグ: s.companyFlag || '',
        NG状態: s.isNg ? 'NG' : '',
        NG理由: s.ngReason || '',
        NG月: s.ngMonth || '',
        重点: s.isPriority ? '1' : '',
        '3Q重点': s.isPriorityQ3 ? '1' : '',
        取次数: s.latestMetrics?.referrals ?? 0,
        取次率: s.latestMetrics?.referralRate ?? '',
      };
    });
    const csv = Papa.unparse(filtered);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
          {table.getFilteredRowModel().rows.length.toLocaleString()} 件
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={v => setPageSize(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25件</SelectItem>
              <SelectItem value="50">50件</SelectItem>
              <SelectItem value="100">100件</SelectItem>
              <SelectItem value="200">200件</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-2 shadow-sm">
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
