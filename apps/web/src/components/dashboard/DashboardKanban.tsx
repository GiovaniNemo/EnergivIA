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
  type DragStartEvent,
  type Modifier,
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
import { createPortal } from "react-dom";
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

/**
 * Modificador para impedir que o card saia dos limites visíveis da tela/viewport.
 */
const restrictToWindow: Modifier = ({ transform, draggingNodeRect, windowRect }) => {
  if (!draggingNodeRect || !windowRect) {
    return transform;
  }
  return {
    ...transform,
    x: Math.min(
      Math.max(transform.x, -draggingNodeRect.left + 8),
      windowRect.width - draggingNodeRect.right - 8
    ),
    y: Math.min(
      Math.max(transform.y, -draggingNodeRect.top + 8),
      windowRect.height - draggingNodeRect.bottom - 8
    ),
  };
};

export function DashboardKanban({
  initialItems,
  organizationId,
  isLoading,
}: DashboardKanbanProps): JSX.Element {
  const [items, setItems] = useState<DashboardDealItem[]>(initialItems);
  const [activeItem, setActiveItem] = useState<DashboardDealItem | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  };

  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

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
        distance: 6,
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
      // Captura largura exata do card original para renderizar com precisão no portal
      if (typeof document !== "undefined") {
        const domEl = document.querySelector(`[data-card-lead-id="${leadId}"]`);
        if (domEl) {
          const rect = domEl.getBoundingClientRect();
          if (rect.width > 0) setActiveWidth(rect.width);
        }
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);
    setActiveWidth(undefined);
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

    // Se já estava no estágio alvo, não faz nada
    if (currentItem.stageKey === targetStage) {
      return;
    }

    // 1. Atualização otimista imediata
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === activeLeadId) {
          return {
            ...it,
            stageKey: targetStage,
            dealStage: targetDef.dealStage,
          };
        }
        return it;
      })
    );

    // 2. Persistência assíncrona no backend
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

      // 3. Notifica o barramento de sincronização bidirecional
      notifyPipelineUpdated({
        dealId: currentItem.dealId ?? undefined,
        leadId: currentItem.id,
        stage: targetDef.dealStage,
        source: "painel",
      });

      // 4. Invalida cache do painel para atualizar métricas e totais
      void queryClient.invalidateQueries({ queryKey: ["dashboard-leads", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", organizationId] });
    } catch (err) {
      // Em caso de falha, reverte para o estado original
      setItems(initialItems);
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao atualizar estágio da negociação no servidor."
      );
    }
  }

  function handleDragCancel() {
    setActiveItem(null);
    setActiveWidth(undefined);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
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

      {/* Portal no document.body para evitar distorção de coordenadas por transforms ou overflow de ancestrais */}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <DragOverlay dropAnimation={null} modifiers={[restrictToWindow]}>
              {activeItem ? (
                <div
                  style={{ width: activeWidth ?? "100%" }}
                  className="pointer-events-none shadow-2xl opacity-95"
                >
                  <DashboardDealCardContent deal={activeItem} isDraggingOverlay />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )
        : null}

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
          ? "border-emerald-500/80 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] ring-2 ring-emerald-500/20"
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
    opacity: isDragging ? 0.25 : 1,
    touchAction: "manipulation",
  };

  return (
    <div ref={setNodeRef} data-card-lead-id={deal.id} style={style} {...attributes} {...listeners}>
      <DashboardDealCardContent deal={deal} isDragging={isDragging} />
    </div>
  );
}

function DashboardDealCardContent({
  deal,
  isDragging,
  isDraggingOverlay,
}: {
  deal: DashboardDealItem;
  isDragging?: boolean;
  isDraggingOverlay?: boolean;
}): JSX.Element {
  return (
    <div
      className={`block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all select-none ${
        isDraggingOverlay
          ? "cursor-grabbing border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-2xl"
          : isDragging
            ? "cursor-grabbing border-dashed border-emerald-500/40"
            : "cursor-grab active:cursor-grabbing hover:border-emerald-500/40 hover:-translate-y-0.5"
      } ${deal.stageKey === "fechado" ? "opacity-90" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <Link
          href={`/leads/${deal.id}`}
          onClick={(e) => {
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
