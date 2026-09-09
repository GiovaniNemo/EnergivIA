import React, { useEffect, useRef, useState } from "react";
import { Sparkles, UserPlus, Satellite, Moon, Map as MapIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InstallationPoint {
  id: string;
  codeAneel: string;
  uf: string;
  city: string;
  neighborhood: string;
  addressMasked: string;
  distributor: string;
  classType: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "RURAL";
  powerKwp: number;
  modulesCount: number;
  invertersCount: number;
  connectionDate: string;
  yearsConnected: number;
  opportunityType: "UPGRADE_BATTERY" | "NEW_NEIGHBORS" | "RECENT";
  estimatedMonthlyGenKwh: number;
  estimatedMonthlySavingsBrl: number;
  holderName?: string | null;
  documentNumber?: string | null;
  consumerType?: string | null;
  substation?: string | null;
  modality?: string | null;
  latitude: number;
  longitude: number;
  leadPotentialScore: number;
  recommendedPitch: string;
}

interface RadarMapViewProps {
  installations: InstallationPoint[];
  selectedInstallation: InstallationPoint | null;
  onSelectInstallation: (item: InstallationPoint) => void;
  onOpenConvertModal: (item: InstallationPoint) => void;
  isLocked?: boolean;
  onLockedClick?: () => void;
}

type MapLayerType = "dark" | "satellite" | "streets";

interface LeafletClusterGroup {
  clearLayers: () => void;
  addLayers: (layers: unknown[]) => void;
  addTo: (map: unknown) => unknown;
}

interface LeafletMapInstance {
  setView: (center: [number, number], zoom: number) => unknown;
  remove: () => void;
  removeLayer: (layer: unknown) => void;
  fitBounds: (bounds: [number, number][], opts?: Record<string, unknown>) => void;
}

// Configuração das camadas ultra-rápidas sem marcas d'água restritivas
const TILE_LAYERS: Record<
  MapLayerType,
  { url: string; subdomains: string; maxZoom: number; maxNativeZoom?: number }
> = {
  dark: {
    // Esri World Dark Gray Base - Super limpo, moderno, alta resolução, sem marcas d'água
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    subdomains: "",
    maxZoom: 19,
    maxNativeZoom: 16,
  },
  satellite: {
    // Google Hybrid Satellite HD (Satélite nítido + ruas e rodovias para identificar telhados)
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: "0123",
    maxZoom: 22,
    maxNativeZoom: 20,
  },
  streets: {
    // Google Roads / Streets (Mapa claro com nomes de bairros e vias nítidas)
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: "0123",
    maxZoom: 20,
    maxNativeZoom: 20,
  },
};

export function RadarMapView({
  installations,
  selectedInstallation,
  onSelectInstallation,
  onOpenConvertModal,
  isLocked = false,
  onLockedClick,
}: RadarMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const tileLayerRef = useRef<unknown>(null);
  const clusterGroupRef = useRef<LeafletClusterGroup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("streets");

  // Injeta Leaflet + Leaflet.markercluster CSS e JS dinamicamente
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 2. MarkerCluster CSS
    if (!document.getElementById("markercluster-css")) {
      const clusterCss = document.createElement("link");
      clusterCss.id = "markercluster-css";
      clusterCss.rel = "stylesheet";
      clusterCss.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
      document.head.appendChild(clusterCss);

      const clusterDefaultCss = document.createElement("link");
      clusterDefaultCss.id = "markercluster-default-css";
      clusterDefaultCss.rel = "stylesheet";
      clusterDefaultCss.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
      document.head.appendChild(clusterDefaultCss);
    }

    // 3. Estilos customizados para clusters com visual moderno EnergivIA
    if (!document.getElementById("energiv-cluster-styles")) {
      const customStyle = document.createElement("style");
      customStyle.id = "energiv-cluster-styles";
      customStyle.innerHTML = `
        .custom-cluster-marker {
          background: rgba(245, 158, 11, 0.3);
          border: 2px solid #f59e0b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
          backdrop-filter: blur(4px);
          transition: transform 0.15s ease;
        }
        .custom-cluster-marker:hover {
          transform: scale(1.08);
        }
        .custom-cluster-marker-inner {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .custom-cluster-large {
          background: rgba(147, 51, 234, 0.3);
          border-color: #9333ea;
          box-shadow: 0 4px 16px rgba(147, 51, 234, 0.45);
        }
        .custom-cluster-large .custom-cluster-marker-inner {
          background: linear-gradient(135deg, #9333ea, #7e22ce);
          color: #ffffff;
          border: 2px solid #ffffff;
        }
      `;
      document.head.appendChild(customStyle);
    }

    // 4. Carrega scripts sequencialmente (Leaflet -> MarkerCluster)
    const loadScripts = () => {
      const win = window as unknown as {
        L?: Record<string, unknown> & { markerClusterGroup?: unknown };
      };
      if (!win.L) {
        const scriptLeaflet = document.createElement("script");
        scriptLeaflet.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        scriptLeaflet.async = true;
        scriptLeaflet.onload = () => {
          if (!win.L?.markerClusterGroup) {
            const scriptCluster = document.createElement("script");
            scriptCluster.src =
              "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
            scriptCluster.async = true;
            scriptCluster.onload = () => setMapLoaded(true);
            document.body.appendChild(scriptCluster);
          } else {
            setMapLoaded(true);
          }
        };
        document.body.appendChild(scriptLeaflet);
      } else if (!win.L.markerClusterGroup) {
        const scriptCluster = document.createElement("script");
        scriptCluster.src =
          "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
        scriptCluster.async = true;
        scriptCluster.onload = () => setMapLoaded(true);
        document.body.appendChild(scriptCluster);
      } else {
        setMapLoaded(true);
      }
    };

    loadScripts();
  }, []);

  // Altera o Tile Layer quando o usuário muda para Ruas / Satélite / Analítico
  const handleSwitchLayer = (layer: MapLayerType) => {
    setActiveLayer(layer);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const win = window as unknown as { L?: Record<string, (...args: unknown[]) => unknown> };
    const L = win.L;
    if (!L) return;

    const cfg = TILE_LAYERS[layer];
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = (
      L["tileLayer"] as (url: string, opts: Record<string, unknown>) => unknown
    )(cfg.url, {
      maxZoom: cfg.maxZoom,
      maxNativeZoom: cfg.maxNativeZoom,
      subdomains: cfg.subdomains,
      keepBuffer: 8,
    });
    (tileLayerRef.current as { addTo: (m: unknown) => unknown }).addTo(mapInstanceRef.current);
  };

  // Inicializa a instância do mapa
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const win = window as unknown as { L?: Record<string, unknown> };
    const L = win.L as Record<string, (...args: unknown[]) => unknown> | undefined;
    if (!L || typeof L["map"] !== "function") return;

    const initialLat = installations[0]?.latitude ?? -23.55052;
    const initialLng = installations[0]?.longitude ?? -46.633308;

    const map = L["map"](mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true, // Renderização ultra-rápida via Canvas
      dragging: !isLocked,
      touchZoom: !isLocked,
      doubleClickZoom: !isLocked,
      scrollWheelZoom: !isLocked,
      boxZoom: !isLocked,
      keyboard: !isLocked,
    }) as LeafletMapInstance;
    map.setView([initialLat, initialLng], 13);

    // Controle de Zoom na direita (apenas quando não bloqueado)
    if (!isLocked && (typeof L["control"] === "object" || typeof L["control"] === "function")) {
      const ctrl = (
        L["control"] as unknown as {
          zoom: (opts: Record<string, unknown>) => { addTo: (m: unknown) => unknown };
        }
      ).zoom({
        position: "bottomright",
      });
      ctrl.addTo(map);
    }

    // Camada inicial
    const initialConfig = TILE_LAYERS[activeLayer];
    tileLayerRef.current = (
      L["tileLayer"] as (url: string, opts: Record<string, unknown>) => unknown
    )(initialConfig.url, {
      maxZoom: initialConfig.maxZoom,
      maxNativeZoom: initialConfig.maxNativeZoom,
      subdomains: initialConfig.subdomains,
      keepBuffer: 8,
    });
    (tileLayerRef.current as { addTo: (m: unknown) => unknown }).addTo(map);

    // MarkerClusterGroup com visual limpo e expansão inteligente por zoom
    if (typeof L["markerClusterGroup"] === "function") {
      clusterGroupRef.current = L["markerClusterGroup"]({
        chunkedLoading: true,
        maxClusterRadius: 50, // Agrupa melhor para evitar sobreposição
        spiderfyOnMaxZoom: true, // Expande em teia se houver usinas muito próximas no mesmo quarteirão/lote
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 16, // A partir do nível de rua/bairro, mostra os pins individuais
        iconCreateFunction: (cluster: { getChildCount: () => number }) => {
          const count = cluster.getChildCount();
          const isLarge = count >= 50;
          const size = isLarge ? 46 : 38;
          const innerSize = isLarge ? 38 : 32;

          return (L["divIcon"] as (opts: Record<string, unknown>) => unknown)({
            html: `
              <div class="custom-cluster-marker ${isLarge ? "custom-cluster-large" : ""}" style="width: ${size}px; height: ${size}px;">
                <div class="custom-cluster-marker-inner" style="width: ${innerSize}px; height: ${innerSize}px;">
                  ${count > 999 ? (count / 1000).toFixed(1) + "k" : count}
                </div>
              </div>
            `,
            className: "marker-cluster-custom",
            iconSize: (L["point"] as (x: number, y: number) => unknown)(size, size),
          });
        },
      }) as LeafletClusterGroup;
    } else if (typeof L["layerGroup"] === "function") {
      clusterGroupRef.current = L["layerGroup"]() as LeafletClusterGroup;
    }

    if (clusterGroupRef.current) {
      clusterGroupRef.current.addTo(map);
    }
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapLoaded]);

  // Renderiza e atualiza os marcadores de forma performática
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;

    const win = window as unknown as { L?: Record<string, (...args: unknown[]) => unknown> };
    const L = win.L;
    if (!L) return;

    clusterGroupRef.current.clearLayers();

    if (installations.length === 0) return;

    const markers: unknown[] = [];
    const bounds: [number, number][] = [];

    installations.forEach((item) => {
      bounds.push([item.latitude, item.longitude]);

      const isUpgrade = item.opportunityType === "UPGRADE_BATTERY";
      const isCommercial = item.classType === "COMMERCIAL" || item.classType === "INDUSTRIAL";
      const isSelected = selectedInstallation?.id === item.id;

      // Cores vibrantes com alto contraste
      const bgColor = isCommercial
        ? "#2563eb" // Azul Comercial / Industrial
        : isUpgrade
          ? "#9333ea" // Roxo Alvo Retrofit (> 3 anos)
          : "#f59e0b"; // Âmbar Residencial Padrão

      const size = isSelected ? 34 : 26;

      const iconHtml = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 10px ${bgColor}88;
          border: 2px solid ${isSelected ? "#ffffff" : "rgba(255,255,255,0.95)"};
          cursor: pointer;
          transform: ${isSelected ? "scale(1.2)" : "scale(1)"};
          transition: transform 0.15s ease-in-out;
        ">
          ⚡
        </div>
      `;

      const customIcon = (L["divIcon"] as (opts: Record<string, unknown>) => unknown)({
        className: "custom-solar-pin",
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = (
        L["marker"] as (
          coords: [number, number],
          opts: Record<string, unknown>
        ) => {
          on: (event: string, fn: () => void) => void;
          bindTooltip: (text: string, opts: Record<string, unknown>) => void;
        }
      )([item.latitude, item.longitude], { icon: customIcon });

      marker.on("click", () => {
        onSelectInstallation(item);
      });

      marker.bindTooltip(
        `<b>${item.powerKwp} kWp</b> • ${item.neighborhood || "Região"} (${item.yearsConnected}a conectada)`,
        { direction: "top", offset: [0, -8] }
      );

      markers.push(marker);
    });

    // Adiciona todos os marcadores de uma só vez no cluster para evitar re-renderizações no DOM
    clusterGroupRef.current.addLayers(markers);

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [installations, selectedInstallation, mapLoaded]);

  return (
    <div className="relative w-full h-[600px] lg:h-[700px] rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-lg dark:shadow-2xl bg-slate-100 dark:bg-neutral-950">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Alternador de Camadas (Ruas / Satélite / Analítico) */}
      <div className="absolute top-3 right-3 z-10 flex items-center bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={() => handleSwitchLayer("streets")}
          className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeLayer === "streets"
              ? "bg-amber-500 text-slate-950 shadow-md font-bold"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          title="Ruas e Bairros (Mapa Claro e Nítido)"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ruas</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchLayer("satellite")}
          className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeLayer === "satellite"
              ? "bg-amber-500 text-slate-950 shadow-md font-bold"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          title="Satélite Alta Resolução (Identificação de Telhados)"
        >
          <Satellite className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Satélite HD</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchLayer("dark")}
          className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeLayer === "dark"
              ? "bg-amber-500 text-slate-950 shadow-md font-bold"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          title="Modo Noturno / Analítico"
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Analítico</span>
        </button>
      </div>

      {/* Legenda de Identificação Inteligente */}
      <div className="absolute top-3 left-3 z-10 hidden sm:block bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-neutral-800/90 shadow-xl text-xs space-y-2 pointer-events-auto max-w-[260px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
            Identificação de Usinas
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
            {installations.length} usinas
          </span>
        </div>
        <div className="space-y-1.5 text-slate-700 dark:text-neutral-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span>Residencial Padrão</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span>Comercial / Alta Potência</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
            <span>Alvo Retrofit / Baterias (&gt;3 anos)</span>
          </div>
        </div>
      </div>

      {/* Card Flutuante de Detalhes da Usina Selecionada */}
      {selectedInstallation && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-10 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl p-4 rounded-2xl border border-amber-500/40 shadow-2xl space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Score Prospecção: {selectedInstallation.leadPotentialScore}%</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {selectedInstallation.holderName && selectedInstallation.holderName !== "***"
                  ? selectedInstallation.holderName
                  : `${selectedInstallation.neighborhood}, ${selectedInstallation.city}`}
              </h4>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                📍 {selectedInstallation.addressMasked}
              </p>
              {selectedInstallation.documentNumber &&
                selectedInstallation.documentNumber !== "***" && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                    CNPJ/CPF: {selectedInstallation.documentNumber}
                  </p>
                )}
            </div>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold px-2.5 py-1 rounded-lg text-sm border border-amber-500/20 whitespace-nowrap">
              {selectedInstallation.powerKwp} kWp
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-neutral-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800">
            <div>
              <span className="text-slate-500 dark:text-neutral-400">Concessionária:</span>
              <p
                className="font-semibold text-slate-900 dark:text-white truncate"
                title={selectedInstallation.distributor}
              >
                {selectedInstallation.distributor || "Local"}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400">Conectado há:</span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {selectedInstallation.yearsConnected} anos (
                {selectedInstallation.connectionDate.split("-")[0]})
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400">Módulos Estimados:</span>
              <p className="font-semibold text-slate-900 dark:text-white">
                ~{selectedInstallation.modulesCount} placas
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400">Geração / Economia:</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                R$ {selectedInstallation.estimatedMonthlySavingsBrl}/mês
              </p>
            </div>
          </div>

          {/* Links de Prospecção Rápida */}
          <div className="flex gap-2 text-xs">
            {selectedInstallation.holderName && selectedInstallation.holderName !== "***" && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${selectedInstallation.holderName} ${selectedInstallation.city}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                🔍 Buscar Empresa
              </a>
            )}
            {selectedInstallation.documentNumber &&
              selectedInstallation.documentNumber.length >= 14 && (
                <a
                  href={`https://cnpj.biz/${selectedInstallation.documentNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                >
                  🏢 Ver Sócios/CNPJ
                </a>
              )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
              Pitch Comercial Sugerido:
            </span>
            {selectedInstallation.recommendedPitch}
          </div>

          <Button
            onClick={() => {
              if (isLocked) {
                onLockedClick?.();
                return;
              }
              onOpenConvertModal(selectedInstallation);
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>
              {isLocked ? "Desbloquear Prospecção (Plano Pro)" : "Converter em Oportunidade no CRM"}
            </span>
          </Button>
        </div>
      )}

      {/* Overlay de Bloqueio Interativo para Planos sem Acesso Pro */}
      {isLocked && (
        <div
          onClick={onLockedClick}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 text-center cursor-pointer group transition-all"
        >
          <div className="max-w-md bg-white dark:bg-neutral-950/95 border border-amber-500/40 p-6 rounded-2xl shadow-2xl space-y-3.5 transform group-hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Navegação & Prospecção Bloqueadas
              </h3>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed mt-1">
                Você está no modo de demonstração do Radar Solar ANEEL. A navegação interativa no
                mapa, filtros por município e prospecção direta de usinas e vizinhança são
                exclusivas a partir do{" "}
                <strong className="text-amber-600 dark:text-amber-400">Plano Pro</strong>.
              </p>
            </div>
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLockedClick?.();
              }}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs h-9 px-5 rounded-xl shadow-md"
            >
              Desbloquear Radar Completo &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
