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
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Compass className="w-4 h-4" />
            <span>Inteligência Geográfica & Prospecção</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Radar Solar ANEEL
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Mapeamento de usinas conectadas, identificação de vizinhança e oportunidades de
            retrofit/baterias.
          </p>
        </div>

        {/* Alternador de Visualização (Mapa x Lista) & Atualizar */}
        <div className="flex items-center gap-2">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex items-center">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista ({installations.length})</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRadarData}
            disabled={loading}
            className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Demo Mode Notice for Start / Trial */}
      {(user?.isTrial ||
        !currentOrganization?.subscription ||
        currentOrganization?.subscription?.status !== "active") && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Radar Solar ANEEL — Modo Demonstração
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PLANO PRO
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                No plano Start você pode visualizar como funciona a inteligência geográfica de
                usinas. A pesquisa ativa por município, filtro de potência e prospecção direta de
                vizinhança é liberada a partir do{" "}
                <strong className="text-amber-300">Plano Pro</strong>.
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
        <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-semibold uppercase tracking-wider">
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
              <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
                {installations.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">
                        {item.holderName && item.holderName !== "***"
                          ? item.holderName
                          : "Pessoa Física (Residencial)"}
                      </div>
                      {item.documentNumber && item.documentNumber !== "***" && (
                        <div className="text-[11px] font-mono text-neutral-400">
                          {item.documentNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-amber-400 font-semibold">
                      {item.codeAneel}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-white">{item.neighborhood}</div>
                      <div className="text-[11px] text-neutral-400">
                        {item.city} - {item.uf}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-300">
                        {item.classType}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-white">{item.powerKwp} kWp</td>
                    <td className="p-3.5 text-neutral-400">
                      {item.yearsConnected} anos atrás ({item.connectionDate.split("-")[0]})
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.opportunityType === "UPGRADE_BATTERY"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
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
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-8 px-3"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Compass className="w-5 h-5" />
              </span>
              Radar Solar ANEEL — Plano Pro
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
              No plano Start você tem acesso à demonstração do Radar Solar. Para pesquisar usinas
              por cidades, bairros e classes, navegar livremente pelo mapa satélite de alta
              resolução e prospectar diretamente no CRM, faça upgrade para o{" "}
              <strong>Plano Pro</strong> ou superior.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setRadarUpgradeModalOpen(false)}>
              Fechar
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
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
