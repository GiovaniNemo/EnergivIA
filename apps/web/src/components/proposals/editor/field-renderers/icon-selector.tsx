"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, LayoutTemplate } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Input } from "@/components/ui/input";

interface LucideIconOption {
  name: string;
  Icon: LucideIcon;
}

const ALL_LUCIDE_ICON_OPTIONS: LucideIconOption[] = (() => {
  const toPascal = (name: string) =>
    name
      .split("-")
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join("");

  const allNames = Object.keys(dynamicIconImports);
  const resolved = allNames
    .map((name) => {
      const exportName = toPascal(name);
      const Icon = (LucideIcons as Record<string, unknown>)[exportName];
      const isRenderableComponent =
        typeof Icon === "function" || (typeof Icon === "object" && Icon !== null);
      if (!isRenderableComponent) return null;
      return { name, Icon: Icon as LucideIcon };
    })
    .filter((item): item is LucideIconOption => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (resolved.length) return resolved;
  return [{ name: "alert-circle", Icon: AlertCircle }];
})();

const LUCIDE_ICON_BY_KEBAB_NAME = new Map<string, LucideIcon>(
  ALL_LUCIDE_ICON_OPTIONS.map((o) => [o.name, o.Icon])
);

export function getLucideIconByKebabName(name: string | undefined): LucideIcon {
  const key = String(name ?? "")
    .trim()
    .toLowerCase();
  return LUCIDE_ICON_BY_KEBAB_NAME.get(key) ?? LayoutTemplate;
}

export function IconSelector({
  value,
  onChange,
  fieldPath,
  className,
  triggerClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  fieldPath?: string;
  className?: string;
  triggerClassName?: string;
}): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedValue = value.trim().toLowerCase() || "alert-circle";
  const selected = ALL_LUCIDE_ICON_OPTIONS.find((option) => option.name === normalizedValue);
  const SelectedIcon = selected?.Icon ?? AlertCircle;
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return ALL_LUCIDE_ICON_OPTIONS;
    return ALL_LUCIDE_ICON_OPTIONS.filter((option) => option.name.includes(normalizedQuery));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!rootRef.current || !target) return;
      if (!rootRef.current.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`.trim()}>
      <button
        type="button"
        data-editor-field-path={fieldPath}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex min-h-10 w-full items-center justify-between rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${triggerClassName ?? ""}`.trim()}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <SelectedIcon className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">{selected?.name ?? normalizedValue}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-70 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl">
          <div className="border-b border-[var(--color-border)] p-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ícone (em inglês)..."
              className="text-xs [&_.MuiOutlinedInput-root]:min-h-8"
            />
          </div>
          <div className="max-h-56 overflow-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {filtered.map((option) => {
                const active = option.name === normalizedValue;
                return (
                  <button
                    key={option.name}
                    type="button"
                    title={option.name}
                    onClick={() => {
                      onChange(option.name);
                      setOpen(false);
                    }}
                    className={`flex h-9 items-center justify-center rounded border transition ${
                      active
                        ? "border-emerald-400/70 bg-emerald-500/18 text-emerald-200"
                        : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-emerald-400/50 hover:bg-emerald-500/10"
                    }`}
                  >
                    <option.Icon className="h-4.5 w-4.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
