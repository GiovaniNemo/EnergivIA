"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  Check,
  Search,
  X,
  Info,
  Quote,
  HelpCircle,
  Home,
  Store,
  Tractor,
  Factory,
  Plus,
} from "lucide-react";
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

function getCategoryIcon(category: string): JSX.Element | null {
  switch (category) {
    case "Residencial":
      return <Home className="h-3 w-3 shrink-0" />;
    case "Comércio":
      return <Store className="h-3 w-3 shrink-0" />;
    case "Rural":
      return <Tractor className="h-3 w-3 shrink-0" />;
    case "Industrial":
      return <Factory className="h-3 w-3 shrink-0" />;
    default:
      return null;
  }
}

function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case "Residencial":
      return "border-sky-500/30 bg-sky-500/10 text-sky-400";
    case "Comércio":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "Rural":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "Industrial":
      return "border-purple-500/30 bg-purple-500/10 text-purple-400";
    case "Funcionamento & Rede":
      return "border-teal-500/30 bg-teal-500/10 text-teal-400";
    case "Garantias & Manutenção":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";
    case "Economia & Imóvel":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

export function SectionPresetsMenu({
  sectionType,
  onSelectPreset,
  disabled = false,
}: SectionPresetsMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const presets = getSectionPresets(sectionType);
  const rawCategories = getSectionPresetCategories(sectionType);
  const categories = ["Todos", ...rawCategories];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: presets.length };
    for (const p of presets) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [presets]);

  const filteredPresets = useMemo(() => {
    let list = presets;
    if (selectedCategory !== "Todos") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const previewMatch = p.preview.toLowerCase().includes(q);
        const categoryMatch = p.category.toLowerCase().includes(q);
        const nameMatch = (p.data.name || "").toLowerCase().includes(q);
        const textMatch = (p.data.text || p.data.answer || "").toLowerCase().includes(q);
        return titleMatch || previewMatch || categoryMatch || nameMatch || textMatch;
      });
    }
    return list;
  }, [presets, selectedCategory, searchQuery]);

  const handleSelect = (preset: SectionPresetItem) => {
    onSelectPreset(preset.data);
    setJustAddedId(preset.id);
    setTimeout(() => {
      setJustAddedId(null);
      setIsOpen(false);
    }, 450);
  };

  const isTestimonials = sectionType === "testimonials";

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
          className="max-w-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] p-5 shadow-2xl sm:p-6"
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                {isTestimonials ? (
                  <Quote className="h-5 w-5" />
                ) : (
                  <HelpCircle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                  {isTestimonials
                    ? "Modelos de Depoimentos Fotovoltaicos"
                    : "Modelos de Perguntas Frequentes (FAQ)"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  {isTestimonials
                    ? "Casos reais estruturados por segmento (residencial, comercial, rural e industrial). Escolha e insira com 1 clique na sua proposta."
                    : "Dúvidas técnicas frequentes com respostas claras para esclarecer o cliente e acelerar o fechamento."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Barra de Busca Rápida */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isTestimonials
                  ? "Buscar por cliente, segmento ou palavra..."
                  : "Buscar dúvida técnica ou palavra-chave..."
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101726] py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Categorias / Filtros por Segmento */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            {categories.map((category) => {
              const isSelected = selectedCategory === category;
              const count = categoryCounts[category] ?? 0;
              const icon = getCategoryIcon(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    isSelected
                      ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs"
                      : "border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#101726] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {icon}
                  <span>{category}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? "bg-emerald-500/30 text-emerald-200"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lista de Modelos (Cards Opacos e Estruturados) */}
          <div className="mt-3 max-h-[50vh] space-y-2.5 overflow-y-auto pr-1">
            {filteredPresets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-7 w-7 text-slate-400 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nenhum modelo encontrado
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Tente buscar por outro termo ou selecione outra categoria.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("Todos");
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              filteredPresets.map((preset) => {
                const isAdded = justAddedId === preset.id;
                const badgeColor = getCategoryBadgeColor(preset.category);

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelect(preset)}
                    className={`group relative flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all duration-150 cursor-pointer ${
                      isAdded
                        ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 ring-1 ring-emerald-500/40"
                        : "border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#111827] shadow-xs hover:border-emerald-500/50 hover:bg-slate-50/80 dark:hover:bg-[#152033]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Linha de Cabeçalho do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {preset.title}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}
                        >
                          {getCategoryIcon(preset.category)}
                          {preset.category}
                        </span>
                      </div>

                      {/* Conteúdo Contextual */}
                      {isTestimonials && preset.data.name && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {preset.data.name}
                          </span>
                          <span>•</span>
                          <span>{preset.data.subtitle}</span>
                        </div>
                      )}

                      {/* Bloco de Citação ou Resposta */}
                      <div className="mt-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0b101b] p-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {isTestimonials ? (
                          <p className="italic">“{preset.data.text || preset.preview}”</p>
                        ) : (
                          <div>
                            <span className="mr-1.5 font-semibold text-emerald-400">Resposta:</span>
                            <span>{preset.data.answer || preset.preview}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barra de Ação */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/50">
                      <span className="text-[11px] text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
                        Clique para inserir este modelo
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(preset);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isAdded
                            ? "bg-emerald-500 text-slate-950 font-semibold shadow-xs"
                            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-500/20"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Adicionado!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Inserir modelo</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dica / Rodapé do Modal (Sem Emojis, Ícone Limpo) */}
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0b101b] px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              O modelo será inserido no bloco da proposta e você poderá personalizar qualquer nome,
              texto ou foto depois no editor.
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
