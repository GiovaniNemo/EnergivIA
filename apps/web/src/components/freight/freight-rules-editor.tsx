"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2, Truck, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { BR_STATES } from "@/lib/br-states";

interface FreightRuleDraft {
  state: string;
  value: number | null;
}

interface FreightRulesEditorProps {
  title?: string;
  description: string;
  load: () => Promise<Array<{ state: string; value: number }>>;
  save: (
    rules: Array<{ state: string; value: number }>
  ) => Promise<Array<{ state: string; value: number }>>;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function FreightRulesEditor({
  title = "Frete por estado",
  description,
  load,
  save,
}: FreightRulesEditorProps): JSX.Element {
  const [rows, setRows] = useState<FreightRuleDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [bulkValue, setBulkValue] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    load()
      .then((rules) => {
        if (cancelled) return;
        setRows(rules.map((r) => ({ state: r.state, value: r.value })));
        setDirty(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o frete.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const usedStates = useMemo(() => new Set(rows.map((r) => r.state)), [rows]);
  const remainingStates = useMemo(
    () => BR_STATES.filter((uf) => !usedStates.has(uf)),
    [usedStates]
  );
  const hasInvalidRow = rows.some((r) => !r.state || r.value == null || r.value < 0);

  function markDirty(): void {
    setDirty(true);
    setSaved(false);
  }

  function updateRow(index: number, patch: Partial<FreightRuleDraft>): void {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    markDirty();
  }

  function addRow(): void {
    setRows((prev) => [...prev, { state: remainingStates[0] ?? "", value: bulkValue }]);
    markDirty();
  }

  function addAllStates(): void {
    if (remainingStates.length === 0) return;
    setRows((prev) => [...prev, ...remainingStates.map((uf) => ({ state: uf, value: bulkValue }))]);
    markDirty();
  }

  function applyBulkValue(): void {
    if (bulkValue == null) return;
    setRows((prev) => prev.map((r) => ({ ...r, value: bulkValue })));
    markDirty();
  }

  function removeRow(index: number): void {
    setRows((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  function clearAll(): void {
    setRows([]);
    markDirty();
  }

  async function handleSave(): Promise<void> {
    setSaveError(null);
    const payload: Array<{ state: string; value: number }> = [];
    for (const row of rows) {
      if (!row.state || row.value == null || row.value < 0) {
        setSaveError("Preencha UF e valor em todas as linhas antes de salvar.");
        return;
      }
      payload.push({ state: row.state, value: Math.round(row.value * 100) / 100 });
    }
    setSaving(true);
    try {
      const savedRules = await save(payload);
      setRows(savedRules.map((r) => ({ state: r.state, value: r.value })));
      setDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Não foi possível salvar o frete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
            <Truck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            {title}
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>
        </div>
        {dirty ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Alterações não salvas
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando frete…
        </p>
      ) : loadError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2.5">
            <div className="w-36">
              <CurrencyInput
                value={bulkValue}
                onValueChange={setBulkValue}
                placeholder="0,00"
                aria-label="Valor para ações em massa"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={rows.length === 0 || bulkValue == null}
              title="Substitui o valor de todas as linhas pelo valor ao lado"
              onClick={applyBulkValue}
            >
              <Wand2 className="mr-1.5 h-4 w-4" />
              Aplicar a todas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={remainingStates.length === 0}
              title="Adiciona as UFs que faltam, já com o valor ao lado (se preenchido)"
              onClick={addAllStates}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar todas as UFs ({remainingStates.length})
            </Button>
            {rows.length > 0 ? (
              <button
                type="button"
                className="text-xs text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
                onClick={clearAll}
              >
                limpar tudo
              </button>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              Nenhuma regra de frete cadastrada — propostas usam R$ 0,00 de frete.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
              {rows.map((row, idx) => (
                <div
                  key={`${row.state}-${idx}`}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
                >
                  <select
                    value={row.state}
                    aria-label="UF"
                    onChange={(e) => updateRow(idx, { state: e.target.value })}
                    className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 text-sm font-medium text-[var(--color-foreground)]"
                  >
                    <option value="">UF</option>
                    {BR_STATES.map((uf) => (
                      <option key={uf} value={uf} disabled={uf !== row.state && usedStates.has(uf)}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  <CurrencyInput
                    value={row.value}
                    onValueChange={(v) => updateRow(idx, { value: v })}
                    placeholder="0,00"
                    aria-label={`Valor do frete para ${row.state || "UF"}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Remover frete de ${row.state || "UF"}`}
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {saveError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={remainingStates.length === 0}
              onClick={addRow}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar UF
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !dirty || hasInvalidRow}
              onClick={() => void handleSave()}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Salvar frete
                </>
              )}
            </Button>
            {saved ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Frete salvo.
              </span>
            ) : null}
            {rows.length > 0 && !hasInvalidRow ? (
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {rows.length} UF{rows.length > 1 ? "s" : ""} ·{" "}
                {formatBRL(rows.reduce((min, r) => Math.min(min, r.value ?? 0), Infinity))} a{" "}
                {formatBRL(rows.reduce((max, r) => Math.max(max, r.value ?? 0), 0))}
              </span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
