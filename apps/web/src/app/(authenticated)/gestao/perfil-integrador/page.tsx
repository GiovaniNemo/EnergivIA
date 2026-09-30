"use client";

import { useEffect, useState, useMemo } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  updateOrganization,
  getDistributorAvailableBrands,
  type DistributorAvailableBrands,
  type BrandTierSelection,
} from "@/lib/organizations-api";
import { BrandTierSelector } from "@/components/ui/brand-tier-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import {
  SlidersHorizontal,
  Sun,
  Cpu,
  CheckCircle2,
  Save,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export default function PerfilIntegradorPage(): JSX.Element {
  const { currentOrganization, currentOrganizationId, refetch, user } = useOrganization();

  const effectiveRole = (currentOrganization?.role || user?.role || "").toUpperCase();
  const canEdit =
    effectiveRole === "OWNER" || effectiveRole === "ADMIN" || effectiveRole === "PLATFORM";

  const [availableBrands, setAvailableBrands] = useState<DistributorAvailableBrands>({
    modules: [],
    inverters: [],
  });
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [defaultKwpRate, setDefaultKwpRate] = useState<number>(2800);
  const [moduleTiers, setModuleTiers] = useState<BrandTierSelection>({
    standard: [],
    elite: [],
    premium: [],
    priority: null,
  });
  const [inverterTiers, setInverterTiers] = useState<BrandTierSelection>({
    standard: [],
    elite: [],
    premium: [],
    priority: null,
  });

  const [snack, setSnack] = useState<{
    severity: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Carrega marcas do distribuidor
  useEffect(() => {
    let cancelled = false;
    setLoadingBrands(true);
    getDistributorAvailableBrands()
      .then((data) => {
        if (!cancelled && data) {
          setAvailableBrands(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingBrands(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Preenche valores com a organização atual
  useEffect(() => {
    if (currentOrganization) {
      if (
        currentOrganization.defaultKwpRate !== undefined &&
        currentOrganization.defaultKwpRate !== null
      ) {
        setDefaultKwpRate(Number(currentOrganization.defaultKwpRate) || 2800);
      }
      if (currentOrganization.moduleBrandTiers) {
        setModuleTiers(currentOrganization.moduleBrandTiers);
      } else if (Array.isArray(currentOrganization.preferredModuleBrands)) {
        const m = currentOrganization.preferredModuleBrands;
        setModuleTiers({
          standard: m[0] ? [m[0]] : [],
          elite: m[1] ? [m[1]] : [],
          premium: m[2] ? [m[2]] : [],
          priority: m[0] || null,
        });
      }
      if (currentOrganization.inverterBrandTiers) {
        setInverterTiers(currentOrganization.inverterBrandTiers);
      } else if (Array.isArray(currentOrganization.preferredInverterBrands)) {
        const inv = currentOrganization.preferredInverterBrands;
        setInverterTiers({
          standard: inv[0] ? [inv[0]] : [],
          elite: inv[1] ? [inv[1]] : [],
          premium: inv[2] ? [inv[2]] : [],
          priority: inv[0] || null,
        });
      }
    }
  }, [currentOrganization]);

  const handleSave = async () => {
    if (!currentOrganizationId) return;
    if (!canEdit) {
      setSnack({
        severity: "error",
        message: "Você não tem permissão para alterar as configurações da empresa.",
      });
      return;
    }

    const rate = Math.max(500, Math.min(25000, Number(defaultKwpRate) || 2800));

    const compileBrands = (tiers: BrandTierSelection) => {
      const list: string[] = [];
      if (tiers.priority) list.push(tiers.priority);
      [...tiers.standard, ...tiers.elite, ...tiers.premium].forEach((b) => {
        if (!list.includes(b)) list.push(b);
      });
      return list;
    };

    setSaving(true);
    try {
      await updateOrganization(
        currentOrganizationId,
        {
          defaultKwpRate: rate,
          moduleBrandTiers: moduleTiers,
          inverterBrandTiers: inverterTiers,
          preferredModuleBrands: compileBrands(moduleTiers),
          preferredInverterBrands: compileBrands(inverterTiers),
        },
        currentOrganizationId
      );

      await refetch();
      setSnack({
        severity: "success",
        message: "Perfil do Integrador e preferências atualizadas com sucesso!",
      });
    } catch (e) {
      setSnack({
        severity: "error",
        message: e instanceof Error ? e.message : "Falha ao salvar preferências.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview de orçamentos com o kWp atual
  const simulationPreviews = useMemo(() => {
    const rate = Number(defaultKwpRate) || 2800;
    return [
      { label: "Residencial Pequeno", kwp: 3.5, total: Math.round(3.5 * rate) },
      { label: "Residencial Médio", kwp: 7.0, total: Math.round(7.0 * rate) },
      { label: "Comercial / Empresa", kwp: 15.0, total: Math.round(15.0 * rate) },
      { label: "Industrial / Rural", kwp: 40.0, total: Math.round(40.0 * rate) },
    ];
  }, [defaultKwpRate]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1f7f9b] uppercase tracking-wider">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Gestão Comercial</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
            Perfil do Integrador
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Defina o valor base de venda por kWp e configure suas preferências de marcas para as
            cotações.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !canEdit}
            className="bg-[linear-gradient(90deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white shadow-[0_8px_18px_rgba(31,127,155,0.22)] hover:opacity-95 cursor-pointer"
          >
            {saving ? (
              "Salvando..."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                Salvar Alterações
              </span>
            )}
          </Button>
        </div>
      </div>

      {!canEdit && (
        <Alert severity="warning" className="rounded-xl border border-amber-200">
          Você está visualizando estas configurações em modo de somente leitura. Apenas
          administradores e proprietários da empresa podem alterar estes parâmetros.
        </Alert>
      )}

      {/* CARD 1: PREÇO BASE DE VENDA POR KWP */}
      <Card className="border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f7f9b]/15 text-[#1f7f9b] dark:text-[#38bdf8]">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Preço Base de Venda por kWp (R$/kWp)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal mt-0.5">
                  Valor sugerido automaticamente ao gerar novas propostas e dimensionamentos
                </CardDescription>
              </div>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              Padrão EnergivIA: R$ 2.800/kWp
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Valor por kWp na sua região
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-500 dark:text-zinc-400">
                  R$
                </span>
                <input
                  type="number"
                  min={500}
                  max={25000}
                  step={50}
                  disabled={!canEdit}
                  value={defaultKwpRate || ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDefaultKwpRate(isNaN(val) ? 2800 : val);
                  }}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-3 pl-11 pr-16 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-[#1f7f9b] focus:outline-none focus:ring-2 focus:ring-[#1f7f9b]/25 disabled:bg-zinc-100 dark:disabled:bg-zinc-800/50"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  / kWp
                </span>
              </div>

              {/* Botões de preset rápido */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                  Valores rápidos de referência:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[2400, 2600, 2800, 3000, 3200, 3500].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDefaultKwpRate(rate)}
                      className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                        defaultKwpRate === rate
                          ? "bg-[#1f7f9b] text-white border border-[#1f7f9b] shadow-sm font-bold"
                          : "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      R$ {rate.toLocaleString("pt-BR")}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                Esse valor permite calibrar seus orçamentos para a realidade de mercado da sua
                cidade e estado, sem a necessidade de reconfigurar a cada cotação.
              </p>
            </div>

            {/* Preview ao vivo de simulação */}
            <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                <TrendingUp className="h-4 w-4 text-[#1f7f9b] dark:text-[#38bdf8]" />
                <span>Impacto estimado em Propostas Comerciais</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {simulationPreviews.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-3 shadow-xs transition-colors"
                  >
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                      {item.label}
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {item.kwp.toLocaleString("pt-BR")} kWp
                    </p>
                    <p className="text-base font-extrabold text-[#0A4A63] dark:text-[#38bdf8] mt-1">
                      R$ {item.total.toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                * Valores brutos finais simulados com base no valor de R${" "}
                {defaultKwpRate.toLocaleString("pt-BR")}/kWp configurado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: PREFERÊNCIA DE MARCAS DE MÓDULOS */}
      <BrandTierSelector
        title="Preferência de Marcas de Módulos"
        subtitle="Organize as marcas ativas por categoria (Standard, Elite, Premium) e defina a prioridade de cotação"
        icon={<Sun className="h-5 w-5" />}
        categoryLabel="módulos"
        availableBrands={availableBrands.modules}
        value={moduleTiers}
        onChange={setModuleTiers}
        loading={loadingBrands}
      />

      {/* CARD 3: PREFERÊNCIA DE MARCAS DE INVERSORES */}
      <BrandTierSelector
        title="Preferência de Marcas de Inversores"
        subtitle="Organize os inversores por categoria de proposta (Standard, Elite, Premium) e defina a prioridade"
        icon={<Cpu className="h-5 w-5" />}
        categoryLabel="inversores"
        availableBrands={availableBrands.inverters}
        value={inverterTiers}
        onChange={setInverterTiers}
        loading={loadingBrands}
      />

      {/* Botão de ação fixo na base */}
      <div className="flex items-center justify-end gap-3 pt-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="bg-[linear-gradient(90deg,#1b5e7c_0%,#1f7f9b_55%,#39d3bf_100%)] text-white shadow-[0_8px_18px_rgba(31,127,155,0.22)] hover:opacity-95 cursor-pointer px-6"
        >
          {saving ? (
            "Salvando..."
          ) : (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Salvar Configurações do Perfil
            </span>
          )}
        </Button>
      </div>

      {/* Notificação Snackbar */}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack(null)}
          severity={snack?.severity ?? "info"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack?.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
