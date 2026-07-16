"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { PropsWithChildren, ReactNode } from "react";

type ClosedRowProps = PropsWithChildren<{
  status: string;
  title: string;
  count: number;
  itemIds: string[];
  isOver: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  emptyState: ReactNode;
}>;

export function ClosedRow({
  status,
  title,
  count,
  itemIds,
  isOver,
  isCollapsed,
  onToggleCollapse,
  emptyState,
  children,
}: ClosedRowProps): JSX.Element {
  const { setNodeRef } = useDroppable({ id: `closed-row:${status}` });

  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-2 transition-colors"
          : "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 transition-colors"
      }
    >
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between text-left"
        onClick={onToggleCollapse}
      >
        <p className="text-sm font-semibold">
          {title} ({count})
        </p>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {isCollapsed ? "Expandir" : "Recolher"}
        </span>
      </button>
      {isCollapsed ? null : (
        <SortableContext
          items={itemIds.map((id) => `item:${id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">{itemIds.length === 0 ? emptyState : children}</div>
        </SortableContext>
      )}
    </div>
  );
}
