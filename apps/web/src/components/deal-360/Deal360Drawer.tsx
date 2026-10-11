"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  FileText,
  Handshake,
  Calendar,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Loader2,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@energivia/utils";
import {
  getLead,
  updateLead,
  patchDeal,
  listSimulationsForLead,
  listLeadActivity,
  appendLeadActivity,
  waMeUrl,
  type LeadDetail,
  type SimulationListItem,
  type LeadActivityRow,
  type DealStage as ApiDealStage,
} from "@/lib/leads-api";
import {
  formatProposalDatePt,
  proposalQuotedTotalBrl,
  proposalStatusLabel,
  proposalStatusPillClass,
  proposalSystemPowerKw,
  proposalSystemSizeKwFromSimulation,
} from "@/lib/proposal-card-meta";
import { formatCpfCnpjDigits, maskWhatsappBr, formatBRL } from "@energivia/utils";
import type { Deal, DealStage, ClosedDealStatus } from "@/lib/pipeline-deal";
import {
  buildDealFromLeadDetail,
  useProposalStudy,
} from "@/components/pipeline/proposal-study-provider";
import { proposalStudyBridge } from "@/components/pipeline/proposal-study-bridge";

export type DealDetailStageOption = DealStage | `fechado:${ClosedDealStatus}`;

const STAGE_OPTIONS: { value: DealDetailStageOption; label: string; color: string }[] = [
  { value: "novo", label: "Novo", color: "bg-slate-500" },
  { value: "contato", label: "Contato", color: "bg-blue-500" },
  { value: "proposta", label: "Proposta", color: "bg-violet-500" },
  { value: "negociacao", label: "Negociação", color: "bg-emerald-500" },
  { value: "fechado:won", label: "Ganho", color: "bg-emerald-600" },
  { value: "fechado:lost", label: "Perdido", color: "bg-red-500" },
  { value: "fechado:disqualified", label: "Desqualificado", color: "bg-zinc-500" },
  { value: "fechado:postponed", label: "Adiado", color: "bg-amber-500" },
  { value: "fechado:cancelled", label: "Cancelado", color: "bg-rose-500" },
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
  { value: "COLD", label: "Frio", color: "text-blue-500" },
  { value: "WARM", label: "Morno", color: "text-amber-500" },
  { value: "HOT", label: "Quente", color: "text-red-500" },
] as const;

