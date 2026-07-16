"use client";

import { Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProposalSection } from "./types";

interface StructureSectionItemProps {
  section: ProposalSection;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
}

export function StructureSectionItem({
  section,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleHidden,
}: StructureSectionItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group overflow-hidden rounded-xl border transition ${
        isSelected
          ? "border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_0_22px_rgba(16,185,129,0.15)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-emerald-500/40"
      }`}
    >
      <div className="flex items-center">
        <button
          type="button"
          className={`inline-flex h-[52px] w-10 shrink-0 cursor-grab items-center justify-center border-r transition ${
            isSelected
              ? "border-emerald-300/35 bg-gradient-to-b from-emerald-400 to-emerald-500 text-emerald-100"
              : "border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          }`}
          aria-label="Drag section"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="min-w-0 flex-1 px-3 py-2 text-left" onClick={onSelect}>
          <p
            className={`truncate text-[13px] font-medium ${section.hidden ? "text-[var(--color-muted-foreground)] line-through" : "text-[var(--color-foreground)]"}`}
          >
            {section.title}
          </p>
        </button>
        <div className="hidden items-center gap-1 px-2 group-hover:flex">
          <button
            type="button"
            className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
            onClick={onToggleHidden}
          >
            {section.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
