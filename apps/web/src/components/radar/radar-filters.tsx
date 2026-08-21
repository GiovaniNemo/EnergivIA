"use client";

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RadarFiltersProps {
  uf: string;
  setUf: (val: string) => void;
  cityName: string;
  setCityName: (val: string) => void;
  neighborhood: string;
  setNeighborhood: (val: string) => void;
  classType: string;
  setClassType: (val: string) => void;
  opportunityType: string;
  setOpportunityType: (val: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

const BRAZIL_STATES = [
  { uf: "SP", name: "São Paulo" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "PR", name: "Paraná" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "GO", name: "Goiás" },
  { uf: "BA", name: "Bahia" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
];

export function RadarFilters({
  uf,
  setUf,
  cityName,
  setCityName,
  neighborhood,
  setNeighborhood,
  classType,
  setClassType,
  opportunityType,
  setOpportunityType,
  onSearch,
  loading,
}: RadarFiltersProps) {
  return (
    <div className="bg-neutral-900/90 backdrop-blur-md p-4 rounded-2xl border border-neutral-800 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span>Filtros de Prospecção Geográfica</span>
        </div>
        <span className="text-xs text-neutral-400">Base ANEEL GD Atualizada</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Estado */}
        <div>
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500"
          >
            {BRAZIL_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf} - {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cidade */}
        <div>
          <Input
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="Cidade (ex: São Paulo)"
            className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs placeholder-neutral-500"
          />
        </div>

        {/* Bairro */}
        <div>
          <Input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Filtrar por Bairro..."
            className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs placeholder-neutral-500"
          />
        </div>

        {/* Classe */}
        <div>
          <select
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas as Classes</option>
            <option value="RESIDENTIAL">Residencial</option>
            <option value="COMMERCIAL">Comercial</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="RURAL">Rural</option>
          </select>
        </div>

        {/* Tipo de Oportunidade */}
        <div>
          <select
            value={opportunityType}
            onChange={(e) => setOpportunityType(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas as Oportunidades</option>
            <option value="UPGRADE_BATTERY">🔋 Retrofit / Baterias (&gt;3 anos)</option>
            <option value="NEW_NEIGHBORS">👥 Vizinhança Solar</option>
            <option value="RECENT">⚡ Conexões Recentes</option>
          </select>
        </div>

        {/* Botão Buscar */}
        <div>
          <Button
            onClick={onSearch}
            disabled={loading}
            className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? "Buscando..." : "Explorar"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
