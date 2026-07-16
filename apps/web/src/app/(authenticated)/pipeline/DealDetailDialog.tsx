"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Trash2, User } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { patchDeal, type DealStage as ApiDealStage } from "@/lib/leads-api";
import type { Deal, DealStage } from "@/lib/pipeline-deal";

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "contato", label: "Contato" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado", label: "Fechado (ganho)" },
];

const ACTION_TYPES = [
  "WhatsApp",
  "Ligação",
  "E-mail",
  "Reunião",
  "Visita",
  "Follow-up",
  "Outro",
] as const;

const TEMPERATURE_OPTIONS = [
  { value: "COLD", label: "Frio" },
  { value: "WARM", label: "Morno" },
  { value: "HOT", label: "Quente" },
] as const;

function uiToApiStage(stage: DealStage): ApiDealStage {
  switch (stage) {
    case "novo":
      return "NEW";
    case "contato":
      return "CONTACTED";
    case "proposta":
      return "PROPOSAL";
    case "negociacao":
      return "NEGOTIATION";
    case "fechado":
      return "WON";
  }
}

function formatWhatsappLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12) return `+${d}`;
  const ddi = d.slice(0, d.length - 11);
  const ddd = d.slice(-11, -9);
  const rest = d.slice(-9);
  const body = rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : rest;
  return `+${ddi} (${ddd}) ${body}`;
}

function toLocalInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

function formatRelativeUrgency(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = d.getTime() - Date.now();
  const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (Math.abs(diffMs) < 24 * 60 * 60 * 1000) {
    return diffMs < 0 ? `Venceu hoje ${fmt.format(d)}` : `Vence hoje ${fmt.format(d)}`;
  }
  const days = Math.round(Math.abs(diffMs) / 86_400_000);
  return diffMs < 0 ? `Venceu há ${days}d` : `Vence em ${days}d`;
}

export interface DealDetailDialogProps {
  deal: Deal | null;
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
  assignees: Array<{ userId: string; name: string; subtitle?: string }>;
  onSaved?: (patch: Partial<Deal>) => void;
  onMarkLost?: (deal: Deal) => void;
}

