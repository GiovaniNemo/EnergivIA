"use client";

import { useEffect, useState, useMemo } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  updateOrganization,
  getDistributorAvailableBrands,
  type DistributorAvailableBrands,
} from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import {
  SlidersHorizontal,
  Sun,
  Cpu,
  Check,
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
  const [selectedModuleBrands, setSelectedModuleBrands] = useState<string[]>([]);
  const [selectedInverterBrands, setSelectedInverterBrands] = useState<string[]>([]);

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
      if (Array.isArray(currentOrganization.preferredModuleBrands)) {
        setSelectedModuleBrands([...currentOrganization.preferredModuleBrands]);
      }
      if (Array.isArray(currentOrganization.preferredInverterBrands)) {
        setSelectedInverterBrands([...currentOrganization.preferredInverterBrands]);
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

    setSaving(true);
    try {
      await updateOrganization(
        currentOrganizationId,
        {
          defaultKwpRate: rate,
          preferredModuleBrands: selectedModuleBrands,
          preferredInverterBrands: selectedInverterBrands,
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

  const handleToggleModuleBrand = (brand: string) => {
    if (!canEdit) return;
    setSelectedModuleBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleToggleInverterBrand = (brand: string) => {
    if (!canEdit) return;
    setSelectedInverterBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
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
            Defina o valor base de venda por kWp e configure suas preferências de marcas do
            distribuidor para as cotações.
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
      <Card className="border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Sun className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Marcas de Módulos (Painéis Solares)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal mt-0.5">
                  Marcas homologadas com produtos ativos no catálogo do distribuidor
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {selectedModuleBrands.length} de {availableBrands.modules.length} selecionada(s)
              </span>
              {canEdit && availableBrands.modules.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedModuleBrands.length === availableBrands.modules.length) {
                      setSelectedModuleBrands([]);
                    } else {
                      setSelectedModuleBrands([...availableBrands.modules]);
                    }
                  }}
                  className="text-xs sm:text-sm font-semibold text-[#1f7f9b] dark:text-[#38bdf8] hover:underline cursor-pointer"
                >
                  {selectedModuleBrands.length === availableBrands.modules.length
                    ? "Limpar Seleção"
                    : "Selecionar Todas"}
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingBrands ? (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <LoadingState label="Carregando marcas ativas do distribuidor..." compact />
            </div>
          ) : availableBrands.modules.length === 0 ? (
            <p className="py-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 italic">
              Nenhuma marca específica encontrada no distribuidor no momento. Todas as marcas
              disponíveis serão cotadas normalmente.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {availableBrands.modules.map((brand) => {
                const isSelected = selectedModuleBrands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleModuleBrand(brand)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-[#1f7f9b] bg-[#1f7f9b]/15 dark:bg-[#1f7f9b]/25 text-[#0A4A63] dark:text-[#38bdf8] shadow-xs font-semibold ring-1 ring-[#1f7f9b]/40"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 hover:border-[#1f7f9b]/60 dark:hover:border-[#1f7f9b]/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium truncate mr-2">{brand}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                        isSelected
                          ? "bg-[#1f7f9b] text-white"
                          : "border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      {isSelected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 p-3.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
            {selectedModuleBrands.length > 0 ? (
              <p>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Marcas prioritárias ativas:
                </strong>{" "}
                O sistema priorizará kits e propostas compostos por{" "}
                {selectedModuleBrands.join(", ")}.
              </p>
            ) : (
              <p>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Modo Padrão Global:
                </strong>{" "}
                Nenhuma restrição aplicada. Todas as marcas ativas no distribuidor serão cotadas
                normalmente conforme melhor preço e disponibilidade de estoque.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: PREFERÊNCIA DE MARCAS DE INVERSORES */}
      <Card className="border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Cpu className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Marcas de Inversores & Microinversores
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal mt-0.5">
                  Inversores string, híbridos e microinversores disponíveis no distribuidor
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {selectedInverterBrands.length} de {availableBrands.inverters.length} selecionada(s)
              </span>
              {canEdit && availableBrands.inverters.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedInverterBrands.length === availableBrands.inverters.length) {
                      setSelectedInverterBrands([]);
                    } else {
                      setSelectedInverterBrands([...availableBrands.inverters]);
                    }
                  }}
                  className="text-xs sm:text-sm font-semibold text-[#1f7f9b] dark:text-[#38bdf8] hover:underline cursor-pointer"
                >
                  {selectedInverterBrands.length === availableBrands.inverters.length
                    ? "Limpar Seleção"
                    : "Selecionar Todas"}
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingBrands ? (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <LoadingState label="Carregando marcas ativas do distribuidor..." compact />
            </div>
          ) : availableBrands.inverters.length === 0 ? (
            <p className="py-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 italic">
              Nenhuma marca específica de inversor encontrada no distribuidor no momento. Todas as
              marcas disponíveis serão cotadas normalmente.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {availableBrands.inverters.map((brand) => {
                const isSelected = selectedInverterBrands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleInverterBrand(brand)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-[#1f7f9b] bg-[#1f7f9b]/15 dark:bg-[#1f7f9b]/25 text-[#0A4A63] dark:text-[#38bdf8] shadow-xs font-semibold ring-1 ring-[#1f7f9b]/40"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 hover:border-[#1f7f9b]/60 dark:hover:border-[#1f7f9b]/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium truncate mr-2">{brand}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                        isSelected
                          ? "bg-[#1f7f9b] text-white"
                          : "border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      {isSelected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 p-3.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
            {selectedInverterBrands.length > 0 ? (
              <p>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Marcas prioritárias ativas:
                </strong>{" "}
                O sistema priorizará inversores de {selectedInverterBrands.join(", ")}.
              </p>
            ) : (
              <p>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Modo Padrão Global:
                </strong>{" "}
                Nenhuma restrição aplicada. Todos os inversores homologados do distribuidor serão
                considerados para escolha automática do melhor custo-benefício.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
