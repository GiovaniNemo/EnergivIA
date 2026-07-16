"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { ClosedDealStatus, DealStage } from "@/lib/pipeline-deal";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";
import { ClosedColumnWithRows } from "./ClosedColumnWithRows";

type KanbanItemBase = {
  id: string;
  stage: DealStage;
  status?: ClosedDealStatus;
  order: number;
};

type DropCommitParams<T extends KanbanItemBase> = {
  item: T;
  fromStage: DealStage;
  toStage: DealStage;
  fromStatus?: ClosedDealStatus;
  toStatus?: ClosedDealStatus;
  fromOrder: number;
  newOrder: number;
};

type KanbanBoardProps<T extends KanbanItemBase> = {
  stages: DealStage[];
  items: T[];
  onItemsChange: (next: T[]) => void;
  onDropCommit: (params: DropCommitParams<T>) => Promise<void> | void;
  renderColumnHeader: (stage: DealStage, count: number, isOver: boolean) => ReactNode;
  renderEmptyColumn: (stage: DealStage) => ReactNode;
  renderEmptyClosedRow: (status: ClosedDealStatus) => ReactNode;
  renderItem: (item: T, isDraggingOverlay: boolean) => ReactNode;
  closedCollapsed?: boolean;
  onExpandClosed?: () => void;
};

function parseContainerId(raw: string | number): DealStage | null {
  const id = String(raw);
  if (id.startsWith("column:")) return id.replace("column:", "") as DealStage;
  return null;
}

function parseClosedRowId(raw: string | number): ClosedDealStatus | null {
  const id = String(raw);
  if (id.startsWith("closed-row:")) return id.replace("closed-row:", "") as ClosedDealStatus;
  return null;
}

function parseItemId(raw: string | number): string | null {
  const id = String(raw);
  if (id.startsWith("item:")) return id.replace("item:", "");
  return null;
}

function getClosedStatus(item: KanbanItemBase): ClosedDealStatus {
  return item.status ?? "lost";
}

function laneKey(item: KanbanItemBase): string {
  if (item.stage !== "fechado") return item.stage;
  return `fechado:${getClosedStatus(item)}`;
}

function normalizeOrders<T extends KanbanItemBase>(items: T[], stages: DealStage[]): T[] {
  const laneBuckets = new Map<string, T[]>();
  for (const item of items) {
    const key = laneKey(item);
    const bucket = laneBuckets.get(key) ?? [];
    bucket.push(item);
    laneBuckets.set(key, bucket);
  }
  const next: T[] = [];
  const closedOrder: ClosedDealStatus[] = ["won", "lost", "disqualified", "postponed", "cancelled"];
  for (const stage of stages) {
    if (stage === "fechado") {
      for (const status of closedOrder) {
        const key = `fechado:${status}`;
        const bucket = (laneBuckets.get(key) ?? []).sort((a, b) => a.order - b.order);
        for (let i = 0; i < bucket.length; i += 1) {
          next.push({ ...bucket[i]!, status, order: i } as T);
        }
      }
      continue;
    }
    const bucket = (laneBuckets.get(stage) ?? []).sort((a, b) => a.order - b.order);
    for (let i = 0; i < bucket.length; i += 1) {
      next.push({ ...bucket[i]!, status: undefined, order: i } as T);
    }
  }
  return next;
}

function resolveDestination<T extends KanbanItemBase>(
  items: T[],
  overId: string,
  activeItem: T
): {
  stage: DealStage;
  status?: ClosedDealStatus;
  overItemId: string | null;
} | null {
  const overItemId = parseItemId(overId);
  if (overItemId) {
    const targetItem = items.find((i) => i.id === overItemId);
    if (!targetItem) return null;
    return {
      stage: targetItem.stage,
      status: targetItem.stage === "fechado" ? getClosedStatus(targetItem) : undefined,
      overItemId,
    };
  }
  const closedRow = parseClosedRowId(overId);
  if (closedRow) {
    return { stage: "fechado", status: closedRow, overItemId: null };
  }
  const overContainer = parseContainerId(overId);
  if (overContainer) {
    return {
      stage: overContainer,
      status: overContainer === "fechado" ? getClosedStatus(activeItem) : undefined,
      overItemId: null,
    };
  }
  return null;
}