export function DealDetailDialog({
  deal,
  open,
  onClose,
  organizationId,
  assignees,
  onSaved,
  onMarkLost,
}: DealDetailDialogProps): JSX.Element | null {
  const [title, setTitle] = useState("");
  const [dealValue, setDealValue] = useState<number | null>(null);
  const [stage, setStage] = useState<DealStage>("novo");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [nextActionAt, setNextActionAt] = useState<string>("");
  const [nextActionType, setNextActionType] = useState<string>("");
  const [temperature, setTemperature] = useState<"COLD" | "WARM" | "HOT" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !deal) return;
    setTitle(deal.dealName ?? `Sistema solar — ${deal.clientName}`);
    setDealValue(deal.value ?? null);
    setStage(deal.stage);
    setAssigneeUserId(deal.assigneeUserId ?? "");
    setNextActionAt(toLocalInputValue(deal.nextStepDate));
    setNextActionType("WhatsApp");
    setTemperature("WARM");
    setError(null);
    setSubmitting(false);
  }, [open, deal]);

  const overdueLabel = useMemo(() => {
    if (!deal) return null;
    const text = formatRelativeUrgency(deal.nextStepDate);
    if (!text) return null;
    const overdue = isOverdue(deal.nextStepDate);
    return { text, overdue };
  }, [deal]);

  const stalledDays = useMemo(() => (deal ? daysSince(deal.recentAt) : null), [deal]);

  async function handleSave() {
    if (!deal || !organizationId || !deal.dealId) {
      setError("Negociação ainda não foi sincronizada com o servidor.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const numericValue = dealValue ?? 0;
      const trimmedTitle = title.trim();
      const nextActionIso = nextActionAt ? new Date(nextActionAt).toISOString() : null;
      await patchDeal(organizationId, deal.dealId, {
        title: trimmedTitle || undefined,
        value: numericValue,
        stage: uiToApiStage(stage),
        assignedUserId: assigneeUserId || null,
        nextActionAt: nextActionIso,
        nextActionType: nextActionType.trim() || null,
        temperature: temperature || null,
      });
      const selectedAssignee = assignees.find((a) => a.userId === assigneeUserId);
      onSaved?.({
        dealName: trimmedTitle || undefined,
        value: numericValue,
        stage,
        assigneeUserId: assigneeUserId || null,
        assigneeName: selectedAssignee?.name ?? null,
        nextStepDate: nextActionIso ? new Date(nextActionIso) : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a negociação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!deal) return null;

  const whatsappHref = deal.whatsapp ? `https://wa.me/${deal.whatsapp.replace(/\D/g, "")}` : null;

  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        if (!value && !submitting) onClose();
      }}
    >
      <DrawerContent className="w-full max-w-md sm:max-w-lg">
        <DrawerHeader className="space-y-3 px-6 pb-5 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Negociação
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? "—"}
            </span>
            {overdueLabel ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  overdueLabel.overdue
                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    overdueLabel.overdue ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                {overdueLabel.text}
              </span>
            ) : null}
          </div>
          <DrawerTitle className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">
            {deal.clientName}
          </DrawerTitle>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {formatWhatsappLabel(deal.whatsapp) ?? deal.contact}
          </p>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 divide-y divide-[var(--color-border)] overflow-y-auto px-6 py-1">
            {}
            <section className="space-y-3 py-5 first:pt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Resumo
              </h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="deal-title">Título da negociação</Label>
                  <Input
                    id="deal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={submitting}
                    placeholder="Sistema solar residencial — ..."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="deal-value">Valor (R$)</Label>
                    <CurrencyInput
                      id="deal-value"
                      value={dealValue}
                      onValueChange={setDealValue}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deal-stage">Estágio</Label>
                    <Select
                      id="deal-stage"
                      value={stage}
                      onChange={(e) => setStage(e.target.value as DealStage)}
                      disabled={submitting}
                    >
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            {}
            <section className="space-y-3 py-5 first:pt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Atribuição
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="deal-assignee">Responsável</Label>
                <Select
                  id="deal-assignee"
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Sem responsável</option>
                  {assignees.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.name}
                      {a.subtitle ? ` · ${a.subtitle}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </section>

            {}
            <section className="space-y-3 py-5 first:pt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Próxima ação
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="deal-next-at">Data e hora</Label>
                  <Input
                    id="deal-next-at"
                    type="datetime-local"
                    value={nextActionAt}
                    onChange={(e) => setNextActionAt(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deal-next-type">Tipo</Label>
                  <Select
                    id="deal-next-type"
                    value={nextActionType}
                    onChange={(e) => setNextActionType(e.target.value)}
                    disabled={submitting}
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Temperatura</Label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-1">
                  {TEMPERATURE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      disabled={submitting}
                      onClick={() => setTemperature(t.value)}
                      className={`inline-flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                        temperature === t.value
                          ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm ring-1 ring-[var(--color-border)]"
                          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)]/50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {}
            <section className="space-y-3 py-5 first:pt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Contato
              </h4>
              <div className="space-y-2">
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-muted)]/40"
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: "#dcfce7", color: "#15803d" }}
                    >
                      <FaWhatsapp className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        {formatWhatsappLabel(deal.whatsapp)}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">WhatsApp</p>
                    </div>
                    <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium">
                      Abrir
                    </span>
                  </a>
                ) : null}
                <Link
                  href={`/clientes/${deal.leadId}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-muted)]/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-muted)]">
                    <User className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Ver ficha do cliente
                    </p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Histórico, faturas, simulações
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                </Link>
              </div>
            </section>

            {}
            <section className="space-y-3 py-5 first:pt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Proposta
                  </p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      deal.hasProposal ? "text-[#388e3c]" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {deal.hasProposal
                      ? deal.proposalFollowUpStatus === "viewed"
                        ? "Visualizada"
                        : "Enviada"
                      : "Pendente"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Sem atividade há
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--color-foreground)]">
                    {stalledDays != null
                      ? `${stalledDays} dia${stalledDays === 1 ? "" : "s"}`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            {error ? (
              <div className="py-4">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              </div>
            ) : null}
          </div>

          {}
          <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] px-6 py-3.5">
            <div className="flex items-center justify-between gap-3">
              {onMarkLost && deal.dealId ? (
                <button
                  type="button"
                  onClick={() => onMarkLost(deal)}
                  disabled={submitting}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Marcar como perdida
                </button>
              ) : (
                <span />
              )}
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={submitting}
                  className="whitespace-nowrap"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={submitting || !deal.dealId}
                  className="whitespace-nowrap"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar alterações"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
