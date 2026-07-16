"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { PropsWithChildren, ReactNode } from "react";

type KanbanColumnProps = PropsWithChildren<{
  stage: string;
  itemIds: string[];
  header: ReactNode;
  isOver: boolean;
}>;

export function KanbanColumn({
  stage,
  itemIds,
  header,
  isOver,
  children,
}: KanbanColumnProps): JSX.Element {
  const { setNodeRef } = useDroppable({ id: `column:${stage}` });

  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "rounded-[10px] border border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-2.5 transition-colors"
          : "rounded-[10px] border border-[var(--color-border)] bg-[var(--color-muted)] p-2.5 transition-colors"
      }
    >
      {header}
      <SortableContext
        items={itemIds.map((id) => `item:${id}`)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </div>
  );
}
