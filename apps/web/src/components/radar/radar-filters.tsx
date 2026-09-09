"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Search, SlidersHorizontal, ChevronDown, Check, Loader2, Lock } from "lucide-react";
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
  isLocked?: boolean;
  onLockedClick?: () => void;
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
  isLocked = false,
  onLockedClick,
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
    if (isLocked) {
      onLockedClick?.();
      return;
    }
    setUf(newUf);
    setCityName("");
    setSearchQuery("");
  };

  const handleSelectCity = (cName: string) => {
    if (isLocked) {
      onLockedClick?.();
      return;
    }
    setCityName(cName);
    setSearchQuery(cName);
    setDropdownOpen(false);
  };

  return (
    <div
      onClick={() => {
        if (isLocked) onLockedClick?.();
      }}
      className={`bg-white dark:bg-neutral-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm dark:shadow-lg space-y-3 relative transition-all ${
        isLocked ? "cursor-pointer hover:border-amber-500/40" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <SlidersHorizontal className="w-4 h-4 text-amber-500" />
          <span>Filtros de Prospecção Geográfica</span>
          {isLocked && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 ml-2">
              <Lock className="w-3 h-3" />
              <span>Bloqueado no Plano Start</span>
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 dark:text-neutral-400">
          Base ANEEL GD Atualizada
        </span>
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 ${isLocked ? "opacity-75 pointer-events-none" : ""}`}
      >
        {/* Estado */}
        <div>
          <select
            value={uf}
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={isLocked}
            className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500 font-medium disabled:cursor-not-allowed"
          >
            {stateOptions.map((s) => (
              <option
                key={s.uf}
                value={s.uf}
                className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
              >
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
                if (isLocked) return;
                setSearchQuery(e.target.value);
                setCityName(e.target.value);
                if (!dropdownOpen) setDropdownOpen(true);
              }}
              onFocus={() => {
                if (!isLocked) setDropdownOpen(true);
              }}
              disabled={isLocked}
              placeholder="Digite ou selecione a cidade..."
              className="bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white h-9 text-xs placeholder-slate-400 dark:placeholder-neutral-500 pr-8 focus:border-amber-500 font-medium disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (!isLocked) setDropdownOpen((prev) => !prev);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            >
              {loadingCities ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Lista Suspensa Flutuante de Cidades */}
          {dropdownOpen && !isLocked && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-neutral-800/40 animate-in fade-in slide-in-from-top-1 duration-150">
              {loadingCities ? (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
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
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                          : "text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-neutral-400">
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
            disabled={isLocked}
            placeholder="Filtrar por Bairro..."
            className="bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white h-9 text-xs placeholder-slate-400 dark:placeholder-neutral-500 font-medium disabled:cursor-not-allowed"
          />
        </div>

        {/* Classe */}
        <div>
          <select
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
            disabled={isLocked}
            className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500 font-medium disabled:cursor-not-allowed"
          >
            <option
              value="ALL"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              Todas as Classes
            </option>
            <option
              value="RESIDENTIAL"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              Residencial
            </option>
            <option
              value="COMMERCIAL"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              Comercial
            </option>
            <option
              value="INDUSTRIAL"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              Industrial
            </option>
            <option
              value="RURAL"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              Rural
            </option>
          </select>
        </div>

        {/* Tipo de Oportunidade */}
        <div>
          <select
            value={opportunityType}
            onChange={(e) => setOpportunityType(e.target.value)}
            disabled={isLocked}
            className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-white h-9 px-2 text-xs focus:outline-none focus:border-amber-500 font-medium disabled:cursor-not-allowed"
          >
            <option
              value="ALL"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              Todas as Oportunidades
            </option>
            <option
              value="UPGRADE_BATTERY"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              🔋 Retrofit / Baterias (&gt;3 anos)
            </option>
            <option
              value="NEW_NEIGHBORS"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              👥 Vizinhança Solar
            </option>
            <option
              value="RECENT"
              className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
            >
              ⚡ Conexões Recentes
            </option>
          </select>
        </div>

        {/* Botão Buscar */}
        <div>
          <Button
            onClick={(e) => {
              if (isLocked) {
                e.stopPropagation();
                onLockedClick?.();
                return;
              }
              setDropdownOpen(false);
              onSearch();
            }}
            disabled={loading}
            className="w-full h-9 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20"
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isLocked ? "Desbloquear Pro" : loading ? "Buscando..." : "Explorar"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
