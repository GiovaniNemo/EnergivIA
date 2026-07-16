"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { patchDeal } from "@/lib/leads-api";

export const NEXT_STEP_TYPES = ["Ligar", "WhatsApp", "Visita", "Proposta"] as const;

export function defaultNextActionDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SetNextStepDialog({
  open,
  onOpenChange,
  organizationId,
  leadId,
  dealId,
  leadName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  leadId: string;
  dealId: string | null | undefined;
  leadName: string;
  onSaved: () => void | Promise<void>;
}): JSX.Element {
  const [nextStepType, setNextStepType] = useState<(typeof NEXT_STEP_TYPES)[number]>("Ligar");
  const [nextStepAt, setNextStepAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNextStepType("Ligar");
    setNextStepAt(defaultNextActionDatetimeLocal());
    setError(null);
  }, [open, leadId, dealId]);

  async function submit() {
    if (!organizationId || !dealId || !nextStepAt.trim()) {
      setError("Preencha a data e horário.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const at = new Date(nextStepAt);
      if (Number.isNaN(at.getTime())) {
        setError("Data inválida.");
        return;
      }
      await patchDeal(organizationId, dealId, {
        nextActionAt: at.toISOString(),
        nextActionType: nextStepType,
      });
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>Próximo passo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Cliente: <span className="font-medium text-[var(--color-foreground)]">{leadName}</span>
          </p>
          {!dealId ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4 text-sm text-[var(--color-muted-foreground)]">
              <p>Para agendar, é preciso ter uma oportunidade. Abra a ficha e crie um negócio.</p>
              <Link
                href={`/clientes/${leadId}`}
                onClick={() => onOpenChange(false)}
                className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                Abrir ficha
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Select
                  id="set-next-type"
                  label="Tipo"
                  value={nextStepType}
                  onChange={(e) =>
                    setNextStepType(e.target.value as (typeof NEXT_STEP_TYPES)[number])
                  }
                >
                  {NEXT_STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Input
                  id="set-next-at"
                  label="Data e hora"
                  type="datetime-local"
                  value={nextStepAt}
                  onChange={(e) => setNextStepAt(e.target.value)}
                  className="h-10"
                />
              </div>
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void submit()} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
