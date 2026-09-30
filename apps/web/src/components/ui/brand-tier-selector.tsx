"use client";

import React, { useState } from "react";
import {
  Star,
  GripVertical,
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap,
  Crown,
} from "lucide-react";
import type { BrandTierSelection } from "@/lib/organizations-api";

interface BrandTierSelectorProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  categoryLabel: "módulos" | "inversores";
  availableBrands: string[];
  value: BrandTierSelection;
  onChange: (val: BrandTierSelection) => void;
  loading?: boolean;
}

type TierKey = "standard" | "elite" | "premium";

interface TierConfig {
  key: TierKey;
  label: string;
  tag: string;
  tagColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  borderHover: string;
}

const TIERS: TierConfig[] = [
  {
    key: "standard",
    label: "Standard",
    tag: "Econômico",
    tagColor:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/60",
    icon: Zap,
    description: "Custo competitivo para orçamentos de entrada",
    borderHover: "hover:border-amber-500/50",
  },
  {
    key: "elite",
    label: "Elite",
    tag: "Custo-Benefício",
    tagColor: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800/60",
    icon: Shield,
    description: "Equilíbrio de eficiência, durabilidade e margem",
    borderHover: "hover:border-sky-500/50",
  },
  {
    key: "premium",
    label: "Premium",
    tag: "Alta Performance",
    tagColor:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800/60",
    icon: Crown,
    description: "Topo de linha e marcas de altíssima eficiência",
    borderHover: "hover:border-purple-500/50",
  },
];

