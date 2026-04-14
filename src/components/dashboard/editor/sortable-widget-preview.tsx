'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Widget, WidgetSize } from '@/lib/data/types';
import { WIDGET_TYPE_LABELS } from '@/components/dashboard/widgets/widget-labels';
import { X, Settings, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeClass: Record<WidgetSize, string> = {
  third: 'lg:col-span-1',
  half: 'lg:col-span-2',
  full: 'lg:col-span-3',
};

interface Props {
  widget: Widget;
  onRemove: () => void;
  onConfigure: () => void;
}

export function SortableWidgetPreview({ widget, onRemove, onConfigure }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('col-span-3', sizeClass[widget.size])}
    >
      <div className="relative rounded-lg border-2 border-blue-300 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 hover:bg-gray-100 active:cursor-grabbing"
            type="button"
            aria-label="ドラッグして並び替え"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex-1 truncate text-sm font-medium">
            {widget.config.title || WIDGET_TYPE_LABELS[widget.type]}
          </div>
          <button
            onClick={onConfigure}
            className="rounded p-1 hover:bg-blue-50"
            title="設定"
            type="button"
          >
            <Settings className="h-4 w-4 text-blue-600" />
          </button>
          <button
            onClick={onRemove}
            className="rounded p-1 hover:bg-red-50"
            title="削除"
            type="button"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
        <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">
          <div>タイプ: {WIDGET_TYPE_LABELS[widget.type]}</div>
          <div>
            サイズ: {widget.size === 'third' ? '1/3幅' : widget.size === 'half' ? '2/3幅' : '全幅'}
          </div>
          {widget.config.month && <div>期間: {widget.config.month}</div>}
          {widget.config.agencyId && <div>代理店フィルタ: あり</div>}
          {widget.config.unit && <div>ユニット: {widget.config.unit}</div>}
          {widget.config.limit && <div>件数: {widget.config.limit}</div>}
        </div>
      </div>
    </div>
  );
}
