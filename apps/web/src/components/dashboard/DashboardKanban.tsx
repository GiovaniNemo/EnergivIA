"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { createDeal, patchDeal, type DealStage } from "@/lib/leads-api";
import { notifyPipelineUpdated, usePipelineSync } from "@/lib/pipeline-sync";

export type StageKey = "novo" | "contato" | "proposta" | "negociacao" | "fechado";

export const DASHBOARD_STAGE_DEFS: {
  key: StageKey;
  label: string;
  dealStage: DealStage;
  color: string;
}[] = [
  { key: "novo", label: "Novo", dealStage: "NEW", color: "#94a3b8" },
  { key: "contato", label: "Contato", dealStage: "CONTACTED", color: "#2563eb" },
  { key: "proposta", label: "Proposta", dealStage: "PROPOSAL", color: "#7c3aed" },
  { key: "negociacao", label: "Negociação", dealStage: "NEGOTIATION", color: "#059669" },
  { key: "fechado", label: "Fechado", dealStage: "WON", color: "#334155" },
];

export interface DashboardDealItem {
  id: string; // Lead id
  dealId?: string | null;
  name: string;
  meta: string;
  value: string;
  badge?: string | null;
  stageKey: StageKey;
  dealStage: DealStage;
}

interface DashboardKanbanProps {
  initialItems: DashboardDealItem[];
  organizationId?: string | null;
  isLoading?: boolean;
}

function parseContainerStage(id: string | number): StageKey | null {
  const str = String(id);
  if (str.startsWith("column:")) {
    return str.replace("column:", "") as StageKey;
  }
  return null;
}

function parseItemLeadId(id: string | number): string | null {
  const str = String(id);
  if (str.startsWith("item:")) {
    return str.replace("item:", "");
  }
  return null;
}

export function DashboardKanban({
  initialItems,
  organizationId,
  isLoading,
}: DashboardKanbanProps): JSX.Element {
  const [items, setItems] = useState<DashboardDealItem[]>(initialItems);
  const [activeItem, setActiveItem] = useState<DashboardDealItem | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  };
  const queryClient = useQueryClient();

  // Sincroniza estado com initialItems quando os dados do servidor mudam
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Escuta atualizações de outras telas/abas (ex: Negociações ou conversão para venda)
  usePipelineSync(() => {
    if (organizationId) {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-leads", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", organizationId] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stageBuckets = useMemo(() => {
    const buckets: Record<StageKey, DashboardDealItem[]> = {
      novo: [],
      contato: [],
      proposta: [],
      negociacao: [],
      fechado: [],
    };
    for (const item of items) {
      if (buckets[item.stageKey]) {
        buckets[item.stageKey].push(item);
      } else {
        buckets.novo.push(item);
      }
    }
    return buckets;
  }, [items]);

  function findItemStage(itemId: string): StageKey | null {
    const found = items.find((i) => i.id === itemId);
    return found ? found.stageKey : null;
  }

  function handleDragStart(event: DragStartEvent) {
    const leadId = parseItemLeadId(event.active.id);
    if (!leadId) return;
    const item = items.find((i) => i.id === leadId);
    if (item) {
      setActiveItem(item);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = parseItemLeadId(active.id);
    if (!activeLeadId) return;

    const sourceStage = findItemStage(activeLeadId);
    if (!sourceStage) return;

    // Destino pode ser a própria coluna ou outro item dentro da coluna
    let targetStage: StageKey | null = parseContainerStage(over.id);
    if (!targetStage) {
      const overLeadId = parseItemLeadId(over.id);
      if (overLeadId) {
        targetStage = findItemStage(overLeadId);
      }
    }

    if (!targetStage || sourceStage === targetStage) return;

    // Atualização otimista de posicionamento entre colunas durante o drag
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === activeLeadId) {
          const def = DASHBOARD_STAGE_DEFS.find((d) => d.key === targetStage);
          return {
            ...it,
            stageKey: targetStage,
            dealStage: def ? def.dealStage : it.dealStage,
          };
        }
        return it;
      })
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);
    if (!over || !organizationId) return;

    const activeLeadId = parseItemLeadId(active.id);
    if (!activeLeadId) return;

    let targetStage: StageKey | null = parseContainerStage(over.id);
    if (!targetStage) {
      const overLeadId = parseItemLeadId(over.id);
      if (overLeadId) {
        targetStage = findItemStage(overLeadId);
      }
    }

    if (!targetStage) return;

    const currentItem = items.find((i) => i.id === activeLeadId);
    if (!currentItem) return;

    const targetDef = DASHBOARD_STAGE_DEFS.find((d) => d.key === targetStage);
    if (!targetDef) return;

    const previousItem = initialItems.find((i) => i.id === activeLeadId);
    const sourceDealStage = previousItem?.dealStage ?? currentItem.dealStage;

    // Se não houve alteração real de estágio
    if (sourceDealStage === targetDef.dealStage) {
      return;
    }

    // Persistência no backend
    try {
      if (currentItem.dealId) {
        await patchDeal(organizationId, currentItem.dealId, {
          stage: targetDef.dealStage,
          lostReason: null,
        });
      } else {
        const created = await createDeal(organizationId, currentItem.id, {
          title: currentItem.name,
          stage: targetDef.dealStage,
        });
        currentItem.dealId = created.id;
      }

      showToast("success", `Negociação de "${currentItem.name}" movida para ${targetDef.label}.`);

      // Notifica o barramento de sincronização bidirecional
      notifyPipelineUpdated({
        dealId: currentItem.dealId ?? undefined,
        leadId: currentItem.id,
        stage: targetDef.dealStage,
        source: "painel",
      });

      // Invalida cache do painel para atualizar métricas e totais
      void queryClient.invalidateQueries({ queryKey: ["dashboard-leads", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", organizationId] });
    } catch (err) {
      // Em caso de falha, reverte para o estado inicial
      setItems(initialItems);
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao atualizar estágio da negociação no servidor."
      );
    }
  }

  function handleDragCancel() {
    setActiveItem(null);
    setItems(initialItems);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DASHBOARD_STAGE_DEFS.map((stage) => {
          const columnDeals = stageBuckets[stage.key] ?? [];
          return (
            <DashboardKanbanColumn
              key={stage.key}
              stageKey={stage.key}
              label={stage.label}
              color={stage.color}
              count={columnDeals.length}
              items={columnDeals}
              isLoading={isLoading}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-[260px] pointer-events-none rotate-2 shadow-2xl opacity-95">
            <DashboardDealCardContent deal={activeItem} isDraggingOverlay />
          </div>
        ) : null}
      </DragOverlay>

      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xl backdrop-blur-md border animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          )}
          <span>{toast.text}</span>
        </div>
      ) : null}
    </DndContext>
  );
}

