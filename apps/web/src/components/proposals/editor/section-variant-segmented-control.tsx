"use client";

import type { JSX } from "react";
import { getLucideIconByKebabName } from "./field-renderers/icon-selector";
import type { SectionVariantOption } from "./section-fields";

export function SectionVariantSegmentedControl(props: {
  options: SectionVariantOption[];
  value: string;
  onSelect: (nextValue: string, option: SectionVariantOption) => void;
  "aria-label"?: string;
}): JSX.Element {
  const { options, value, onSelect, "aria-label": ariaLabel } = props;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? "Tipo de exibição"}
      className="flex flex-wrap gap-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-muted)] p-1 sm:flex-nowrap"
    >
      {options.map((option) => {
        const active = value === option.value;
        const Icon = getLucideIconByKebabName(option.icon);
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-card)] ${
              active
                ? "bg-[var(--color-accent)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
            onClick={() => onSelect(option.value, option)}
          >
            <Icon
              className={`h-3.5 w-3.5 shrink-0 ${active ? "opacity-95" : "opacity-70"}`}
              aria-hidden
            />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
