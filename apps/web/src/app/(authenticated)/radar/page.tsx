"use client";

import React, { useEffect, useState } from "react";
import { Compass, List, Map as MapIcon, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { RadarStatsHeader } from "@/components/radar/radar-stats-header";
import { RadarFilters } from "@/components/radar/radar-filters";
import { RadarMapView, InstallationPoint } from "@/components/radar/radar-map-view";
import { RadarLeadModal } from "@/components/radar/radar-lead-modal";

export default function RadarPage() {
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

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/radar/installations", {
        params: {
          uf,
          cityName: cityName.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          classType: classType !== "ALL" ? classType : undefined,
          opportunityType: opportunityType !== "ALL" ? opportunityType : undefined,
        },
      });

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
      />

      {/* Conteúdo Principal: Mapa ou Tabela */}
      {viewMode === "map" ? (
        <RadarMapView
          installations={installations}
          selectedInstallation={selectedInstallation}
          onSelectInstallation={setSelectedInstallation}
          onOpenConvertModal={(item) => {
            setSelectedInstallation(item);
            setConvertModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-semibold uppercase tracking-wider">
                <tr>
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
                          setSelectedInstallation(item);
                          setConvertModalOpen(true);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-8 px-3"
                      >
                        <span>Gerar Lead</span>
                        <ArrowUpRight className="w-3 h-3 ml-1" />
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
    </div>
  );
}
