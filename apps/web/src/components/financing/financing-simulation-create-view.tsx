"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, Loader2, Search, Users } from "lucide-react";
import { formatCpfCnpjDigits } from "@energivia/utils";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listLeads, type LeadListItem } from "@/lib/leads-api";
import {
  createFinancingSimulation,
  listFinancingProviders,
  type FinancingProvider,
} from "@/lib/financing-api";

interface FormState {
  leadId: string;
  customerName: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  personType: "PF" | "PJ";
  projectAmount: string;
  downPayment: string;
  requestedTerm: string;
}

const emptyForm: FormState = {
  leadId: "",
  customerName: "",
  cpfCnpj: "",
  email: "",
  phone: "",
  personType: "PF",
  projectAmount: "",
  downPayment: "",
  requestedTerm: "60",
};

function parseAmount(raw: string): number | null {
  if (!raw.trim()) return null;
  const cleaned = raw
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function FinancingSimulationCreateView(): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId, loading: orgLoading } = useOrganization();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [providers, setProviders] = useState<FinancingProvider[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrganizationId || orgLoading) return;
    setLeadsLoading(true);
    Promise.all([
      listLeads(currentOrganizationId, { pageSize: 100 }),
      listFinancingProviders(currentOrganizationId),
    ])
      .then(([leadsPage, provs]) => {
        setLeads(leadsPage.data);
        setProviders(provs.filter((p) => p.active));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar dados."))
      .finally(() => setLeadsLoading(false));
  }, [currentOrganizationId, orgLoading]);

  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads;
    const q = leadSearch.trim().toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.whatsapp ?? "").includes(q) ||
        (l.cpfCnpj ?? "").includes(q)
    );
  }, [leads, leadSearch]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === form.leadId) ?? null,
    [leads, form.leadId]
  );

  useEffect(() => {
    if (!selectedLead) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || selectedLead.name,
      cpfCnpj: prev.cpfCnpj || (selectedLead.cpfCnpj ?? ""),
      email: prev.email || (selectedLead.email ?? ""),
      phone: prev.phone || (selectedLead.whatsapp ?? ""),
      personType: (selectedLead.cpfCnpj ?? "").replace(/\D/g, "").length === 14 ? "PJ" : "PF",
    }));
  }, [selectedLead]);

  const projectAmount = parseAmount(form.projectAmount);
  const downPayment = parseAmount(form.downPayment) ?? 0;
  const financedAmount = projectAmount != null ? Math.max(0, projectAmount - downPayment) : null;

  const canSubmit =
    Boolean(form.leadId) &&
    Boolean(form.customerName.trim()) &&
    projectAmount != null &&
    projectAmount > 1000 &&
    downPayment < (projectAmount ?? 0) &&
    Number(form.requestedTerm) >= 6;

  const onSubmit = useCallback(async () => {
    if (!currentOrganizationId || !canSubmit || projectAmount == null) return;
    setError(null);
    setSubmitting(true);
    try {
      const sim = await createFinancingSimulation(currentOrganizationId, {
        leadId: form.leadId,
        customerName: form.customerName.trim(),
        cpfCnpj: form.cpfCnpj.replace(/\D/g, "") || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        personType: form.personType,
        projectAmount,
        downPayment,
        requestedTerm: Number(form.requestedTerm),
      });
      router.push(`/financiamento/${sim.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível simular financiamentos.");
    } finally {
      setSubmitting(false);
    }
  }, [currentOrganizationId, canSubmit, form, projectAmount, downPayment, router]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (!currentOrganizationId) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Selecione uma organização para simular financiamentos.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Simular financiamento</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Compare ofertas de múltiplas instituições em uma busca. Você não escolhe um banco antes —
          o sistema consulta todos os elegíveis e mostra um ranking.
        </p>
      </header>

      {providers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <span className="font-medium text-[var(--color-foreground)]">
            {providers.length} financiador(es) ativo(s):
          </span>
          {providers.map((p) => (
            <span
              key={p.id}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-2 py-0.5"
              title={`Modo: ${p.mode}`}
            >
              {p.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4" /> Cliente
            </CardTitle>
            <CardDescription>Selecione o lead. Os campos são auto-preenchidos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Buscar cliente</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <Input
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone ou CPF/CNPJ"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Lead</label>
              <Select
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              >
                <option value="">— escolha um lead —</option>
                {leadsLoading ? (
                  <option value="" disabled>
                    Carregando…
                  </option>
                ) : filteredLeads.length === 0 ? (
                  <option value="" disabled>
                    Nenhum lead encontrado
                  </option>
                ) : (
                  filteredLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.cpfCnpj ? ` · ${formatCpfCnpjDigits(l.cpfCnpj)}` : ""}
                      {l.whatsapp ? ` · ${l.whatsapp}` : ""}
                    </option>
                  ))
                )}
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nome / Razão social</label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  disabled={!form.leadId}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tipo</label>
                <Select
                  value={form.personType}
                  onChange={(e) => setForm({ ...form, personType: e.target.value as "PF" | "PJ" })}
                >
                  <option value="PF">Pessoa Física (PF)</option>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">CPF / CNPJ</label>
                <Input
                  value={form.cpfCnpj}
                  onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">E-mail</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Calculator className="h-4 w-4" /> Dados financeiros
            </CardTitle>
            <CardDescription>Valor do projeto, entrada e prazo desejado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Valor do projeto (R$)</label>
                <CurrencyInput
                  value={parseAmount(form.projectAmount)}
                  onValueChange={(v) =>
                    setForm({ ...form, projectAmount: v === null ? "" : String(v) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Entrada (R$)</label>
                <CurrencyInput
                  value={parseAmount(form.downPayment)}
                  onValueChange={(v) =>
                    setForm({ ...form, downPayment: v === null ? "" : String(v) })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Prazo desejado (meses)</label>
                <Select
                  value={form.requestedTerm}
                  onChange={(e) => setForm({ ...form, requestedTerm: e.target.value })}
                >
                  {[12, 24, 36, 48, 60, 72, 84, 96, 120, 144].map((m) => (
                    <option key={m} value={m}>
                      {m} meses
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {projectAmount != null && financedAmount != null ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">Valor a financiar</span>
                  <span className="font-semibold tabular-nums">{formatBRL(financedAmount)}</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              onClick={() => void onSubmit()}
              disabled={!canSubmit || submitting}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando financiamentos…
                </>
              ) : (
                <>
                  Buscar financiamentos <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