export function BrandTierSelector({
  title,
  subtitle,
  icon,
  categoryLabel,
  availableBrands,
  value,
  onChange,
  loading = false,
}: BrandTierSelectorProps) {
  const [draggedBrand, setDraggedBrand] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<TierKey | null>(null);
  const [quickAddBrand, setQuickAddBrand] = useState<string | null>(null);

  const standard = value.standard || [];
  const elite = value.elite || [];
  const premium = value.premium || [];
  const priority = value.priority || null;

  const assignedBrands = new Set([...standard, ...elite, ...premium]);
  const unassignedBrands = availableBrands.filter((b) => !assignedBrands.has(b));
  const totalAssigned = assignedBrands.size;

  const isComplete =
    standard.length > 0 && elite.length > 0 && premium.length > 0 && totalAssigned >= 3;

  const handleAssign = (brand: string, targetTier: TierKey) => {
    // Remove brand from wherever it was
    const nextStandard = standard.filter((b) => b !== brand);
    const nextElite = elite.filter((b) => b !== brand);
    const nextPremium = premium.filter((b) => b !== brand);

    if (targetTier === "standard") nextStandard.push(brand);
    else if (targetTier === "elite") nextElite.push(brand);
    else if (targetTier === "premium") nextPremium.push(brand);

    // If no priority set yet, make this newly assigned brand the priority
    let nextPriority = priority;
    if (!nextPriority || !assignedBrands.has(nextPriority)) {
      nextPriority = brand;
    }

    onChange({
      standard: nextStandard,
      elite: nextElite,
      premium: nextPremium,
      priority: nextPriority,
    });
    setQuickAddBrand(null);
  };

  const handleRemove = (brand: string) => {
    const nextStandard = standard.filter((b) => b !== brand);
    const nextElite = elite.filter((b) => b !== brand);
    const nextPremium = premium.filter((b) => b !== brand);

    let nextPriority = priority;
    if (nextPriority === brand) {
      // Pick another assigned brand as priority
      const remaining = [...nextStandard, ...nextElite, ...nextPremium];
      nextPriority = remaining.length > 0 ? remaining[0] : null;
    }

    onChange({
      standard: nextStandard,
      elite: nextElite,
      premium: nextPremium,
      priority: nextPriority,
    });
  };

  const handleSetPriority = (brand: string) => {
    onChange({
      ...value,
      priority: brand,
    });
  };

  const handleAutoSuggest = () => {
    if (availableBrands.length === 0) return;

    // Distribute available brands smartly into Standard, Elite and Premium
    const brands = [...availableBrands];
    const newStd: string[] = [];
    const newElite: string[] = [];
    const newPrem: string[] = [];

    if (brands.length >= 3) {
      newStd.push(brands[0]);
      newElite.push(brands[1]);
      newPrem.push(brands[2]);
      // If there are more, distribute
      for (let i = 3; i < brands.length; i++) {
        if (i % 3 === 0) newStd.push(brands[i]);
        else if (i % 3 === 1) newElite.push(brands[i]);
        else newPrem.push(brands[i]);
      }
    } else {
      // If fewer than 3 brands exist in catalog, place what exists
      if (brands[0]) newStd.push(brands[0]);
      if (brands[1]) newElite.push(brands[1]);
      if (brands[2]) newPrem.push(brands[2]);
    }

    const defaultPriority = newPrem[0] || newElite[0] || newStd[0] || null;

    onChange({
      standard: newStd,
      elite: newElite,
      premium: newPrem,
      priority: defaultPriority,
    });
  };

  const handleClearAll = () => {
    onChange({
      standard: [],
      elite: [],
      premium: [],
      priority: null,
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, brand: string) => {
    e.dataTransfer.setData("text/plain", brand);
    e.dataTransfer.effectAllowed = "move";
    setDraggedBrand(brand);
  };

  const handleDragEnd = () => {
    setDraggedBrand(null);
    setActiveDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent, tier: TierKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropZone !== tier) {
      setActiveDropZone(tier);
    }
  };

  const handleDrop = (e: React.DragEvent, tier: TierKey) => {
    e.preventDefault();
    const brand = e.dataTransfer.getData("text/plain") || draggedBrand;
    if (brand) {
      handleAssign(brand, tier);
    }
    setDraggedBrand(null);
    setActiveDropZone(null);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-[var(--color-border)]/60">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1f7f9b]/15 text-[#1f7f9b] dark:text-[#38bdf8]">
            {icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              {isComplete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  Pronto
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-3 w-3" />
                  {totalAssigned}/3 configuradas
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleAutoSuggest}
            disabled={availableBrands.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1f7f9b]/30 bg-[#1f7f9b]/10 hover:bg-[#1f7f9b]/20 px-2.5 py-1 text-xs font-semibold text-[#0A4A63] dark:text-[#38bdf8] transition cursor-pointer disabled:opacity-50"
            title="Preencher automaticamente as categorias com as marcas disponíveis"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sugestão Rápida</span>
          </button>
          {totalAssigned > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Marcas Disponíveis para Arrastar ou Selecionar */}
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3 border border-dashed border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-zinc-400" />
            Marcas ativas com itens cadastrados:
            <span className="text-zinc-500 dark:text-zinc-400 font-normal text-[11px]">
              (Arraste ou clique para categorizar)
            </span>
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {unassignedBrands.length} disponível(is)
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500 py-2">Carregando marcas homologadas...</p>
        ) : availableBrands.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic py-1">
            Nenhuma marca com produtos ativos cadastrados para {categoryLabel}.
          </p>
        ) : unassignedBrands.length === 0 ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
            Todas as marcas ativas foram distribuídas nas categorias abaixo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {unassignedBrands.map((brand) => {
              const isMenuOpen = quickAddBrand === brand;
              return (
                <div key={brand} className="relative inline-flex items-center">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, brand)}
                    onDragEnd={handleDragEnd}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-xs hover:border-[#1f7f9b] hover:shadow-sm cursor-grab active:cursor-grabbing transition"
                    title="Arraste para uma das categorias ou clique nas opções rápidas"
                  >
                    <GripVertical className="h-3 w-3 text-zinc-400 group-hover:text-[#1f7f9b]" />
                    <span>{brand}</span>
                    <button
                      type="button"
                      onClick={() => setQuickAddBrand(isMenuOpen ? null : brand)}
                      className="ml-1 rounded px-1 text-[10px] font-bold text-[#1f7f9b] hover:bg-[#1f7f9b]/15 transition cursor-pointer"
                      title="Adicionar rapidamente"
                    >
                      +
                    </button>
                  </div>

                  {/* Mini menu de clique rápido para toque / velocidade */}
                  {isMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 z-20 w-36 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-lg space-y-0.5">
                      <div className="text-[10px] font-semibold text-zinc-400 px-2 py-0.5">
                        Mover para:
                      </div>
                      {TIERS.map((tier) => (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => handleAssign(brand, tier.key)}
                          className="w-full text-left px-2 py-1 text-xs rounded hover:bg-[#1f7f9b]/15 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer transition flex items-center justify-between"
                        >
                          <span>{tier.label}</span>
                          <span className="text-[10px] text-zinc-400">{tier.tag}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 Zonas de Destino (Drop Zones): Standard, Elite, Premium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const TierIcon = tier.icon;
          const tierBrands =
            tier.key === "standard" ? standard : tier.key === "elite" ? elite : premium;
          const isDropActive = activeDropZone === tier.key;

          return (
            <div
              key={tier.key}
              onDragOver={(e) => handleDragOver(e, tier.key)}
              onDragLeave={() => setActiveDropZone(null)}
              onDrop={(e) => handleDrop(e, tier.key)}
              className={`rounded-xl border transition-all p-3 sm:p-3.5 flex flex-col justify-between min-h-[170px] ${
                isDropActive
                  ? "border-[#1f7f9b] bg-[#1f7f9b]/10 ring-2 ring-[#1f7f9b]/30 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 " +
                    tier.borderHover
              }`}
            >
              <div>
                {/* Cabeçalho do Tier */}
                <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <TierIcon className="h-4 w-4 text-[#1f7f9b] dark:text-[#38bdf8]" />
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {tier.label}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${tier.tagColor}`}
                  >
                    {tier.tag}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5">
                  {tier.description}
                </p>

                {/* Lista de Marcas neste Tier */}
                {tierBrands.length === 0 ? (
                  <div
                    className={`rounded-lg border border-dashed py-5 px-2 text-center transition ${
                      isDropActive
                        ? "border-[#1f7f9b] bg-[#1f7f9b]/15 text-[#1f7f9b]"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    <span className="text-[11px] font-medium">
                      {isDropActive ? "Solte a marca aqui!" : "Arraste marcas para cá"}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tierBrands.map((brand) => {
                      const isPriority = priority === brand;
                      return (
                        <div
                          key={brand}
                          className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                            isPriority
                              ? "border-amber-400/80 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/50 shadow-xs font-semibold"
                              : "border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleSetPriority(brand)}
                              className={`transition cursor-pointer p-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/50 ${
                                isPriority
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-zinc-400 hover:text-amber-500"
                              }`}
                              title={
                                isPriority
                                  ? "Marca prioritária nas cotações"
                                  : "Clique para definir como prioridade principal"
                              }
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  isPriority ? "fill-amber-500 text-amber-500" : ""
                                }`}
                              />
                            </button>
                            <span className="truncate">{brand}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isPriority && (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 rounded px-1.5 py-0.2">
                                Principal
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemove(brand)}
                              className="text-zinc-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition"
                              title="Remover marca"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dica de rodapé do Tier */}
              <div className="pt-2 text-[10px] text-zinc-400 dark:text-zinc-500 text-right">
                {tierBrands.length} marca(s)
              </div>
            </div>
          );
        })}
      </div>

      {/* Explicação da Prioridade e Fallback */}
      <div className="flex items-start gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-2.5 text-xs text-zinc-600 dark:text-zinc-300 border border-[var(--color-border)]">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {priority ? (
            <>
              Marca prioritária:{" "}
              <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{priority}</strong>. O
              sistema tentará cotar e dimensionar inicialmente com ela. Caso não haja
              compatibilidade técnica ou estoque homologado, o motor avançará automaticamente para
              as próximas marcas definidas nos tiers.
            </>
          ) : (
            <>
              Clique no ícone de estrela <Star className="inline h-3 w-3 text-amber-500" /> em uma
              das marcas para fixá-la como a primeira opção nas cotações e propostas automáticas.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
