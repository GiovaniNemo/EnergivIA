import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  Img,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Scene5ClosingCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const ctaScale = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const bgScale = interpolate(frame, [0, 450], [1, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#070A12] text-white p-12 overflow-hidden select-none">
      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          transform: `scale(${bgScale})`,
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Áudio da Locutora para Cena 5 */}
      <Audio src={staticFile("audio/scene-5.mp3")} />

      <div
        style={{
          transform: `scale(${entrance})`,
          opacity: entrance,
        }}
        className="flex flex-col items-center max-w-4xl space-y-7 z-10 text-center"
      >
        {/* Logo Oficial Real da EnergivIA */}
        <div className="flex flex-col items-center space-y-2">
          <Img
            src={staticFile("logo-dark.png")}
            style={{ height: 68, width: "auto", objectFit: "contain" }}
          />
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            O Ecossistema Completo de Vendas & Gestão Solar
          </span>
        </div>

        {/* 3 Recursos Reais Unificados em Cards */}
        <div className="grid grid-cols-3 gap-4 w-full mt-1">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 text-left">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-1">
              01 • IA no WhatsApp
            </span>
            <p className="text-xs font-bold text-white">
              Leitura de Fatura Instantânea
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Extração técnica de consumo e cotação automática de kits.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 text-left">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block mb-1">
              02 • Propostas & Opcionais
            </span>
            <p className="text-xs font-bold text-white">
              Modelos 100% Editáveis
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Capas personalizadas e inclusão de opcionais de alta margem.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-4 text-left">
            <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-1">
              03 • CRM Especializado
            </span>
            <p className="text-xs font-bold text-white">
              Pipeline com Rastreamento
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Aviso em tempo real no exato instante em que o cliente abre a
              proposta.
            </p>
          </div>
        </div>

        {/* Chamada para Ação Final */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
            opacity: ctaScale,
          }}
          className="flex flex-col items-center space-y-3 pt-2"
        >
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 px-8 py-4 shadow-2xl shadow-emerald-600/30 flex items-center space-x-3 text-lg font-bold text-white">
            <span>Comece seu Teste Gratuito em energivia.com.br</span>
            <ArrowRight className="h-5 w-5 text-white" />
          </div>

          <div className="flex items-center space-x-6 text-xs font-mono text-slate-400 pt-1">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Sem necessidade de cartão inicial</span>
            </span>
            <span>•</span>
            <span>Ativação em menos de 3 minutos</span>
            <span>•</span>
            <span>Feito para integradores solares</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