interface ColumnProps {
  stageKey: StageKey;
  label: string;
  color: string;
  count: number;
  items: DashboardDealItem[];
  isLoading?: boolean;
}

function DashboardKanbanColumn({
  stageKey,
  label,
  color,
  count,
  items,
  isLoading,
}: ColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${stageKey}`,
  });

  const itemIds = useMemo(() => items.map((i) => `item:${i.id}`), [items]);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[280px] rounded-xl border p-3 transition-colors ${
        isOver
          ? "border-emerald-500/60 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]"
          : "border-[var(--color-border)] bg-black/[0.02] dark:bg-black/30 backdrop-blur-xs"
      }`}
    >
      <div className="mb-2.5 h-[3px] rounded-full" style={{ background: color }} />
      <h4 className="mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
        {label}
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-px font-mono text-[11px] text-[var(--color-foreground)]">
          {count}
        </span>
      </h4>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[180px]">
          {items.length === 0 ? (
            <p className="py-8 text-center text-[11px] text-[var(--color-muted-foreground)] select-none">
              {isLoading ? "Carregando..." : "Sem negócios."}
            </p>
          ) : (
            items.map((deal) => <DashboardSortableCard key={deal.id} deal={deal} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function DashboardSortableCard({ deal }: { deal: DashboardDealItem }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item:${deal.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    touchAction: "manipulation",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DashboardDealCardContent deal={deal} />
    </div>
  );
}

function DashboardDealCardContent({
  deal,
  isDraggingOverlay,
}: {
  deal: DashboardDealItem;
  isDraggingOverlay?: boolean;
}): JSX.Element {
  return (
    <div
      className={`block cursor-grab active:cursor-grabbing rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all select-none ${
        deal.stageKey === "fechado" ? "opacity-90" : ""
      } ${
        isDraggingOverlay
          ? "border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-xl"
          : "hover:border-emerald-500/40 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <Link
          href={`/leads/${deal.id}`}
          onClick={(e) => {
            // Evita que clique no link interfira no drag
            if (isDraggingOverlay) e.preventDefault();
          }}
          className="text-[13px] font-semibold text-[var(--color-foreground)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
        >
          {deal.name}
        </Link>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
        <span className="truncate">{deal.meta}</span>
        {deal.value ? (
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
            {deal.value}
          </span>
        ) : null}
      </div>

      {deal.badge ? (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
          {deal.badge}
        </span>
      ) : null}
    </div>
  );
}
