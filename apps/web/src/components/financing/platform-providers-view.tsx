"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCommissionRule,
  createFinancingProvider,
  createRateTable,
  deleteCommissionRule,
  deleteRateTable,
  listFinancingProviders,
  listPlatformCommissionRules,
  listRateTables,
  toggleProviderAvailability,
  updateCommissionRule,
  updateFinancingProvider,
  updateRateTable,
  type FinancingProvider,
  type FinancingProviderMode,
  type PlatformCommissionRule,
  type RateTable,
  type CreateProviderBody,
  type CreateRateTableBody,
  type CreateCommissionRuleBody,
} from "@/lib/financing-api";

const MODE_LABEL: Record<FinancingProviderMode, string> = {
  API: "Integração API",
  ASSISTED: "Parceiro humano",
  MANUAL: "Manual",
};

function amountToNumber(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function pct(decimal: string | number, frac = 2): string {
  const n = typeof decimal === "string" ? Number(decimal) : decimal;
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(frac)}%`;
}
function brl(decimal: string | number): string {
  const n = typeof decimal === "string" ? Number(decimal) : decimal;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function PlatformProvidersView(): JSX.Element {
  const { currentOrganizationId, user, loading: orgLoading } = useOrganization();
  const [providers, setProviders] = useState<FinancingProvider[]>([]);
  const [rules, setRules] = useState<PlatformCommissionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [providerDialog, setProviderDialog] = useState<{
    mode: "create" | "edit";
    initial?: FinancingProvider;
  } | null>(null);
  const [rateTableDialog, setRateTableDialog] = useState<{
    providerId: string;
    mode: "create" | "edit";
    initial?: RateTable;
  } | null>(null);
  const [commissionRuleDialog, setCommissionRuleDialog] = useState<{
    providerId: string;
    mode: "create" | "edit";
    initial?: PlatformCommissionRule;
  } | null>(null);

  const load = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      const [provs, rls] = await Promise.all([
        listFinancingProviders(currentOrganizationId),
        listPlatformCommissionRules(currentOrganizationId),
      ]);
      setProviders(provs);
      setRules(rls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId]);

  useEffect(() => {
    if (!orgLoading) void load();
  }, [orgLoading, load]);

  const rulesByProvider = useMemo(() => {
    const m = new Map<string, PlatformCommissionRule[]>();
    for (const r of rules) {
      const arr = m.get(r.providerId) ?? [];
      arr.push(r);
      m.set(r.providerId, arr);
    }
    return m;
  }, [rules]);

  if (orgLoading) return <LoadingState label="Carregando organização" compact />;
  if (user?.role !== "PLATFORM") {
    return (
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        Apenas operadores Energivia (PLATFORM) podem acessar esta área.
      </p>
    );
  }
  if (loading) return <LoadingState label="Carregando financiadores" compact />;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financiadores parceiros</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Acordo master da Energivia com cada instituição: criar/editar providers, tabelas de taxa
            (que alimentam a simulação) e regras de comissão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setProviderDialog({ mode: "create" })}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo financiador
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {providers.map((p) => {
          const expanded = expandedId === p.id;
          const provRules = rulesByProvider.get(p.id) ?? [];
          return (
            <article
              key={p.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
            >
              <header className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  className="rounded p-1 hover:bg-[var(--color-muted)]/60"
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {p.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt={p.name}
                    className="h-10 w-10 rounded-lg border border-[var(--color-border)] bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    <span className="font-mono">{p.slug}</span> · {MODE_LABEL[p.mode] ?? p.mode}
                    {" · "}
                    {p.supportsPF ? "PF" : ""}
                    {p.supportsPF && p.supportsPJ ? " · " : ""}
                    {p.supportsPJ ? "PJ" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentOrganizationId) return;
                      void toggleProviderAvailability(currentOrganizationId, p.id, !p.active).then(
                        load
                      );
                    }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      p.active
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProviderDialog({ mode: "edit", initial: p })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </header>

              {expanded && (
                <div className="space-y-4 border-t border-[var(--color-border)] p-4">
                  <RateTablesSection
                    providerId={p.id}
                    onAdd={() => setRateTableDialog({ providerId: p.id, mode: "create" })}
                    onEdit={(rt) =>
                      setRateTableDialog({ providerId: p.id, mode: "edit", initial: rt })
                    }
                    refreshKey={providers.length}
                  />
                  <CommissionRulesSection
                    rules={provRules}
                    onAdd={() => setCommissionRuleDialog({ providerId: p.id, mode: "create" })}
                    onEdit={(r) =>
                      setCommissionRuleDialog({ providerId: p.id, mode: "edit", initial: r })
                    }
                    onDelete={async (id) => {
                      if (!currentOrganizationId) return;
                      if (!window.confirm("Remover esta regra de comissão?")) return;
                      await deleteCommissionRule(currentOrganizationId, id);
                      await load();
                    }}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {providerDialog ? (
        <ProviderDialog
          mode={providerDialog.mode}
          initial={providerDialog.initial}
          onClose={() => setProviderDialog(null)}
          onSaved={async () => {
            setProviderDialog(null);
            await load();
          }}
        />
      ) : null}

      {rateTableDialog ? (
        <RateTableDialog
          providerId={rateTableDialog.providerId}
          mode={rateTableDialog.mode}
          initial={rateTableDialog.initial}
          onClose={() => setRateTableDialog(null)}
          onSaved={async () => {
            setRateTableDialog(null);
            setExpandedId(null);
            setTimeout(() => setExpandedId(rateTableDialog.providerId), 50);
          }}
        />
      ) : null}

      {commissionRuleDialog ? (
        <CommissionRuleDialog
          providerId={commissionRuleDialog.providerId}
          mode={commissionRuleDialog.mode}
          initial={commissionRuleDialog.initial}
          onClose={() => setCommissionRuleDialog(null)}
          onSaved={async () => {
            setCommissionRuleDialog(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function RateTablesSection({
  providerId,
  onAdd,
  onEdit,
  refreshKey: _refreshKey,
}: {
  providerId: string;
  onAdd: () => void;
  onEdit: (rt: RateTable) => void;
  refreshKey: number;
}): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const [items, setItems] = useState<RateTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await listRateTables(currentOrganizationId, providerId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar tabelas.");
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, providerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Tabelas de taxa
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Nova tabela
        </Button>
      </div>
      {loading ? (
        <LoadingState label="Carregando" compact />
      ) : error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Sem tabelas — simulação não consegue calcular ofertas pra esse provider.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-[var(--color-muted)]/40 uppercase tracking-wide text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5 text-right">Valor min</th>
                <th className="px-2 py-1.5 text-right">Valor max</th>
                <th className="px-2 py-1.5 text-right">Prazo</th>
                <th className="px-2 py-1.5 text-right">Taxa</th>
                <th className="px-2 py-1.5">Escopo</th>
                <th className="px-2 py-1.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((rt) => (
                <tr key={rt.id} className="border-t border-[var(--color-border)]/60">
                  <td className="px-2 py-1.5 font-medium">{rt.personType}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{brl(rt.minAmount)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{brl(rt.maxAmount)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {rt.minTerm}-{rt.maxTerm}m
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {pct(rt.monthlyRate)} a.m.
                  </td>
                  <td className="px-2 py-1.5">
                    {rt.tenantId ? (
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
                        Tenant
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Global
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => onEdit(rt)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={async () => {
                          if (!currentOrganizationId) return;
                          if (!window.confirm("Remover esta tabela de taxa?")) return;
                          await deleteRateTable(currentOrganizationId, rt.id);
                          await reload();
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CommissionRulesSection({
  rules,
  onAdd,
  onEdit,
  onDelete,
}: {
  rules: PlatformCommissionRule[];
  onAdd: () => void;
  onEdit: (r: PlatformCommissionRule) => void;
  onDelete: (id: string) => void;
}): JSX.Element {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Regras de comissão Energivia
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Nova regra
        </Button>
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Sem regra cadastrada — nenhuma comissão será calculada nas aprovações desse provider.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-1.5 text-xs"
            >
              <span>
                {r.personType ?? "PF + PJ"}
                {" · "}
                {r.calculationType === "PERCENTAGE" ? "%" : "R$ fixo"}
                {" · "}
                base: {r.baseAmount === "FINANCED_AMOUNT" ? "valor financiado" : "valor total"}
                {r.notes ? ` · ${r.notes}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {r.calculationType === "PERCENTAGE"
                    ? pct(r.value)
                    : `R$ ${Number(r.value).toFixed(2)}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5"
                  onClick={() => onEdit(r)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5"
                  onClick={() => onDelete(r.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderDialog({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: FinancingProvider;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    logoUrl: initial?.logoUrl ?? "",
    mode: (initial?.mode ?? "MANUAL") as FinancingProviderMode,
    active: initial?.active ?? true,
    supportsPF: initial?.supportsPF ?? true,
    supportsPJ: initial?.supportsPJ ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!currentOrganizationId) return;
    setErr(null);
    setSaving(true);
    try {
      const body: CreateProviderBody = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        mode: form.mode,
        active: form.active,
        supportsPF: form.supportsPF,
        supportsPJ: form.supportsPJ,
      };
      if (mode === "create") {
        await createFinancingProvider(currentOrganizationId, body);
      } else if (initial) {
        await updateFinancingProvider(currentOrganizationId, initial.id, body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent muiMaxWidth="sm" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo financiador" : "Editar financiador"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Labeled>
          <Labeled label="Slug (URL)">
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="bv, cresol, sicoob…"
            />
          </Labeled>
          <Labeled label="Logo URL (opcional)" colSpan={2}>
            <Input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </Labeled>
          <Labeled label="Modo operacional">
            <Select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as FinancingProviderMode })}
            >
              <option value="API">Integração API</option>
              <option value="ASSISTED">Parceiro humano</option>
              <option value="MANUAL">Manual</option>
            </Select>
          </Labeled>
          <Labeled label="Status">
            <Select
              value={form.active ? "1" : "0"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </Select>
          </Labeled>
          <div className="flex items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.supportsPF}
                onChange={(e) => setForm({ ...form, supportsPF: e.target.checked })}
              />
              Atende Pessoa Física
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.supportsPJ}
                onChange={(e) => setForm({ ...form, supportsPJ: e.target.checked })}
              />
              Atende Pessoa Jurídica
            </label>
          </div>
        </div>
        {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RateTableDialog({
  providerId,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  providerId: string;
  mode: "create" | "edit";
  initial?: RateTable;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const [form, setForm] = useState({
    personType: (initial?.personType ?? "PF") as "PF" | "PJ",
    minAmount: initial?.minAmount ?? "5000",
    maxAmount: initial?.maxAmount ?? "300000",
    minTerm: initial?.minTerm?.toString() ?? "12",
    maxTerm: initial?.maxTerm?.toString() ?? "84",
    monthlyRate: initial?.monthlyRate ?? "0.018",
    feeRate: initial?.feeRate ?? "0",
    active: initial?.active ?? true,
    global: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!currentOrganizationId) return;
    setErr(null);
    setSaving(true);
    try {
      const num = (s: string) => Number(s.replace(",", "."));
      if (mode === "create") {
        const body: CreateRateTableBody = {
          providerId,
          personType: form.personType,
          minAmount: num(form.minAmount),
          maxAmount: num(form.maxAmount),
          minTerm: Number(form.minTerm),
          maxTerm: Number(form.maxTerm),
          monthlyRate: num(form.monthlyRate),
          feeRate: num(form.feeRate),
          active: form.active,
          global: form.global,
        };
        await createRateTable(currentOrganizationId, body);
      } else if (initial) {
        await updateRateTable(currentOrganizationId, initial.id, {
          personType: form.personType,
          minAmount: num(form.minAmount),
          maxAmount: num(form.maxAmount),
          minTerm: Number(form.minTerm),
          maxTerm: Number(form.maxTerm),
          monthlyRate: num(form.monthlyRate),
          feeRate: num(form.feeRate),
          active: form.active,
        });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent muiMaxWidth="sm" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova tabela de taxa" : "Editar tabela de taxa"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Tipo de pessoa">
            <Select
              value={form.personType}
              onChange={(e) => setForm({ ...form, personType: e.target.value as "PF" | "PJ" })}
            >
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </Select>
          </Labeled>
          <Labeled label="Status">
            <Select
              value={form.active ? "1" : "0"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
            >
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </Select>
          </Labeled>
          <Labeled label="Valor mínimo (R$)">
            <CurrencyInput
              value={amountToNumber(form.minAmount)}
              onValueChange={(v) => setForm({ ...form, minAmount: v === null ? "" : String(v) })}
            />
          </Labeled>
          <Labeled label="Valor máximo (R$)">
            <CurrencyInput
              value={amountToNumber(form.maxAmount)}
              onValueChange={(v) => setForm({ ...form, maxAmount: v === null ? "" : String(v) })}
            />
          </Labeled>
          <Labeled label="Prazo mínimo (meses)">
            <Input
              value={form.minTerm}
              onChange={(e) => setForm({ ...form, minTerm: e.target.value })}
            />
          </Labeled>
          <Labeled label="Prazo máximo (meses)">
            <Input
              value={form.maxTerm}
              onChange={(e) => setForm({ ...form, maxTerm: e.target.value })}
            />
          </Labeled>
          <Labeled label="Taxa mensal (decimal, ex.: 0.0185)">
            <Input
              value={form.monthlyRate}
              onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })}
            />
          </Labeled>
          <Labeled label="Tarifa mensal (decimal)">
            <Input
              value={form.feeRate}
              onChange={(e) => setForm({ ...form, feeRate: e.target.value })}
            />
          </Labeled>
          {mode === "create" ? (
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.global}
                  onChange={(e) => setForm({ ...form, global: e.target.checked })}
                />
                Salvar como tabela global (válida para todos os tenants)
              </label>
            </div>
          ) : null}
        </div>
        {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommissionRuleDialog({
  providerId,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  providerId: string;
  mode: "create" | "edit";
  initial?: PlatformCommissionRule;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const [form, setForm] = useState({
    personType: (initial?.personType ?? "") as "PF" | "PJ" | "",
    calculationType: (initial?.calculationType ?? "PERCENTAGE") as "PERCENTAGE" | "FIXED",
    value: initial?.value ?? "0.02",
    baseAmount: (initial?.baseAmount ?? "FINANCED_AMOUNT") as "FINANCED_AMOUNT" | "TOTAL_AMOUNT",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!currentOrganizationId) return;
    setErr(null);
    setSaving(true);
    try {
      const num = (s: string) => Number(s.replace(",", "."));
      if (mode === "create") {
        const body: CreateCommissionRuleBody = {
          providerId,
          personType: form.personType || undefined,
          calculationType: form.calculationType,
          value: num(form.value),
          baseAmount: form.baseAmount,
          active: form.active,
          notes: form.notes || undefined,
        };
        await createCommissionRule(currentOrganizationId, body);
      } else if (initial) {
        await updateCommissionRule(currentOrganizationId, initial.id, {
          personType: form.personType || undefined,
          calculationType: form.calculationType,
          value: num(form.value),
          baseAmount: form.baseAmount,
          active: form.active,
          notes: form.notes || undefined,
        });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent muiMaxWidth="sm" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova regra de comissão" : "Editar regra"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Aplica a">
            <Select
              value={form.personType}
              onChange={(e) => setForm({ ...form, personType: e.target.value as "PF" | "PJ" | "" })}
            >
              <option value="">PF + PJ (todas)</option>
              <option value="PF">Apenas PF</option>
              <option value="PJ">Apenas PJ</option>
            </Select>
          </Labeled>
          <Labeled label="Status">
            <Select
              value={form.active ? "1" : "0"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
            >
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </Select>
          </Labeled>
          <Labeled label="Tipo de cálculo">
            <Select
              value={form.calculationType}
              onChange={(e) =>
                setForm({
                  ...form,
                  calculationType: e.target.value as "PERCENTAGE" | "FIXED",
                })
              }
            >
              <option value="PERCENTAGE">Percentual (%)</option>
              <option value="FIXED">Fixo (R$)</option>
            </Select>
          </Labeled>
          <Labeled
            label={
              form.calculationType === "PERCENTAGE"
                ? "Valor (decimal, ex.: 0.02 = 2%)"
                : "Valor (R$)"
            }
          >
            {form.calculationType === "FIXED" ? (
              <CurrencyInput
                value={amountToNumber(form.value)}
                onValueChange={(v) => setForm({ ...form, value: v === null ? "" : String(v) })}
              />
            ) : (
              <Input
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            )}
          </Labeled>
          {form.calculationType === "PERCENTAGE" ? (
            <Labeled label="Base de cálculo" colSpan={2}>
              <Select
                value={form.baseAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    baseAmount: e.target.value as "FINANCED_AMOUNT" | "TOTAL_AMOUNT",
                  })
                }
              >
                <option value="FINANCED_AMOUNT">Valor financiado</option>
                <option value="TOTAL_AMOUNT">Valor total pago (parcela × n)</option>
              </Select>
            </Labeled>
          ) : null}
          <Labeled label="Observações" colSpan={2}>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Labeled>
        </div>
        {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Labeled({
  label,
  children,
  colSpan,
}: {
  label: string;
  children: React.ReactNode;
  colSpan?: number;
}): JSX.Element {
  return (
    <div className={`space-y-1.5 ${colSpan === 2 ? "sm:col-span-2" : ""}`}>
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}
