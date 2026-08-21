"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Search, SlidersHorizontal, ChevronDown, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listGeoStates, listGeoCities, GeoState, GeoCity } from "@/lib/leads-api";
import { useOrganization } from "@/components/providers/organization-provider";

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

const DEFAULT_BRAZIL_STATES: Array<{ uf: string; name: string; id?: string }> = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
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
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [states, setStates] = useState<GeoState[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Estados do Dropdown pesquisável de Cidades
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(cityName);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincroniza query com cityName recebido
  useEffect(() => {
    setSearchQuery(cityName);
  }, [cityName]);

  // Carrega estados do banco
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    listGeoStates(orgId)
      .then((data) => {
        if (!cancelled && data && data.length > 0) {
          setStates(data);
        }
      })
      .catch((err) => {
        console.warn("Usando lista local de estados:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Carrega cidades sempre que o estado (UF) mudar
  useEffect(() => {
    if (!orgId) return;
    const currentState = states.find((s) => s.uf.toUpperCase() === uf.toUpperCase());
    const stateIdOrUf = currentState?.id || uf;

    let cancelled = false;
    setLoadingCities(true);

    listGeoCities(orgId, stateIdOrUf)
      .then((data) => {
        if (!cancelled) {
          setCities(data || []);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar cidades do estado:", err);
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, uf, states]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Lista de estados mesclada
  const stateOptions = useMemo(() => {
    if (states.length > 0) return states;
    return DEFAULT_BRAZIL_STATES;
  }, [states]);

  // Filtra cidades pelo texto digitado
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const q = searchQuery
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return cities.filter((c) =>
      c.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(q)
    );
  }, [cities, searchQuery]);

  const handleStateChange = (newUf: string) => {
    setUf(newUf);
    setCityName("");
    setSearchQuery("");
  };

  const handleSelectCity = (cName: string) => {
    setCityName(cName);
    setSearchQuery(cName);
    setDropdownOpen(false);
  };

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
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500 font-medium"
          >
            {stateOptions.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf} - {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Menu Suspenso Pesquisável de Cidade */}
        <div ref={dropdownRef} className="relative">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCityName(e.target.value);
                if (!dropdownOpen) setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Digite ou selecione a cidade..."
              className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs placeholder-neutral-500 pr-8 focus:border-amber-500 font-medium"
            />
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              {loadingCities ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Lista Suspensa Flutuante de Cidades */}
          {dropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl divide-y divide-neutral-800/40 animate-in fade-in slide-in-from-top-1 duration-150">
              {loadingCities ? (
                <div className="p-3 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Carregando cidades de {uf}...</span>
                </div>
              ) : filteredCities.length > 0 ? (
                filteredCities.slice(0, 100).map((c) => {
                  const isSelected = cityName.toLowerCase().trim() === c.name.toLowerCase().trim();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCity(c.name)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-amber-500/10 text-amber-400 font-bold"
                          : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-neutral-400">
                  {searchQuery
                    ? `Nenhuma cidade encontrada para "${searchQuery}"`
                    : "Nenhuma cidade disponível"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bairro */}
        <div>
          <Input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Filtrar por Bairro..."
            className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs placeholder-neutral-500 font-medium"
          />
        </div>

        {/* Classe */}
        <div>
          <select
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500 font-medium"
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
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500 font-medium"
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
            onClick={() => {
              setDropdownOpen(false);
              onSearch();
            }}
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
