'use client';

import { ReactNode } from 'react';
import { X, Settings, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Widget, WidgetSize } from '@/lib/data/types';

interface WidgetWrapperProps {
  widget: Widget;
  children: ReactNode;
  editMode?: boolean;
  onRemove?: () => void;
  onConfigure?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

const sizeClass: Record<WidgetSize, string> = {
  third: 'lg:col-span-1',
  half: 'lg:col-span-2',
  full: 'lg:col-span-3',
};

export function WidgetWrapper({
  widget,
  children,
  editMode = false,
  onRemove,
  onConfigure,
  dragHandleProps,
}: WidgetWrapperProps) {
  return (
    <div className={cn('col-span-3', sizeClass[widget.size])}>
      <div
        className={cn(
          'relative rounded-lg border bg-white',
          editMode && 'ring-2 ring-blue-200 ring-offset-2'
        )}
      >
        {editMode && (
          <div className="absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-white shadow">
            <button
              {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              className="cursor-grab rounded p-0.5 hover:bg-blue-700"
              title="ドラッグして並べ替え"
              type="button"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onConfigure}
              className="rounded p-0.5 hover:bg-blue-700"
              title="設定"
              type="button"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onRemove}
              className="rounded p-0.5 hover:bg-red-500"
              title="削除"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