function moveAcrossColumns<T extends KanbanItemBase>(params: {
  items: T[];
  activeId: string;
  overId: string;
  stages: DealStage[];
}): T[] {
  const { items, activeId, overId, stages } = params;
  const activeItem = items.find((i) => i.id === activeId);
  if (!activeItem) return items;

  const destination = resolveDestination(items, overId, activeItem);
  if (!destination) return items;
  const targetStage = destination.stage;
  const targetStatus = destination.status;
  const overItemId = destination.overItemId;

  const sameLane =
    targetStage === activeItem.stage &&
    (targetStage !== "fechado" || targetStatus === getClosedStatus(activeItem));

  if (sameLane && overItemId) {
    const sameBucket = items
      .filter((i) => {
        if (i.stage !== activeItem.stage) return false;
        if (i.stage !== "fechado") return true;
        return getClosedStatus(i) === getClosedStatus(activeItem);
      })
      .sort((a, b) => a.order - b.order);
    const oldIndex = sameBucket.findIndex((i) => i.id === activeId);
    const newIndex = sameBucket.findIndex((i) => i.id === overItemId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;
    const moved = arrayMove(sameBucket, oldIndex, newIndex);
    const rest = items.filter((i) => !moved.some((m) => m.id === i.id));
    return normalizeOrders([...rest, ...moved], stages);
  }

  const withoutActive = items.filter((i) => i.id !== activeId);
  const targetBucket = withoutActive
    .filter((i) => {
      if (i.stage !== targetStage) return false;
      if (targetStage !== "fechado") return true;
      return getClosedStatus(i) === (targetStatus ?? "lost");
    })
    .sort((a, b) => a.order - b.order);
  const insertIndex = overItemId
    ? Math.max(
        0,
        targetBucket.findIndex((i) => i.id === overItemId)
      )
    : targetBucket.length;
  const moved: T = {
    ...activeItem,
    stage: targetStage,
    status: targetStage === "fechado" ? (targetStatus ?? "lost") : undefined,
  };
  const nextTarget = [...targetBucket];
  nextTarget.splice(insertIndex, 0, moved);
  const rest = withoutActive.filter((i) => !targetBucket.some((b) => b.id === i.id));
  return normalizeOrders([...rest, ...nextTarget], stages);
}

export function KanbanBoard<T extends KanbanItemBase>({
  stages,
  items,
  onItemsChange,
  onDropCommit,
  renderColumnHeader,
  renderEmptyColumn,
  renderEmptyClosedRow,
  renderItem,
  closedCollapsed,
  onExpandClosed,
}: KanbanBoardProps<T>): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [overClosedStatus, setOverClosedStatus] = useState<ClosedDealStatus | null>(null);
  const dragStartSnapshotRef = useRef<T[] | null>(null);

  const grouped = useMemo(() => {
    const buckets = new Map<DealStage, T[]>();
    for (const stage of stages) buckets.set(stage, []);
    for (const item of items) buckets.get(item.stage)?.push(item);
    for (const stage of stages) buckets.get(stage)?.sort((a, b) => a.order - b.order);
    return buckets;
  }, [items, stages]);

  const activeItem = activeId ? (items.find((i) => i.id === activeId) ?? null) : null;

  function handleDragStart(event: DragStartEvent): void {
    const id = parseItemId(event.active.id);
    if (!id) return;
    dragStartSnapshotRef.current = items;
    setActiveId(id);
  }

  function handleDragOver(event: DragOverEvent): void {
    if (!activeId || !event.over) return;
    const overId = String(event.over.id);
    const activeItem = items.find((i) => i.id === activeId);
    if (!activeItem) return;
    const destination = resolveDestination(items, overId, activeItem);
    setOverStage(destination?.stage ?? null);
    setOverClosedStatus(destination?.status ?? null);
    const next = moveAcrossColumns({ items, activeId, overId, stages });
    if (next !== items) onItemsChange(next);
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const snapshot = dragStartSnapshotRef.current;
    setActiveId(null);
    setOverStage(null);
    setOverClosedStatus(null);
    dragStartSnapshotRef.current = null;
    if (!snapshot || !event.over || !activeId) return;

    const currentItem = items.find((i) => i.id === activeId);
    const startItem = snapshot.find((i) => i.id === activeId);
    if (!currentItem || !startItem) return;
    if (
      currentItem.stage === startItem.stage &&
      currentItem.order === startItem.order &&
      (currentItem.stage !== "fechado" ||
        getClosedStatus(currentItem) === getClosedStatus(startItem))
    ) {
      return;
    }

    await onDropCommit({
      item: currentItem,
      fromStage: startItem.stage,
      toStage: currentItem.stage,
      fromStatus: startItem.stage === "fechado" ? getClosedStatus(startItem) : undefined,
      toStatus: currentItem.stage === "fechado" ? getClosedStatus(currentItem) : undefined,
      fromOrder: startItem.order,
      newOrder: currentItem.order,
    });
  }

  function handleDragCancel(): void {
    setActiveId(null);
    setOverStage(null);
    setOverClosedStatus(null);
    const snapshot = dragStartSnapshotRef.current;
    dragStartSnapshotRef.current = null;
    if (snapshot) onItemsChange(snapshot);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={handleDragCancel}
    >
      <div
        className={`grid min-w-[1200px] gap-3 overflow-x-auto pb-1 ${closedCollapsed ? "grid-cols-[1fr_1fr_1fr_1fr_52px]" : "grid-cols-5"}`}
      >
        {stages.map((stage) => {
          const stageItems = grouped.get(stage) ?? [];
          if (stage === "fechado") {
            const rows: Record<ClosedDealStatus, string[]> = {
              won: [],
              lost: [],
              disqualified: [],
              postponed: [],
              cancelled: [],
            };
            for (const item of stageItems) {
              rows[getClosedStatus(item)].push(item.id);
            }
            return (
              <ClosedColumnWithRows
                key={stage}
                header={renderColumnHeader(stage, stageItems.length, overStage === stage)}
                rows={rows}
                overClosedStatus={overClosedStatus}
                renderEmptyRow={renderEmptyClosedRow}
                columnCollapsed={closedCollapsed}
                onExpand={onExpandClosed}
                renderRowItem={(id) => {
                  const item = stageItems.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <KanbanCard key={item.id} id={item.id}>
                      {renderItem(item, false)}
                    </KanbanCard>
                  );
                }}
              />
            );
          }
          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              itemIds={stageItems.map((i) => i.id)}
              isOver={overStage === stage}
              header={renderColumnHeader(stage, stageItems.length, overStage === stage)}
            >
              <div className="space-y-2">
                {stageItems.length === 0
                  ? renderEmptyColumn(stage)
                  : stageItems.map((item) => (
                      <KanbanCard key={item.id} id={item.id}>
                        {renderItem(item, false)}
                      </KanbanCard>
                    ))}
              </div>
            </KanbanColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? <div className="w-[280px]">{renderItem(activeItem, true)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
