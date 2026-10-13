"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, ChevronRight, Check } from "lucide-react";
import {
  getSectionPresets,
  getSectionPresetCategories,
  type SectionPresetItem,
} from "./template-section-presets";

export interface SectionPresetsMenuProps {
  sectionType: "testimonials" | "faq";
  onSelectPreset: (presetData: Record<string, string>) => void;
  disabled?: boolean;
}

export function SectionPresetsMenu({
  sectionType,
  onSelectPreset,
  disabled = false,
}: SectionPresetsMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const presets = getSectionPresets(sectionType);
  const categories = ["Todos", ...getSectionPresetCategories(sectionType)];

  const filteredPresets =
    selectedCategory === "Todos" ? presets : presets.filter((p) => p.category === selectedCategory);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (preset: SectionPresetItem) => {
    onSelectPreset(preset.data);
    setJustAddedId(preset.id);
    setTimeout(() => {
      setJustAddedId(null);
      setIsOpen(false);
    }, 350);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 shadow-xs transition hover:border-emerald-500/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        title="Inserir modelo pronto com 1 clique"
      >
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        <span>Modelos prontos</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-80 sm:w-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-[var(--color-foreground)]">
                {sectionType === "testimonials"
                  ? "Depoimentos Fotovoltaicos"
                  : "Perguntas Frequentes (FAQ)"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Categorias / Filtros */}
          <div className="mt-2 flex flex-wrap gap-1 border-b border-[var(--color-border)]/40 pb-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                  selectedCategory === category
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Lista de Modelos */}
          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
            {filteredPresets.map((preset) => {
              const isAdded = justAddedId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset)}
                  className={`group flex w-full flex-col items-start rounded-lg border p-2 text-left transition ${
                    isAdded
                      ? "border-emerald-500/60 bg-emerald-500/20"
                      : "border-[var(--color-border)]/50 bg-[var(--color-card)] hover:border-emerald-500/40 hover:bg-[var(--color-accent)]/50"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-semibold text-[var(--color-foreground)] group-hover:text-emerald-300">
                      {preset.title}
                    </span>
                    <span className="shrink-0 rounded bg-[var(--color-muted)] px-1 py-0.2 text-[9px] font-medium text-[var(--color-muted-foreground)]">
                      {preset.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] text-[var(--color-muted-foreground)] leading-relaxed">
                    {preset.preview}
                  </p>
                  <div className="mt-1.5 flex w-full items-center justify-end text-[9px] font-medium text-emerald-400 opacity-80 group-hover:opacity-100">
                    {isAdded ? (
                      <span className="flex items-center gap-0.5 text-emerald-300 font-bold">
                        <Check className="h-3 w-3" /> Adicionado!
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        Inserir <ChevronRight className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[10px] text-[var(--color-muted-foreground)]/80 text-center">
            Clique para inserir na proposta. Você poderá editar todo o texto livremente.
          </p>
        </div>
      )}
    </div>
  );
}
