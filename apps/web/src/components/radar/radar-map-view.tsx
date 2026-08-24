import React, { useEffect, useRef, useState } from "react";
import { Sparkles, UserPlus, Satellite, Moon, Map as MapIcon } from "lucide-react";
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

// Configuração das camadas de alta qualidade
const TILE_LAYERS: Record<MapLayerType, { url: string; attribution?: string; maxZoom: number }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
  },
};

export function RadarMapView({
  installations,
  selectedInstallation,
  onSelectInstallation,
  onOpenConvertModal,
}: RadarMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const tileLayerRef = useRef<unknown>(null);
  const clusterGroupRef = useRef<LeafletClusterGroup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("dark");

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
          background: rgba(234, 179, 8, 0.25);
          border: 2px solid #eab308;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(234, 179, 8, 0.5);
          backdrop-filter: blur(4px);
        }
        .custom-cluster-marker-inner {
          background: #171717;
          color: #facc15;
          font-weight: 800;
          font-size: 12px;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(234, 179, 8, 0.4);
        }
        .custom-cluster-large {
          background: rgba(168, 85, 247, 0.25);
          border-color: #a855f7;
          box-shadow: 0 0 18px rgba(168, 85, 247, 0.6);
        }
        .custom-cluster-large .custom-cluster-marker-inner {
          color: #c084fc;
          border-color: rgba(168, 85, 247, 0.4);
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
    }) as LeafletMapInstance;
    map.setView([initialLat, initialLng], 13);

    // Controle de Zoom na direita
    if (typeof L["control"] === "object" || typeof L["control"] === "function") {
      const ctrl = (
        L["control"] as {
          zoom: (opts: Record<string, unknown>) => { addTo: (m: unknown) => unknown };
        }
      ).zoom({
        position: "bottomright",
      });
      ctrl.addTo(map);
    }

    // Camada inicial
    tileLayerRef.current = (
      L["tileLayer"] as (url: string, opts: Record<string, unknown>) => unknown
    )(TILE_LAYERS[activeLayer].url, {
      maxZoom: TILE_LAYERS[activeLayer].maxZoom,
      subdomains: "abcd",
    });
    (tileLayerRef.current as { addTo: (m: unknown) => unknown }).addTo(map);

    // MarkerClusterGroup com visual e zoom suave
    if (typeof L["markerClusterGroup"] === "function") {
      clusterGroupRef.current = L["markerClusterGroup"]({
        chunkedLoading: true, // Não trava o browser ao carregar 50.000 pontos
        maxClusterRadius: 45,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: { getChildCount: () => number }) => {
          const count = cluster.getChildCount();
          const isLarge = count >= 50;
          const size = isLarge ? 46 : 38;
          const innerSize = isLarge ? 38 : 30;

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

  // Altera o Tile Layer quando o usuário muda para Satélite / Escuro / Ruas
  const handleSwitchLayer = (layer: MapLayerType) => {
    setActiveLayer(layer);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const win = window as unknown as { L?: Record<string, (...args: unknown[]) => unknown> };
    const L = win.L;
    if (!L) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = (
      L["tileLayer"] as (url: string, opts: Record<string, unknown>) => unknown
    )(TILE_LAYERS[layer].url, {
      maxZoom: TILE_LAYERS[layer].maxZoom,
      subdomains: "abcd",
    });
    (tileLayerRef.current as { addTo: (m: unknown) => unknown }).addTo(mapInstanceRef.current);
  };

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

      const bgColor = isUpgrade
        ? "#a855f7" // Roxo Retrofit
        : isCommercial
          ? "#3b82f6" // Azul Comercial
          : "#f59e0b"; // Âmbar Residencial

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
          box-shadow: 0 0 12px ${bgColor}aa, 0 3px 6px rgba(0,0,0,0.5);
          border: 2px solid ${isSelected ? "#ffffff" : "rgba(255,255,255,0.85)"};
          cursor: pointer;
          transform: ${isSelected ? "scale(1.15)" : "scale(1)"};
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
    <div className="relative w-full h-[600px] lg:h-[700px] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Alternador de Camadas (Satélite / Dark / Ruas) */}
      <div className="absolute top-4 right-4 z-10 flex items-center bg-neutral-950/90 backdrop-blur-md p-1 rounded-xl border border-neutral-800 shadow-2xl pointer-events-auto">
        <button
          type="button"
          onClick={() => handleSwitchLayer("dark")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeLayer === "dark"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Modo Noturno / Análise EnergivIA"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Analítico</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchLayer("satellite")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeLayer === "satellite"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Satélite Alta Resolução (Identificação de Telhados)"
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>Satélite HD</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchLayer("streets")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeLayer === "streets"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
          title="Ruas e Bairros"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Ruas</span>
        </button>
      </div>

      {/* Legenda de Identificação Inteligente */}
      <div className="absolute top-4 left-4 z-10 bg-neutral-950/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-neutral-800/90 shadow-2xl text-xs space-y-2 pointer-events-auto max-w-[260px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            Identificação de Usinas
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
            {installations.length} usinas
          </span>
        </div>
        <div className="space-y-1.5 text-neutral-300 text-xs">
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
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-10 bg-neutral-950/95 backdrop-blur-xl p-4 rounded-2xl border border-amber-500/30 shadow-2xl space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Score Prospecção: {selectedInstallation.leadPotentialScore}%</span>
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">
                {selectedInstallation.neighborhood}, {selectedInstallation.city}
              </h4>
            </div>
            <span className="bg-amber-500/10 text-amber-400 font-mono font-bold px-2.5 py-1 rounded-lg text-sm border border-amber-500/20">
              {selectedInstallation.powerKwp} kWp
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
            <div>
              <span className="text-neutral-400">Conexão ANEEL:</span>
              <p className="font-semibold text-white">
                {selectedInstallation.yearsConnected} anos atrás
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Geração Estimada:</span>
              <p className="font-semibold text-emerald-400">
                ~{selectedInstallation.estimatedMonthlyGenKwh} kWh/mês
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Módulos:</span>
              <p className="font-semibold text-white">
                ~{selectedInstallation.modulesCount} placas
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Economia Gerada:</span>
              <p className="font-semibold text-emerald-400">
                R$ {selectedInstallation.estimatedMonthlySavingsBrl}/mês
              </p>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/15 p-2.5 rounded-xl text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-400 block mb-0.5">
              Pitch Comercial Sugerido:
            </span>
            {selectedInstallation.recommendedPitch}
          </div>

          <Button
            onClick={() => onOpenConvertModal(selectedInstallation)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Converter em Oportunidade no CRM</span>
          </Button>
        </div>
      )}
    </div>
  );
}
