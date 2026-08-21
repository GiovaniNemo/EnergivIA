"use client";

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          <Select value={uf} onValueChange={setUf}>
            <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-950 border-neutral-800 text-white">
              {BRAZIL_STATES.map((s) => (
                <SelectItem key={s.uf} value={s.uf} className="text-xs">
                  {s.uf} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select value={classType} onValueChange={setClassType}>
            <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs">
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-950 border-neutral-800 text-white">
              <SelectItem value="ALL" className="text-xs">
                Todas as Classes
              </SelectItem>
              <SelectItem value="RESIDENTIAL" className="text-xs">
                Residencial
              </SelectItem>
              <SelectItem value="COMMERCIAL" className="text-xs">
                Comercial
              </SelectItem>
              <SelectItem value="INDUSTRIAL" className="text-xs">
                Industrial
              </SelectItem>
              <SelectItem value="RURAL" className="text-xs">
                Rural
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Oportunidade */}
        <div>
          <Select value={opportunityType} onValueChange={setOpportunityType}>
            <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs">
              <SelectValue placeholder="Oportunidade" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-950 border-neutral-800 text-white">
              <SelectItem value="ALL" className="text-xs">
                Todas as Oportunidades
              </SelectItem>
              <SelectItem value="UPGRADE_BATTERY" className="text-xs">
                🔋 Retrofit / Baterias (&gt;3 anos)
              </SelectItem>
              <SelectItem value="NEW_NEIGHBORS" className="text-xs">
                👥 Vizinhança Solar
              </SelectItem>
              <SelectItem value="RECENT" className="text-xs">
                ⚡ Conexões Recentes
              </SelectItem>
            </SelectContent>
          </Select>
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
