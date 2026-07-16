"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getFinancingApplication,
  transitionFinancingApplication,
  updateFinancingDocument,
  uploadFinancingDocumentFile,
  type FinancingApplicationDetail,
  type FinancingApplicationStatus,
  type FinancingDocumentStatus,
  type FinancingTimelineEvent,
} from "@/lib/financing-api";

const STATUS_LABEL: Record<FinancingApplicationStatus, string> = {
  CREATED: "Nova solicitação",
  AWAITING_DOCUMENTS: "Aguardando documentos",
  DOCUMENTS_RECEIVED: "Documentos recebidos",
  SUBMITTED_TO_BANK: "Enviado ao banco",
  UNDER_REVIEW: "Em análise",
  PENDING: "Pendência",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
  CONTRACT_SIGNED: "Contrato assinado",
  CREDIT_RELEASED: "Crédito liberado",
  COMPLETED: "Concluído",
};

const STATUS_TONE: Record<FinancingApplicationStatus, string> = {
  CREATED: "bg-slate-100 text-slate-800",
  AWAITING_DOCUMENTS: "bg-amber-100 text-amber-800",
  DOCUMENTS_RECEIVED: "bg-sky-100 text-sky-800",
  SUBMITTED_TO_BANK: "bg-indigo-100 text-indigo-800",
  UNDER_REVIEW: "bg-violet-100 text-violet-800",
  PENDING: "bg-orange-100 text-orange-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  CONTRACT_SIGNED: "bg-teal-100 text-teal-800",
  CREDIT_RELEASED: "bg-emerald-200 text-emerald-900",
  COMPLETED: "bg-slate-200 text-slate-900",
};

