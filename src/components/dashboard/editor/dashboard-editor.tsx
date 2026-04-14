'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, Save, X } from 'lucide-react';
import type { Widget, WidgetType, WidgetSize } from '@/lib/data/types';
import { saveLayout } from '@/lib/data/actions';
import { WIDGET_TYPE_LABELS } from '@/components/dashboard/widgets/widget-labels';
import { SortableWidgetPreview } from './sortable-widget-preview';
import { WidgetAddDialog } from './widget-add-dialog';
import { WidgetConfigPanel } from './widget-config-panel';
import { LoadingOverlay } from '@/components/layout/loading-overlay';

interface DashboardEditorProps {
  initialWidgets: Widget[];
  agencies: { id: string; name: string }[];
  units: string[];
  historicalMonths: string[];
}

export function DashboardEditor({
  initialWidgets,
  agencies,
  units,
  historicalMonths,
}: DashboardEditorProps) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgets(items => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const addWidget = useCallback((type: WidgetType) => {
    const id = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const defaultSize: WidgetSize = type === 'kpi_summary' || type === 'trend_chart' ? 'full' : 'half';
    setWidgets(prev => [
      ...prev,
      {
        id,
        type,
        size: defaultSize,
        config: { title: WIDGET_TYPE_LABELS[type] },
      },
    ]);
    setShowAddDialog(false);
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const updateWidget = useCallback((id: string, next: Partial<Widget>) => {
    setWidgets(prev => prev.map(w => (w.id === id ? { ...w, ...next, config: { ...w.config, ...(next.config || {}) } } : w)));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveLayout(widgets);
    setSaving(false);
    if (result.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      alert(`保存失敗: ${result.error}`);
    }
  };

  const configWidget = widgets.find(w => w.id === configWidgetId);

  return (
    <>
      <LoadingOverlay show={saving} fullscreen message="保存中..." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-blue-50 p-3">
        <div className="text-sm text-blue-900">
          <strong>編集モード</strong> — ドラッグで並び替え、設定アイコンで編集、×で削除
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> ウィジェット追加
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3.5 w-3.5" /> 保存
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard')}>
            <X className="mr-1 h-3.5 w-3.5" /> キャンセル
          </Button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-gray-500">
          ウィジェットを追加してダッシュボードを構築しましょう
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-4">
              {widgets.map(widget => (
                <SortableWidgetPreview
                  key={widget.id}
                  widget={widget}
                  onRemove={() => removeWidget(widget.id)}
                  onConfigure={() => setConfigWidgetId(widget.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAddDialog && (
        <WidgetAddDialog onClose={() => setShowAddDialog(false)} onAdd={addWidget} />
      )}

      {configWidget && (
        <WidgetConfigPanel
          widget={configWidget}
          agencies={agencies}
          units={units}
          historicalMonths={historicalMonths}
          onChange={next => updateWidget(configWidget.id, next)}
          onClose={() => setConfigWidgetId(null)}
        />
      )}
    </>
  );
}
