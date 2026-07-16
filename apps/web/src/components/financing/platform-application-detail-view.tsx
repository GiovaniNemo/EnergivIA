"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  getFinancingApplication,
  updateFinancingApplication,
  type FinancingApplicationDetail,
} from "@/lib/financing-api";
import { FormField } from "./financing-application-detail-view";

export function PlatformApplicationDetailView({
  applicationId,
}: {
  applicationId: string;
}): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId, user, loading: orgLoading } = useOrganization();
  const [app, setApp] = useState<FinancingApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    notes: "",
    externalReference: "",
    approvedAmount: "",
    approvedTerm: "",
    approvedRate: "",
    approvedCet: "",
  });

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFinancingApplication(currentOrganizationId, applicationId);
      setApp(data);
      setForm({
        notes: data.notes ?? "",
        externalReference: data.externalReference ?? "",
        approvedAmount: data.approvedAmount ?? "",
        approvedTerm: data.approvedTerm != null ? String(data.approvedTerm) : "",
        approvedRate: data.approvedRate ?? "",
        approvedCet: data.approvedCet ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar solicitação.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, currentOrganizationId]);

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  const save = useCallback(async () => {
    if (!currentOrganizationId) return;
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const numeric = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));
      await updateFinancingApplication(currentOrganizationId, applicationId, {
        notes: form.notes || undefined,
        externalReference: form.externalReference || undefined,
        approvedAmount: numeric(form.approvedAmount),
        approvedTerm: numeric(form.approvedTerm),
        approvedRate: numeric(form.approvedRate),
        approvedCet: numeric(form.approvedCet),
      });
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }, [applicationId, currentOrganizationId, form, load]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;

  if (user?.role !== "PLATFORM") {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        Apenas operadores Energivia (PLATFORM) podem acessar esta tela. Para ver os dados como
        integrador, use{" "}
        <Link
          href={`/financiamento/aplicacoes/${applicationId}`}
          className="underline hover:text-amber-900"
        >
          a visão do integrador
        </Link>
        .
      </p>
    );
  }

  if (loading) return <LoadingState label="Carregando solicitação" compact />;
  if (error || !app) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/plataforma/financiamentos")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à fila
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
          onClick={() => router.push("/plataforma/financiamentos")}
          className="self-start gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à fila
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{app.simulation.customerName}</h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              <Building2 className="mr-1 inline h-3.5 w-3.5" />
              Integrador{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {(app as unknown as { tenant?: { name?: string } }).tenant?.name ?? app.tenantId}
              </span>{" "}
              · {app.provider.name} · {app.simulation.personType} · status {app.status}
            </p>
          </div>
          <Link
            href={`/financiamento/aplicacoes/${app.id}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-accent)]"
          >
            Ver como integrador
          </Link>
        </div>
      </div>

      {}
      <section className="rounded-xl border border-emerald-500/30 bg-[var(--color-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">
              Dados aprovados pelo banco
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                Energivia ops
              </span>
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Preencha conforme o banco responder. O integrador vê os valores em read-only. Toda
              edição fica auditada (quem/quando/de-para + IP).
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Valor aprovado (R$)"
            value={form.approvedAmount}
            onChange={(v) => setForm({ ...form, approvedAmount: v })}
            placeholder="35.000,00"
          />
          <FormField
            label="Prazo aprovado (meses)"
            value={form.approvedTerm}
            onChange={(v) => setForm({ ...form, approvedTerm: v })}
            placeholder="60"
          />
          <FormField
            label="Taxa aprovada (decimal, ex.: 0.0185)"
            value={form.approvedRate}
            onChange={(v) => setForm({ ...form, approvedRate: v })}
            placeholder="0.0185"
          />
          <FormField
            label="CET aprovado (decimal, ex.: 0.0192)"
            value={form.approvedCet}
            onChange={(v) => setForm({ ...form, approvedCet: v })}
            placeholder="0.0192"
          />
          <FormField
            label="Referência externa (contrato)"
            value={form.externalReference}
            onChange={(v) => setForm({ ...form, externalReference: v })}
            placeholder=""
            colSpan={2}
          />
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium">Observações</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
        </div>
        {saveError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>
        ) : null}
        <div className="mt-3 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar dados aprovados
          </Button>
          {saved ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvo ✓</span>
          ) : null}
        </div>
      </section>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Documentos, timeline e transições de status ficam na visão do integrador (link acima). Esta
        tela existe apenas para acoes da Energivia: lançar resposta do banco e referência externa.
      </p>
    </div>
  );
}
