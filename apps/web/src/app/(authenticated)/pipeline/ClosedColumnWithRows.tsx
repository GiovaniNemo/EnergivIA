"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { ClosedDealStatus } from "@/lib/pipeline-deal";
import { ClosedRow } from "./ClosedRow";

const CLOSED_ROWS: Array<{ status: ClosedDealStatus; label: string; dotClass: string }> = [
  { status: "won", label: "Ganho", dotClass: "bg-emerald-500" },
  { status: "lost", label: "Perdido", dotClass: "bg-red-500" },
  { status: "disqualified", label: "Desqualificado", dotClass: "bg-zinc-400" },
  { status: "postponed", label: "Adiado", dotClass: "bg-amber-500" },
  { status: "cancelled", label: "Cancelado", dotClass: "bg-zinc-400" },
];

type ClosedColumnWithRowsProps = {
  header: ReactNode;
  rows: Record<ClosedDealStatus, string[]>;
  overClosedStatus: ClosedDealStatus | null;
  renderEmptyRow: (status: ClosedDealStatus) => ReactNode;
  renderRowItem: (id: string) => ReactNode;
};

export function ClosedColumnWithRows({
  header,
  rows,
  overClosedStatus,
  renderEmptyRow,
  renderRowItem,
}: ClosedColumnWithRowsProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: "column:fechado" });
  const [collapsed, setCollapsed] = useState<Record<ClosedDealStatus, boolean>>({
    won: false,
    lost: false,
    disqualified: false,
    postponed: false,
    cancelled: false,
  });

  const rowDefs = useMemo(() => CLOSED_ROWS, []);

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
      <div className="space-y-2">
        {rowDefs.map((row) => (
          <ClosedRow
            key={row.status}
            status={row.status}
            title={row.label}
            count={rows[row.status].length}
            itemIds={rows[row.status]}
            isOver={overClosedStatus === row.status}
            isCollapsed={collapsed[row.status]}
            onToggleCollapse={() =>
              setCollapsed((prev) => ({ ...prev, [row.status]: !prev[row.status] }))
            }
            emptyState={renderEmptyRow(row.status)}
          >
            {rows[row.status].map((id) => renderRowItem(id))}
          </ClosedRow>
        ))}
      </div>
    </div>
  );
}
