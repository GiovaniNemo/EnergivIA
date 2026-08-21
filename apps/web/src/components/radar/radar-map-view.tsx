"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, UserPlus } from "lucide-react";
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

interface LeafletGlobal {
  map: (
    elem: HTMLElement,
    opts?: Record<string, unknown>
  ) => {
    setView: (center: [number, number], zoom: number) => unknown;
    remove: () => void;
    fitBounds: (bounds: [number, number][], opts?: Record<string, unknown>) => void;
  };
  tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (map: unknown) => unknown };
  layerGroup: () => {
    addTo: (map: unknown) => unknown;
    clearLayers: () => void;
    addLayer: (layer: unknown) => void;
  };
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (
    latlng: [number, number],
    opts?: Record<string, unknown>
  ) => {
    on: (event: string, fn: () => void) => void;
    bindTooltip: (content: string, opts?: Record<string, unknown>) => void;
  };
}

export function RadarMapView({
  installations,
  selectedInstallation,
  onSelectInstallation,
  onOpenConvertModal,
}: RadarMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<LeafletGlobal["map"]> | null>(null);
  const markersLayerRef = useRef<ReturnType<LeafletGlobal["layerGroup"]> | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Carrega CSS e JS do Leaflet dinamicamente para garantir compatibilidade SSR no Next.js
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Injeta Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Injeta Leaflet JS
    const win = window as unknown as { L?: LeafletGlobal };
    if (!win.L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  // Inicializa o mapa quando Leaflet e container estiverem prontos
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const win = window as unknown as { L?: LeafletGlobal };
    const L = win.L;
    if (!L) return;

    const initialLat = installations[0]?.latitude ?? -23.55052;
    const initialLng = installations[0]?.longitude ?? -46.633308;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    map.setView([initialLat, initialLng], 13);

    // Tiles CartoDB Dark / Voyager modernos para estética futurista de energia
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    markersLayerRef.current = L.layerGroup();
    markersLayerRef.current.addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapLoaded]);

  // Atualiza marcadores quando a lista de usinas muda
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const win = window as unknown as { L?: LeafletGlobal };
    const L = win.L;
    if (!L) return;

    markersLayerRef.current.clearLayers();

    if (installations.length === 0) return;

    const bounds: [number, number][] = [];

    installations.forEach((item) => {
      bounds.push([item.latitude, item.longitude]);

      const isUpgrade = item.opportunityType === "UPGRADE_BATTERY";
      const isCommercial = item.classType === "COMMERCIAL" || item.classType === "INDUSTRIAL";
      const isSelected = selectedInstallation?.id === item.id;

      const bgColor = isUpgrade
        ? "#a855f7" // Roxo
        : isCommercial
          ? "#3b82f6" // Azul
          : "#f59e0b"; // Âmbar solar

      const size = isSelected ? 36 : 28;

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
          font-weight: 700;
          box-shadow: 0 0 14px ${bgColor}88, 0 4px 6px rgba(0,0,0,0.3);
          border: 2px solid #ffffff;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ⚡
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-solar-pin",
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });

      marker.on("click", () => {
        onSelectInstallation(item);
      });

      marker.bindTooltip(
        `<b>${item.powerKwp} kWp</b> - ${item.neighborhood} (${item.yearsConnected} anos)`,
        { direction: "top", offset: [0, -10] }
      );

      markersLayerRef.current.addLayer(marker);
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [installations, selectedInstallation, mapLoaded]);

  return (
    <div className="relative w-full h-[600px] lg:h-[680px] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Legenda de cores flutuante no topo do mapa */}
      <div className="absolute top-4 left-4 z-10 bg-neutral-950/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-neutral-800/90 shadow-xl text-xs space-y-1.5 pointer-events-auto">
        <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
          Identificação de Usinas
        </div>
        <div className="flex items-center gap-2 text-neutral-300">
          <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span>Residencial Padrão</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-300">
          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          <span>Comercial / Alta Potência</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-300">
          <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
          <span>Alvo Retrofit / Baterias (&gt;3 anos)</span>
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
