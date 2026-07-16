"use client";

import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CostRuleRow } from "@/lib/cost-rules-api";
import { percentageBaseShortLabel } from "./cost-rule-presets";
import { formatRuleValue, previewKwpCondition } from "./cost-rule-preview";

function sortRulesInGroup(a: CostRuleRow, b: CostRuleRow): number {
  const aG = a.minKwp === null && a.maxKwp === null;
  const bG = b.minKwp === null && b.maxKwp === null;
  if (aG && !bG) return 1;
  if (!aG && bG) return -1;
  if (aG && bG) return 0;
  return (a.minKwp ?? 0) - (b.minKwp ?? 0);
}

export function CostRulesGroupedList({
  rules,
  canEdit,
  onEdit,
  onDelete,
}: {
  rules: CostRuleRow[];
  canEdit: boolean;
  onEdit: (rule: CostRuleRow) => void;
  onDelete: (rule: CostRuleRow) => void;
}): JSX.Element {
  const groups = useMemo(() => {
    const map = new Map<string, CostRuleRow[]>();
    for (const r of rules) {
      const list = map.get(r.name) ?? [];
      list.push(r);
      map.set(r.name, list);
    }
    for (const list of map.values()) list.sort(sortRulesInGroup);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [rules]);

  if (!rules.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/10 px-6 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
        Nenhuma regra configurada ainda. Use &quot;Adicionar regra de custo&quot; para começar.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(([name, list]) => (
        <section key={name}>
          <h3 className="mb-3 border-b border-[var(--color-border)] pb-2 text-lg font-semibold text-[var(--color-foreground)]">
            {name}
          </h3>
          <ul className="space-y-3">
            {list.map((rule) => {
              const { short, detail } = previewKwpCondition(rule.minKwp, rule.maxKwp);
              const valueStr = formatRuleValue(rule.calculationType, rule.value);
              return (
                <li
                  key={rule.id}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      <span className="text-[var(--color-muted-foreground)]">{short}</span>
                      <span className="mx-2 text-[var(--color-border)]">→</span>
                      <span>{valueStr}</span>
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{detail}</p>
                    {rule.calculationType === "PERCENTAGE" ? (
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Percentual sobre:{" "}
                        <span className="font-medium text-[var(--color-foreground)]">
                          {percentageBaseShortLabel(rule.percentageBase)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label={`Editar regra ${name}`}
                        onClick={() => onEdit(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                        aria-label={`Remover regra ${name}`}
                        onClick={() => onDelete(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
