"use client";

import React, { useEffect, useState } from "react";
import { Compass, List, Map as MapIcon, RefreshCw, ArrowUpRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRadarInstallations } from "@/lib/radar-api";
import { useOrganization } from "@/components/providers/organization-provider";
import { RadarStatsHeader } from "@/components/radar/radar-stats-header";
import { RadarFilters } from "@/components/radar/radar-filters";
import { RadarMapView, InstallationPoint } from "@/components/radar/radar-map-view";
import { RadarLeadModal } from "@/components/radar/radar-lead-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RadarPage() {
  const { currentOrganization, user } = useOrganization();
  const [uf, setUf] = useState("SP");
  const [cityName, setCityName] = useState("São Paulo");
  const [neighborhood, setNeighborhood] = useState("");
  const [classType, setClassType] = useState("ALL");
  const [opportunityType, setOpportunityType] = useState("ALL");

  const [installations, setInstallations] = useState<InstallationPoint[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const [selectedInstallation, setSelectedInstallation] = useState<InstallationPoint | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [radarUpgradeModalOpen, setRadarUpgradeModalOpen] = useState(false);

  const isPaidProPlan = Boolean(
    !user?.isTrial &&
    currentOrganization?.subscription &&
    currentOrganization?.subscription?.status === "active"
  );
  const isLocked = !isPaidProPlan;

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const data = await fetchRadarInstallations(
        {
          uf,
          cityName: cityName.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          classType: classType !== "ALL" ? classType : undefined,
          opportunityType: opportunityType !== "ALL" ? opportunityType : undefined,
        },
        currentOrganization?.id
      );

      if (data) {
        setInstallations(data.installations || []);
        setStats(data.stats || null);
        if (data.installations?.length > 0) {
          setSelectedInstallation(data.installations[0]);
        } else {
          setSelectedInstallation(null);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Radar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Compass className="w-4 h-4" />
            <span>Inteligência Geográfica & Prospecção</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Radar Solar ANEEL
          </h1>
          <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
            Mapeamento de usinas conectadas, identificação de vizinhança e oportunidades de
            retrofit/baterias.
          </p>
        </div>

        {/* Alternador de Visualização (Mapa x Lista) & Atualizar */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-1 flex items-center shadow-sm">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa</span>
            </button>
            <button
              onClick={() => {
                if (isLocked) {
                  setRadarUpgradeModalOpen(true);
                  return;
                }
                setViewMode("list");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <List className="w-3.5 h-3.5" />
              )}
              <span>Lista {isLocked ? "(Pro)" : `(${installations.length})`}</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRadarData}
            disabled={loading}
            className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 h-9 font-medium"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin text-amber-500" : ""}`}
            />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Demo Mode Notice for Start / Trial */}
      {(user?.isTrial ||
        !currentOrganization?.subscription ||
        currentOrganization?.subscription?.status !== "active") && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Radar Solar ANEEL — Modo Demonstração
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PLANO PRO
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                No plano Start você pode visualizar como funciona a inteligência geográfica de
                usinas. A pesquisa ativa por município, visualização em lista detalhada e prospecção
                direta de vizinhança é liberada a partir do{" "}
                <strong className="text-amber-600 dark:text-amber-300">Plano Pro</strong>.
              </p>
            </div>
          </div>
          <a
            href="/gestao/meus-planos"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md whitespace-nowrap shrink-0"
          >
            Desbloquear no Plano Pro &rarr;
          </a>
        </div>
      )}

      {/* Cards de Métricas da Região */}
      <RadarStatsHeader stats={stats} loading={loading} />

      {/* Barra de Filtros */}
      <RadarFilters
        uf={uf}
        setUf={setUf}
        cityName={cityName}
        setCityName={setCityName}
        neighborhood={neighborhood}
        setNeighborhood={setNeighborhood}
        classType={classType}
        setClassType={setClassType}
        opportunityType={opportunityType}
        setOpportunityType={setOpportunityType}
        onSearch={fetchRadarData}
        loading={loading}
        isLocked={isLocked}
        onLockedClick={() => setRadarUpgradeModalOpen(true)}
      />

      {/* Conteúdo Principal: Mapa ou Tabela */}
      {viewMode === "map" ? (
        <RadarMapView
          installations={installations}
          selectedInstallation={selectedInstallation}
          onSelectInstallation={setSelectedInstallation}
          onOpenConvertModal={(item) => {
            if (isLocked) {
              setRadarUpgradeModalOpen(true);
              return;
            }
            setSelectedInstallation(item);
            setConvertModalOpen(true);
          }}
          isLocked={isLocked}
          onLockedClick={() => setRadarUpgradeModalOpen(true)}
        />
      ) : (
        <div className="relative bg-white dark:bg-neutral-900/90 rounded-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-md dark:shadow-xl min-h-[400px]">
          {/* Lock Overlay for Free/Start Plan */}
          {isLocked && (
            <div
              onClick={() => setRadarUpgradeModalOpen(true)}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm p-6 text-center cursor-pointer transition-all hover:bg-white/90 dark:hover:bg-neutral-950/85 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/10 group-hover:scale-105 transition-transform">
                <Lock className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                Recurso Bloqueado no Plano Start
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white max-w-md">
                Lista Completa de Usinas & Prospecção
              </h3>
              <p className="text-sm text-slate-600 dark:text-neutral-300 max-w-lg mt-2 leading-relaxed">
                A visualização tabular com contatos, códigos ANEEL de usinas conectadas e conversão
                em lote para oportunidades está disponível a partir do{" "}
                <strong className="text-amber-600 dark:text-amber-400">Plano Pro</strong>.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRadarUpgradeModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 px-6 h-11 text-sm rounded-xl"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Desbloquear Lista no Plano Pro
                </Button>
              </div>
            </div>
          )}

          <div
            className={`overflow-x-auto ${isLocked ? "pointer-events-none select-none blur-[4px] opacity-30" : ""}`}
          >
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-neutral-950/80 text-slate-600 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Titular / Empresa</th>
                  <th className="p-3.5">Código ANEEL</th>
                  <th className="p-3.5">Bairro / Cidade</th>
                  <th className="p-3.5">Classe</th>
                  <th className="p-3.5">Potência</th>
                  <th className="p-3.5">Conexão</th>
                  <th className="p-3.5">Oportunidade</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800/60 text-slate-700 dark:text-neutral-200">
                {installations.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.holderName && item.holderName !== "***"
                          ? item.holderName
                          : "Pessoa Física (Residencial)"}
                      </div>
                      {item.documentNumber && item.documentNumber !== "***" && (
                        <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                          {item.documentNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      {item.codeAneel}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.neighborhood}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {item.city} - {item.uf}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-[10px] font-semibold text-slate-700 dark:text-neutral-300">
                        {item.classType}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {item.powerKwp} kWp
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-neutral-400">
                      {item.yearsConnected} anos atrás ({item.connectionDate.split("-")[0]})
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.opportunityType === "UPGRADE_BATTERY"
                            ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {item.opportunityType === "UPGRADE_BATTERY"
                          ? "Retrofit / Bateria"
                          : "Vizinhança"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isLocked) {
                            setRadarUpgradeModalOpen(true);
                            return;
                          }
                          setSelectedInstallation(item);
                          setConvertModalOpen(true);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 px-3"
                      >
                        {isLocked ? <Lock className="w-3 h-3 mr-1" /> : null}
                        <span>{isLocked ? "Desbloquear" : "Gerar Lead"}</span>
                        {!isLocked && <ArrowUpRight className="w-3 h-3 ml-1" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Conversão em Lead */}
      <RadarLeadModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        installation={selectedInstallation}
      />

      {/* Modal de Upgrade para o Radar Solar */}
      <Dialog open={radarUpgradeModalOpen} onOpenChange={setRadarUpgradeModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-neutral-900 text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
                <Compass className="w-5 h-5" />
              </span>
              Radar Solar ANEEL — Plano Pro
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
              No plano Start você tem acesso à demonstração do Radar Solar. Para pesquisar usinas
              por cidades, bairros e classes, navegar livremente pelo mapa satélite de alta
              resolução e prospectar diretamente no CRM, faça upgrade para o{" "}
              <strong className="text-slate-900 dark:text-white">Plano Pro</strong> ou superior.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setRadarUpgradeModalOpen(false)}
              className="border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              Fechar
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold"
              onClick={() => {
                setRadarUpgradeModalOpen(false);
                window.location.href = "/gestao/meus-planos";
              }}
            >
              Conhecer Plano Pro &rarr;
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