function uiToApiStage(stageOption: DealDetailStageOption): ApiDealStage {
  if (stageOption.startsWith("fechado:")) {
    const sub = stageOption.replace("fechado:", "") as ClosedDealStatus;
    return sub === "won" ? "WON" : "LOST";
  }
  switch (stageOption) {
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

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  const first = p[0]?.[0] ?? "";
  const last = p[p.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function toLocalInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type Deal360Tab = "cliente" | "propostas" | "negociacao";

export type Deal360DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  leadId?: string | null;
  organizationId: string | null;
  assignees?: { userId: string; name: string; subtitle?: string }[];
  onSaved?: (patch: Partial<Deal>) => void;
  onMarkLost?: (deal: Deal) => void;
  onMarkWon?: (deal: Deal) => void;
  initialTab?: Deal360Tab;
};

export function Deal360Drawer({
  open,
  onOpenChange,
  deal,
  leadId: explicitLeadId,
  organizationId,
  assignees = [],
  onSaved,
  onMarkLost,
  initialTab = "cliente",
}: Deal360DrawerProps): JSX.Element | null {
  const { openStudyForDeal } = useProposalStudy();

  const effectiveLeadId = deal?.leadId || explicitLeadId || null;

  // Active tab state
  const [activeTab, setActiveTab] = useState<Deal360Tab>(initialTab);

  // Lead, simulations and activities state
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [sims, setSims] = useState<SimulationListItem[]>([]);
  const [activities, setActivities] = useState<LeadActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states - Tab Negociação
  const [title, setTitle] = useState("");
  const [dealValue, setDealValue] = useState(0);
  const [stageOption, setStageOption] = useState<DealDetailStageOption>("novo");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [temperature, setTemperature] = useState<string>("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [nextActionType, setNextActionType] = useState<string>("WhatsApp");
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Form states - Tab Cliente (inline editing)
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCpfCnpj, setClientCpfCnpj] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientSavedNotice, setClientSavedNotice] = useState(false);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);

  // Synchronize initial tab when drawer opens or initialTab prop changes
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Synchronize deal form fields
  useEffect(() => {
    if (!deal) return;
    setTitle(deal.dealName || deal.clientName ? `Negociação — ${deal.clientName}` : "");
    setDealValue(deal.value || 0);
    const initialStage: DealDetailStageOption =
      deal.stage === "fechado"
        ? (`fechado:${deal.status ?? "won"}` as DealDetailStageOption)
        : deal.stage;
    setStageOption(initialStage);
    setAssigneeUserId(deal.assigneeUserId || "");
    setTemperature(deal.temperature || "");
    setNextActionAt(deal.nextStepDate ? toLocalInputValue(deal.nextStepDate) : "");
    setNextActionType(deal.nextActionType || "WhatsApp");
  }, [deal]);

  // Load Lead, Simulations and Activities
  const loadData = useCallback(async () => {
    if (!open || !organizationId || !effectiveLeadId) {
      setLead(null);
      setSims([]);
      setActivities([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [leadData, simList, actList] = await Promise.all([
        getLead(organizationId, effectiveLeadId),
        listSimulationsForLead(organizationId, effectiveLeadId).catch(
          () => [] as SimulationListItem[]
        ),
        listLeadActivity(organizationId, effectiveLeadId).catch(() => [] as LeadActivityRow[]),
      ]);
      setLead(leadData);
      setSims(simList);
      setActivities(actList);

      // Initialize client form fields
      setClientName(leadData.name || "");
      setClientWhatsapp(leadData.whatsapp || "");
      setClientEmail(leadData.email || "");
      setClientCpfCnpj(leadData.cpfCnpj ? formatCpfCnpjDigits(leadData.cpfCnpj) : "");
      setClientCompany(leadData.company || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados do cliente.");
    } finally {
      setLoading(false);
    }
  }, [open, organizationId, effectiveLeadId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Bridge callback for study completion
  useEffect(() => {
    if (!open) {
      proposalStudyBridge.setOnDrawerStudyComplete(null);
      return;
    }
    proposalStudyBridge.setOnDrawerStudyComplete(() => {
      void loadData();
    });
    return () => proposalStudyBridge.setOnDrawerStudyComplete(null);
  }, [open, loadData]);

  // Flatten proposals from deals
  const proposalsFlat = useMemo(() => {
    if (!lead) return [];
    const rows: {
      id: string;
      proposalNumber?: number | null;
      title: string;
      dealTitle: string;
      status: string;
      createdAt: string;
      validUntil: string;
      sentAt: string | null | undefined;
      renderedData: unknown | null | undefined;
      simulationInput: unknown | null | undefined;
    }[] = [];
    for (const d of lead.deals) {
      for (const p of d.proposals) {
        rows.push({
          id: p.id,
          proposalNumber: p.proposalNumber,
          title: p.title,
          dealTitle: d.title,
          status: p.status,
          createdAt: p.createdAt,
          validUntil: p.validUntil,
          sentAt: p.sentAt,
          renderedData: p.renderedData,
          simulationInput: p.simulation?.input,
        });
      }
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lead]);

  // Save Deal
  const handleSaveDeal = async () => {
    if (!organizationId || !deal?.dealId) return;
    setSubmitting(true);
    setError(null);
    try {
      const targetStage: DealStage = stageOption.startsWith("fechado:")
        ? "fechado"
        : (stageOption as DealStage);
      const targetStatus: ClosedDealStatus | undefined = stageOption.startsWith("fechado:")
        ? (stageOption.replace("fechado:", "") as ClosedDealStatus)
        : undefined;

      const nextActionIso = nextActionAt ? new Date(nextActionAt).toISOString() : null;

      await patchDeal(organizationId, deal.dealId, {
        title: title.trim() || undefined,
        value: dealValue > 0 ? dealValue : null,
        stage: uiToApiStage(stageOption),
        assignedUserId: assigneeUserId || null,
        nextActionAt: nextActionIso,
        nextActionType: nextActionType.trim() || null,
        temperature: temperature || null,
      });

      const selectedAssignee = assignees.find((a) => a.userId === assigneeUserId);
      onSaved?.({
        dealName: title.trim() || undefined,
        value: dealValue,
        stage: targetStage,
        status: targetStatus,
        assigneeUserId: assigneeUserId || null,
        assigneeName: selectedAssignee?.name ?? null,
        nextStepDate: nextActionIso ? new Date(nextActionIso) : null,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar negociação.");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Client info inline
  const handleSaveClient = async () => {
    if (!organizationId || !effectiveLeadId) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateLead(organizationId, effectiveLeadId, {
        name: clientName.trim(),
        whatsapp: clientWhatsapp.replace(/\D/g, ""),
        email: clientEmail.trim() || null,
        cpfCnpj: clientCpfCnpj.replace(/\D/g, "") || null,
        company: clientCompany.trim() || null,
      });
      setClientSavedNotice(true);
      setTimeout(() => setClientSavedNotice(false), 2500);
      onSaved?.({
        clientName: clientName.trim(),
        whatsapp: clientWhatsapp.replace(/\D/g, ""),
      });
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados do cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  // Add quick follow-up note
  const handleAddNote = async () => {
    if (!organizationId || !effectiveLeadId || !newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      await appendLeadActivity(organizationId, effectiveLeadId, {
        kind: "NOTE",
        text: newNoteText.trim(),
      });
      setNewNoteText("");
      const freshActs = await listLeadActivity(organizationId, effectiveLeadId);
      setActivities(freshActs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar anotação.");
    } finally {
      setIsAddingNote(false);
    }
  };

  // Trigger New Proposal with AI
  const handleNewProposal = useCallback(async () => {
    if (!lead) return;
    const pipelineDeal = buildDealFromLeadDetail(lead);
    const bestSim = sims[0];
    if (bestSim) {
      await openStudyForDeal(pipelineDeal, { existingSimulation: bestSim });
    } else {
      await openStudyForDeal(pipelineDeal, { forceStudyModal: true });
    }
  }, [lead, sims, openStudyForDeal]);

  // Copy proposal public link
  const handleCopyProposalUrl = (id: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://app.energivia.com.br";
    const url = `${origin}/proposta/${id}`;
    void navigator.clipboard.writeText(url);
    setCopiedProposalId(id);
    setTimeout(() => setCopiedProposalId(null), 2000);
  };

  const displayName = lead?.name || deal?.clientName || "Oportunidade Comercial";
  const displayPhone = lead?.whatsapp || deal?.whatsapp || "";
  const cleanPhone = displayPhone.replace(/\D/g, "");
  const waHref = cleanPhone
    ? waMeUrl(cleanPhone, `Olá, ${displayName.split(/\s+/)[0]}! Tudo bem?`)
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full max-w-xl sm:max-w-2xl bg-[var(--color-card)] flex flex-col h-full border-l border-[var(--color-border)] shadow-2xl">
        {/* Drawer Header */}
        <DrawerHeader className="border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-background)]/80 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 text-base font-bold text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] shadow-xs"
                aria-hidden
              >
                {initials(displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DrawerTitle className="truncate text-lg font-bold text-[var(--color-foreground)]">
                    {displayName}
                  </DrawerTitle>
                  {temperature ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        temperature === "HOT" && "bg-red-500/15 text-red-600 dark:text-red-400",
                        temperature === "WARM" &&
                          "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        temperature === "COLD" && "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      )}
                    >
                      {TEMPERATURE_OPTIONS.find((t) => t.value === temperature)?.label}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {displayPhone ? (
                    <span>{maskWhatsappBr(displayPhone)}</span>
                  ) : (
                    <span>Sem telefone cadastrado</span>
                  )}
                  {lead?.company ? <span>· {lead.company}</span> : null}
                </div>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 shrink-0">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                  title="Abrir conversa no WhatsApp"
                >
                  <FaWhatsapp className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </a>
              ) : null}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex border-b border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setActiveTab("cliente")}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors",
                activeTab === "cliente"
                  ? "text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              <User className="h-3.5 w-3.5" />
              <span>Cliente</span>
              {activeTab === "cliente" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("propostas")}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors",
                activeTab === "propostas"
                  ? "text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Propostas ({proposalsFlat.length})</span>
              {activeTab === "propostas" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("negociacao")}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors",
                activeTab === "negociacao"
                  ? "text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Handshake className="h-3.5 w-3.5" />
              <span>Negociação</span>
              {activeTab === "negociacao" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"
                />
              )}
            </button>
          </div>
        </DrawerHeader>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-16">
              <LoadingState label="Carregando informações 360°..." compact />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-50/50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-semibold">Erro ao carregar:</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* TAB 1: CLIENTE */}
              {activeTab === "cliente" && (
                <motion.div
                  key="tab-cliente"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Dados Rápidos de Contato */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[var(--color-primary)]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                          Dados de Contato
                        </h3>
                      </div>
                      {clientSavedNotice ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Salvo com sucesso!
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="client-name" className="text-xs font-medium">
                          Nome completo
                        </Label>
                        <Input
                          id="client-name"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Nome do cliente"
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="client-whatsapp" className="text-xs font-medium">
                          WhatsApp
                        </Label>
                        <Input
                          id="client-whatsapp"
                          value={clientWhatsapp}
                          onChange={(e) => setClientWhatsapp(e.target.value)}
                          placeholder="(11) 98765-4321"
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="client-email" className="text-xs font-medium">
                          E-mail
                        </Label>
                        <Input
                          id="client-email"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="cliente@email.com"
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="client-cpf-cnpj" className="text-xs font-medium">
                          CPF / CNPJ
                        </Label>
                        <Input
                          id="client-cpf-cnpj"
                          value={clientCpfCnpj}
                          onChange={(e) => setClientCpfCnpj(e.target.value)}
                          placeholder="000.000.000-00"
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="client-company" className="text-xs font-medium">
                          Empresa (opcional)
                        </Label>
                        <Input
                          id="client-company"
                          value={clientCompany}
                          onChange={(e) => setClientCompany(e.target.value)}
                          placeholder="Razão Social / Nome Fantasia"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveClient}
                        disabled={submitting || !clientName.trim()}
                        className="text-xs h-8"
                      >
                        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Salvar dados do cliente
                      </Button>
                    </div>
                  </div>

                  {/* Ação Rápida: Nova Proposta com IA */}
                  <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-gradient-to-br from-[var(--color-primary)]/[0.08] to-transparent p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-foreground)]">
                        <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                        <span>Gerar Proposta com IA</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        Inicie o dimensionamento solar instantâneo sem sair desta tela.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleNewProposal}
                      className="shrink-0 h-9 gap-1.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-700)] text-xs font-semibold shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Nova Proposta</span>
                    </Button>
                  </div>

                  {/* Informações de Localidade / Conexão */}
                  {lead?.energyBills && lead.energyBills.length > 0 ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
                        <Zap className="h-4 w-4 text-[var(--color-primary)]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                          Dados da Conta de Energia
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {lead.energyBills[0]?.extractedData?.distributor ? (
                          <div>
                            <span className="text-[var(--color-muted-foreground)]">
                              Distribuidora:
                            </span>
                            <p className="font-semibold text-[var(--color-foreground)]">
                              {lead.energyBills[0].extractedData.distributor}
                            </p>
                          </div>
                        ) : null}
                        {lead.energyBills[0]?.extractedData?.monthlyConsumptionKwh ? (
                          <div>
                            <span className="text-[var(--color-muted-foreground)]">
                              Consumo Médio:
                            </span>
                            <p className="font-semibold text-[var(--color-foreground)]">
                              {lead.energyBills[0].extractedData.monthlyConsumptionKwh} kWh/mês
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {/* TAB 2: PROPOSTAS */}
              {activeTab === "propostas" && (
                <motion.div
                  key="tab-propostas"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Botão de Destaque: Nova Proposta com IA */}
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--color-primary)]/30 bg-gradient-to-r from-[var(--color-primary)]/[0.1] via-[var(--color-primary)]/[0.05] to-transparent p-4">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                        <span>Propostas Comerciais</span>
                      </h4>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        {proposalsFlat.length} proposta(s) gerada(s) para este cliente.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleNewProposal}
                      className="h-9 gap-1.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-700)] text-xs font-semibold shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Nova Proposta com IA</span>
                    </Button>
                  </div>

                  {/* Lista de Propostas */}
                  {proposalsFlat.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-12 px-4 text-center bg-[var(--color-card)]/50">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-3">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                        Nenhuma proposta gerada ainda
                      </h4>
                      <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs mt-1">
                        Utilize o botão acima para criar o primeiro estudo solar e orçamento com
                        inteligência artificial.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proposalsFlat.map((p) => {
                        const totalBrl = proposalQuotedTotalBrl(p.renderedData, p.simulationInput);
                        const kw =
                          proposalSystemPowerKw(p.renderedData) ??
                          proposalSystemSizeKwFromSimulation(p.simulationInput);

                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs transition hover:border-[var(--color-primary)]/30 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {p.proposalNumber ? (
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]">
                                      #{p.proposalNumber}
                                    </span>
                                  ) : null}
                                  <h4 className="truncate text-sm font-bold text-[var(--color-foreground)]">
                                    {p.title}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                                  Criada em {formatProposalDatePt(p.createdAt)}
                                </p>
                              </div>
                              <span className={proposalStatusPillClass(p.status)}>
                                {proposalStatusLabel(p.status)}
                              </span>
                            </div>

                            {/* Detalhes Rápidos: Potência e Valor */}
                            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-muted)]/20 p-2.5 text-xs">
                              <div>
                                <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase font-semibold">
                                  Potência do Sistema
                                </span>
                                <p className="font-bold text-[var(--color-foreground)]">
                                  {kw != null ? `${kw.toFixed(2)} kWp` : "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--color-muted-foreground)] uppercase font-semibold">
                                  Valor da Proposta
                                </span>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {totalBrl != null ? formatBRL(totalBrl) : "—"}
                                </p>
                              </div>
                            </div>

                            {/* Ações da Proposta */}
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--color-border)]/60">
                              <button
                                type="button"
                                onClick={() => handleCopyProposalUrl(p.id)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
                                title="Copiar link público para enviar ao cliente"
                              >
                                {copiedProposalId === p.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                                    <span>Copiar Link</span>
                                  </>
                                )}
                              </button>

                              <Link
                                href={`/propostas/${p.id}`}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                                <span>Ver Detalhes</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: NEGOCIAÇÃO */}
              {activeTab === "negociacao" && (
                <motion.div
                  key="tab-negociacao"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Status, Valor e Estágio */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                      <Handshake className="h-4 w-4 text-[var(--color-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                        Status do Funil de Vendas
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="deal-title" className="text-xs font-medium">
                          Título da oportunidade
                        </Label>
                        <Input
                          id="deal-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ex: Sistema Solar Residencial"
                          disabled={submitting}
                        />
                      </div>

                      <div className="grid gap-3.5 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="deal-value" className="text-xs font-medium">
                            Valor Estimado (R$)
                          </Label>
                          <CurrencyInput
                            id="deal-value"
                            value={dealValue}
                            onValueChange={setDealValue}
                            disabled={submitting}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="deal-stage" className="text-xs font-medium">
                            Estágio no Kanban
                          </Label>
                          <Select
                            id="deal-stage"
                            value={stageOption}
                            onChange={(e) =>
                              setStageOption(e.target.value as DealDetailStageOption)
                            }
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

                      <div className="grid gap-3.5 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="deal-assignee" className="text-xs font-medium">
                            Responsável
                          </Label>
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
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Temperatura Comercial</Label>
                          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-1">
                            {TEMPERATURE_OPTIONS.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                disabled={submitting}
                                onClick={() => setTemperature(t.value)}
                                className={cn(
                                  "inline-flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition",
                                  temperature === t.value
                                    ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-xs ring-1 ring-[var(--color-border)]"
                                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)]/50"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Próximo Passo / Agendamento */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                          Próxima Ação de Follow-up
                        </h3>
                      </div>
                      {nextActionAt ? (
                        <button
                          type="button"
                          onClick={() => setNextActionAt("")}
                          className="text-[11px] font-semibold text-red-600 hover:underline dark:text-red-400"
                        >
                          Limpar agendamento
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="next-action-date" className="text-xs font-medium">
                          Data e hora
                        </Label>
                        <Input
                          id="next-action-date"
                          type="datetime-local"
                          value={nextActionAt}
                          onChange={(e) => setNextActionAt(e.target.value)}
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="next-action-type" className="text-xs font-medium">
                          Canal / Tipo
                        </Label>
                        <Select
                          id="next-action-type"
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
                  </div>

                  {/* Notas de Follow-up e Histórico de Atividades */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                      <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">
                        Histórico & Anotações de Follow-up
                      </h3>
                    </div>

                    {/* Input de Nova Nota Rápida */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Adicionar nota de follow-up (ex: Ligação realizada, cliente pediu desconto...)"
                          disabled={isAddingNote}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleAddNote();
                            }
                          }}
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          disabled={isAddingNote || !newNoteText.trim()}
                          className="shrink-0 h-9 gap-1 text-xs"
                        >
                          {isAddingNote ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          <span>Registrar</span>
                        </Button>
                      </div>
                    </div>

                    {/* Timeline de Atividades */}
                    {activities.length === 0 ? (
                      <p className="text-xs text-[var(--color-muted-foreground)] text-center py-4">
                        Nenhuma atividade registrada ainda.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {activities.map((act) => (
                          <div
                            key={act.id}
                            className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-muted)]/10 p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
                              <span className="font-semibold uppercase tracking-wider text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">
                                {act.kind === "NOTE" ? "Anotação" : act.kind}
                              </span>
                              <span>{formatProposalDatePt(act.createdAt)}</span>
                            </div>
                            <p className="text-[var(--color-foreground)] font-medium leading-relaxed">
                              {act.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3.5 flex items-center justify-between gap-3">
          {onMarkLost && deal?.dealId ? (
            <button
              type="button"
              onClick={() => onMarkLost(deal)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 transition hover:underline disabled:opacity-50 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Marcar como perdida</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDeal}
              disabled={submitting || !deal?.dealId}
              className="text-xs h-9 gap-1.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-700)] shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
