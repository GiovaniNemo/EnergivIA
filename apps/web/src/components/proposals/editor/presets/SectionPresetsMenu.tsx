"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

  const presets = getSectionPresets(sectionType);
  const categories = ["Todos", ...getSectionPresetCategories(sectionType)];

  const filteredPresets =
    selectedCategory === "Todos" ? presets : presets.filter((p) => p.category === selectedCategory);

  const handleSelect = (preset: SectionPresetItem) => {
    onSelectPreset(preset.data);
    setJustAddedId(preset.id);
    setTimeout(() => {
      setJustAddedId(null);
      setIsOpen(false);
    }, 400);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 shadow-xs transition hover:border-emerald-500/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        title="Inserir modelo pronto com 1 clique"
      >
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        <span>Modelos prontos</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          muiMaxWidth="md"
          className="max-w-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl sm:p-6"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--color-foreground)]">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>
                {sectionType === "testimonials"
                  ? "Modelos de Depoimentos Fotovoltaicos"
                  : "Modelos de Perguntas Frequentes (FAQ)"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--color-muted-foreground)]">
              {sectionType === "testimonials"
                ? "Escolha um depoimento pronto de cliente real para enriquecer a confiança da sua proposta. Clique para inserir instantaneamente."
                : "Escolha uma dúvida frequente com resposta pronta para esclarecer o cliente final. Clique para inserir instantaneamente."}
            </DialogDescription>
          </DialogHeader>

          {/* Categorias / Filtros */}
          <div className="mt-4 flex flex-wrap gap-1.5 border-b border-[var(--color-border)]/60 pb-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  selectedCategory === category
                    ? "border border-emerald-500/40 bg-emerald-500/20 font-semibold text-emerald-300"
                    : "border border-[var(--color-border)]/50 bg-[var(--color-muted)]/40 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Lista de Modelos */}
          <div className="mt-3 max-h-[55vh] space-y-2.5 overflow-y-auto pr-1 no-scrollbar">
            {filteredPresets.map((preset) => {
              const isAdded = justAddedId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`group flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition sm:flex-row sm:items-center ${
                    isAdded
                      ? "border-emerald-500/60 bg-emerald-500/15"
                      : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-emerald-500/40 hover:bg-[var(--color-accent)]/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-emerald-300">
                        {preset.title}
                      </span>
                      <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        {preset.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                      {preset.preview}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-end pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleSelect(preset)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        isAdded
                          ? "bg-emerald-500/30 font-semibold text-emerald-200"
                          : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Adicionado!</span>
                        </>
                      ) : (
                        <>
                          <span>Inserir modelo</span>
                          <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[var(--color-border)]/60 pt-3 text-center text-xs text-[var(--color-muted-foreground)]">
            💡 O item será adicionado à proposta e você poderá personalizar qualquer nome, texto ou
            foto depois.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