const ALLOWED_TRANSITIONS: Record<FinancingApplicationStatus, FinancingApplicationStatus[]> = {
  CREATED: ["AWAITING_DOCUMENTS", "DOCUMENTS_RECEIVED", "REJECTED"],
  AWAITING_DOCUMENTS: ["DOCUMENTS_RECEIVED", "REJECTED"],
  DOCUMENTS_RECEIVED: ["SUBMITTED_TO_BANK", "AWAITING_DOCUMENTS", "REJECTED"],
  SUBMITTED_TO_BANK: ["UNDER_REVIEW", "PENDING", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["PENDING", "APPROVED", "REJECTED"],
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED", "AWAITING_DOCUMENTS"],
  APPROVED: ["CONTRACT_SIGNED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
  CONTRACT_SIGNED: ["CREDIT_RELEASED"],
  CREDIT_RELEASED: ["COMPLETED"],
  COMPLETED: [],
};

const DOC_STATUS_LABEL: Record<FinancingDocumentStatus, string> = {
  REQUIRED: "Pendente",
  UPLOADED: "Enviado",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const DOC_STATUS_TONE: Record<FinancingDocumentStatus, string> = {
  REQUIRED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  UPLOADED: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

export function formatBRL(value: number | string | null): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
export function formatPct(v: number | string | null, frac = 2): string {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(frac)}%`;
}
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export function FinancingApplicationDetailView({
  applicationId,
}: {
  applicationId: string;
}): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId, loading: orgLoading } = useOrganization();
  const [app, setApp] = useState<FinancingApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFinancingApplication(currentOrganizationId, applicationId);
      setApp(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar solicitação.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, currentOrganizationId]);

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  const transitions = useMemo(() => (app ? ALLOWED_TRANSITIONS[app.status] : []), [app]);

  const transition = useCallback(
    async (to: FinancingApplicationStatus) => {
      if (!currentOrganizationId) return;
      setActionLoading(true);
      try {
        await transitionFinancingApplication(currentOrganizationId, applicationId, { to });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao mover status.");
      } finally {
        setActionLoading(false);
      }
    },
    [applicationId, currentOrganizationId, load]
  );

  const onUploadDocument = useCallback(
    async (documentId: string, fileUrl: string) => {
      if (!currentOrganizationId) return;
      setActionLoading(true);
      try {
        await updateFinancingDocument(currentOrganizationId, documentId, { fileUrl });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao registrar upload.");
      } finally {
        setActionLoading(false);
      }
    },
    [currentOrganizationId, load]
  );

  const onReviewDocument = useCallback(
    async (documentId: string, status: FinancingDocumentStatus, notes?: string) => {
      if (!currentOrganizationId) return;
      setActionLoading(true);
      try {
        await updateFinancingDocument(currentOrganizationId, documentId, {
          status,
          ...(notes ? { reviewerNotes: notes } : {}),
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao revisar documento.");
      } finally {
        setActionLoading(false);
      }
    },
    [currentOrganizationId, load]
  );

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (loading) return <LoadingState label="Carregando solicitação" compact />;
  if (error || !app) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/financiamento/aplicacoes")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error ?? "Solicitação não encontrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/financiamento/aplicacoes")}
          className="self-start gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Kanban
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{app.simulation.customerName}</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {app.provider.name} · {app.simulation.personType} · criado em{" "}
              {formatDate(app.createdAt)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_TONE[app.status]}`}
          >
            {STATUS_LABEL[app.status]}
          </span>
        </div>
      </div>

      {}
      {transitions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Avançar para
          </span>
          {transitions.map((to) => (
            <Button
              key={to}
              type="button"
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => void transition(to)}
            >
              {STATUS_LABEL[to]}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          {}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="text-sm font-semibold">Oferta selecionada</h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Snapshot da oferta no momento da solicitação. Valores aprovados pelo banco entram em
              campos separados abaixo.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Parcela" value={formatBRL(app.selectedOffer.installmentValue)} />
              <Metric label="Prazo" value={`${app.selectedOffer.term}x`} />
              <Metric label="Taxa a.m." value={formatPct(app.selectedOffer.monthlyRate)} />
              <Metric label="CET a.m." value={formatPct(app.selectedOffer.cet)} />
              <Metric label="Financiado" value={formatBRL(app.selectedOffer.financedAmount)} />
              <Metric label="Valor total" value={formatBRL(app.selectedOffer.totalAmount)} />
            </div>
          </div>

          {}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" /> Documentos
              </h2>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {app.documents.length} item(ns)
              </span>
            </header>
            {app.documents.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                Nenhum documento exigido para esse provedor.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {app.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{doc.name}</p>
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-1 text-[11px] text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {doc.fileUrl}
                        </a>
                      ) : null}
                      {doc.reviewerNotes ? (
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">
                          Nota: {doc.reviewerNotes}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DOC_STATUS_TONE[doc.status]}`}
                    >
                      {DOC_STATUS_LABEL[doc.status]}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {doc.status !== "APPROVED" && doc.status !== "REJECTED" && (
                        <DocumentUploader
                          documentId={doc.id}
                          disabled={actionLoading}
                          organizationId={currentOrganizationId!}
                          onUploaded={onUploadDocument}
                        />
                      )}
                      {doc.status === "UPLOADED" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => void onReviewDocument(doc.id, "APPROVED")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => {
                              const reason = window.prompt("Motivo da rejeição:");
                              if (!reason) return;
                              void onReviewDocument(doc.id, "REJECTED", reason);
                            }}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {}
          <BankApprovedDataReadonly app={app} />
        </section>

        {}
        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" /> Histórico
          </h2>
          {app.timelineEvents.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {app.timelineEvents.map((ev) => (
                <TimelineItem key={ev.id} event={ev} />
              ))}
            </ol>
          )}
        </aside>
      </div>

      {}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="text-sm font-semibold">Cliente</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Nome" value={app.simulation.customerName} />
          <Metric label="CPF/CNPJ" value={app.simulation.cpfCnpj ?? "—"} />
          <Metric label="Telefone" value={app.simulation.phone ?? "—"} />
        </div>
        <div className="mt-3">
          <Link
            href={`/clientes/${app.simulation.leadId}`}
            className="text-xs text-sky-600 hover:underline dark:text-sky-400"
          >
            Abrir ficha do cliente →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  colSpan,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  colSpan?: number;
}): JSX.Element {
  return (
    <div className={`space-y-1.5 ${colSpan === 2 ? "sm:col-span-2" : ""}`}>
      <label className="text-xs font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function BankApprovedDataReadonly({
  app,
}: {
  app: FinancingApplicationDetail;
}): JSX.Element {
  const hasApprovedData =
    app.approvedAmount != null ||
    app.approvedTerm != null ||
    app.approvedRate != null ||
    app.approvedCet != null ||
    Boolean(app.externalReference);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <h2 className="text-sm font-semibold">Dados aprovados pelo banco</h2>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Estes valores vêm do banco e são preenchidos pela equipe Energivia. Você não pode editá-los.
      </p>
      {hasApprovedData ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Valor aprovado" value={formatBRL(app.approvedAmount)} />
          <Metric
            label="Prazo aprovado"
            value={app.approvedTerm != null ? `${app.approvedTerm}x` : "—"}
          />
          <Metric label="Taxa a.m." value={formatPct(app.approvedRate)} />
          <Metric label="CET a.m." value={formatPct(app.approvedCet)} />
          {app.externalReference ? (
            <div className="sm:col-span-4">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Referência do banco
              </p>
              <p className="font-mono text-sm">{app.externalReference}</p>
            </div>
          ) : null}
          {app.notes ? (
            <div className="sm:col-span-4">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Observações
              </p>
              <p className="whitespace-pre-wrap text-sm">{app.notes}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-4 text-center text-sm text-[var(--color-muted-foreground)]">
          Aguardando resposta do banco. A equipe Energivia preenche estes campos assim que o
          financiador confirma a aprovação.
        </p>
      )}
    </div>
  );
}

function DocumentUploader({
  documentId,
  disabled,
  organizationId,
  onUploaded,
}: {
  documentId: string;
  disabled: boolean;
  organizationId: string;
  onUploaded: (documentId: string, fileUrl: string) => void;
}): JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const fileUrl = await uploadFinancingDocumentFile(organizationId, file);
        onUploaded(documentId, fileUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no upload.");
      } finally {
        setUploading(false);
      }
    },
    [documentId, onUploaded, organizationId]
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <UploadCloud className="mr-1 h-3.5 w-3.5" /> Anexar
          </>
        )}
      </Button>
      {error ? <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

function TimelineItem({ event }: { event: FinancingTimelineEvent }): JSX.Element {
  const tone =
    event.type === "APPROVED" ||
    event.type === "CREDIT_RELEASED" ||
    event.type === "DOCUMENT_APPROVED"
      ? "bg-emerald-500"
      : event.type === "REJECTED" ||
          event.type === "DOCUMENT_REJECTED" ||
          event.type === "PENDENCY_OPENED"
        ? "bg-red-500"
        : event.type === "DOCUMENT_UPLOADED" || event.type === "SUBMITTED_TO_BANK"
          ? "bg-sky-500"
          : "bg-slate-400";
  const icon =
    event.type === "REJECTED" || event.type === "PENDENCY_OPENED" ? (
      <AlertCircle className="h-3 w-3 text-white" />
    ) : null;

  return (
    <li className="relative pl-5">
      <span
        className={`absolute left-0 top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full ${tone}`}
      >
        {icon}
      </span>
      <p className="text-sm leading-snug">{event.description}</p>
      <p className="text-[11px] text-[var(--color-muted-foreground)]">
        {formatDate(event.createdAt)}
      </p>
    </li>
  );
}
