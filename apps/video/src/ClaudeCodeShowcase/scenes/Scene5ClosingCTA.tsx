import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";
import { BrandBadge } from "../components/BrandBadge";
import {
  MessageSquare,
  Layers,
  Users,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const Scene5ClosingCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const ctaScale = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#070A12] text-white p-12 overflow-hidden select-none">
      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
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
        className="flex flex-col items-center max-w-5xl space-y-8 z-10 text-center"
      >
        {/* Brand Badge Hero */}
        <BrandBadge
          size="lg"
          subtitle="O Ecossistema Completo de Vendas & Gestão Solar"
        />

        {/* Os 3 Pilares Unificados */}
        <div className="grid grid-cols-3 gap-5 w-full mt-2">
          {/* Pilar 1 */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1220]/90 p-5 text-left space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-100">
              WhatsApp com IA
            </h4>
            <p className="text-xs text-slate-400">
              Leitura imediata de faturas e dimensionamento técnico autônomo.
            </p>
          </div>

          {/* Pilar 2 */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1220]/90 p-5 text-left space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/40">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-100">
              Estúdio de Propostas
            </h4>
            <p className="text-xs text-slate-400">
              Templates modernos, capas personalizadas e opcionais de alta
              margem.
            </p>
          </div>

          {/* Pilar 3 */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1220]/90 p-5 text-left space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-950/80 text-sky-400 border border-sky-800/40">
              <Users className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-100">CRM Dedicado</h4>
            <p className="text-xs text-slate-400">
              Funil visual de vendas e rastreamento de abertura em tempo real.
            </p>
          </div>
        </div>

        {/* Chamada para Ação Final */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
            opacity: ctaScale,
          }}
          className="flex flex-col items-center space-y-4 pt-4"
        >
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 px-8 py-4 shadow-2xl shadow-emerald-600/30 flex items-center space-x-3 text-lg font-bold text-white">
            <span>Comece seu Teste Gratuito em energivia.com.br</span>
            <ArrowRight className="h-5 w-5 text-white" />
          </div>

          <div className="flex items-center space-x-6 text-xs font-mono text-slate-400 pt-1">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Sem cartão de crédito inicial</span>
            </span>
            <span>•</span>
            <span>Setup rápido em 3 minutos</span>
            <span>•</span>
            <span>Suporte humanizado para integradores</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
