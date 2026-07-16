"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/components/providers/organization-provider";
import { useShortcutMod } from "@/hooks/use-media-query";
import { listLeads, type LeadListItem } from "@/lib/leads-api";

const STAGE_LABEL: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contato",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
};

const STAGE_PILL_CLASS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CONTACTED: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  PROPOSAL: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  NEGOTIATION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  WON: "bg-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200",
  LOST: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function formatWhatsapp(raw: string | null | undefined): string | null {
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

export type GlobalSearchHandle = {
  focus: () => void;
};

export const GlobalSearch = forwardRef<GlobalSearchHandle>(function GlobalSearch(_props, ref) {
  const router = useRouter();
  const { currentOrganizationId } = useOrganization();
  const shortcutMod = useShortcutMod();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
      setOpen(true);
    },
  }));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query.trim()), 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (!currentOrganizationId) return;
    if (!debounced) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listLeads(currentOrganizationId, { page: 1, pageSize: 8, search: debounced })
      .then((res) => {
        if (cancelled) return;
        setResults(res.data);
        setActiveIdx(0);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId, debounced]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!wrapRef.current || !target) return;
      if (!wrapRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const navigateTo = useCallback(
    (lead: LeadListItem) => {
      const stage = lead.latestDealStage;
      const hasActiveDeal =
        Boolean(lead.latestDealId) && stage !== "WON" && stage !== "LOST" && stage !== null;
      if (hasActiveDeal) {
        router.push(`/pipeline?id=${lead.id}`);
      } else {
        router.push(`/clientes/${lead.id}`);
      }
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [router]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((idx) => Math.min(idx + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((idx) => Math.max(idx - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const lead = results[activeIdx];
      if (lead) navigateTo(lead);
    }
  };

  const helperText = useMemo(() => {
    if (!debounced) return "Comece a digitar para buscar clientes...";
    if (loading) return "Buscando...";
    if (results.length === 0) return "Nenhum cliente encontrado.";
    return null;
  }, [debounced, loading, results.length]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar clientes, negociações, propostas..."
        className="h-9 rounded-lg border-[var(--color-border)] bg-[var(--color-muted)] pl-9 pr-16 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : shortcutMod ? (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)] shadow-sm">
          {shortcutMod}K
        </kbd>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl">
          {helperText ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {helperText}
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto py-1">
              {results.map((lead, idx) => {
                const stage = lead.latestDealStage ?? "NEW";
                const stageLabel = STAGE_LABEL[stage] ?? stage;
                const stageClass = STAGE_PILL_CLASS[stage] ?? STAGE_PILL_CLASS["NEW"];
                const phone = formatWhatsapp(lead.whatsapp);
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => navigateTo(lead)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === activeIdx
                          ? "bg-[var(--color-muted)]"
                          : "hover:bg-[var(--color-muted)]/50"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 text-[11px] font-bold text-emerald-900">
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                            {lead.name}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageClass}`}
                          >
                            {stageLabel}
                          </span>
                        </div>
                        <div className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                          {phone ?? lead.email ?? "Sem contato"}
                          {lead.company ? ` · ${lead.company}` : ""}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
});
