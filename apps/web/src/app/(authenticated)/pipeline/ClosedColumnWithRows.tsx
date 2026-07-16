"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronsLeft } from "lucide-react";
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
  columnCollapsed?: boolean;
  onExpand?: () => void;
};

export function ClosedColumnWithRows({
  header,
  rows,
  overClosedStatus,
  renderEmptyRow,
  renderRowItem,
  columnCollapsed,
  onExpand,
}: ClosedColumnWithRowsProps): JSX.Element {
  const [collapsed, setCollapsed] = useState<Record<ClosedDealStatus, boolean>>({
    won: false,
    lost: false,
    disqualified: false,
    postponed: false,
    cancelled: false,
  });

  const rowDefs = useMemo(() => CLOSED_ROWS, []);

  if (columnCollapsed) {
    const total = Object.values(rows).reduce((s, ids) => s + ids.length, 0);
    const nonEmptyRows = CLOSED_ROWS.filter((row) => rows[row.status].length > 0);
    return (
      <button
        type="button"
        onClick={onExpand}
        title="Expandir coluna Fechado"
        aria-label={`Expandir coluna Fechado (${total} negociações)`}
        className="group flex w-[52px] flex-col items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-3 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] transition-colors group-hover:border-[var(--color-primary)]/40 group-hover:text-[var(--color-foreground)]">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </span>
        <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-[11px] font-semibold tracking-wide text-[var(--color-foreground)]">
          Fechado
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-muted-foreground)]">
          {total}
        </span>
        {nonEmptyRows.length > 0 ? (
          <span className="mt-auto flex w-full flex-col items-center gap-1 border-t border-[var(--color-border)]/60 pt-2">
            {nonEmptyRows.map((row) => (
              <span
                key={row.status}
                title={`${row.label}: ${rows[row.status].length}`}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-muted-foreground)]"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${row.dotClass}`} aria-hidden />
                {rows[row.status].length}
              </span>
            ))}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-muted)] p-2.5">
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
