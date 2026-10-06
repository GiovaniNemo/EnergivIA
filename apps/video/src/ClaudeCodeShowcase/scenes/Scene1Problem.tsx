import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { TerminalPrompt } from "../components/TerminalPrompt";
import { BrandBadge } from "../components/BrandBadge";
import { AlertCircle, Clock, ZapOff } from "lucide-react";

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transição de revelação da marca no final da cena (a partir do frame 240)
  const showBrand = frame >= 240;
  const brandEntrance = spring({
    frame: Math.max(0, frame - 240),
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const terminalOpacity = interpolate(frame, [230, 255], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#070A12] text-white p-12 overflow-hidden select-none">
      {/* Grid sutil de fundo estilo Claude Code */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Áudio da Locutora para Cena 1 */}
      <Audio src={staticFile("audio/scene-1.mp3")} />

      {/* Bloco 1: A Dor das Ferramentas Fragmentadas */}
      <div
        style={{ opacity: terminalOpacity }}
        className="w-full max-w-4xl flex flex-col items-center space-y-8 z-10"
      >
        <div className="flex items-center space-x-2 rounded-full border border-rose-500/30 bg-rose-950/20 px-4 py-1.5 text-xs font-mono text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <span>O GARGALO DE VENDAS DO INTEGRADOR SOLAR</span>
        </div>

        <TerminalPrompt
          prefix=">"
          command="planilhas-manuais + crm-avulso + pdf-estatico --status"
          startFrame={8}
          charsPerFrame={1.4}
          statusLines={[
            {
              type: "warning",
              text: "Tempo médio para montar proposta manual: 2 a 4 horas",
              delayFrames: 45,
            },
            {
              type: "warning",
              text: "64% dos clientes solares fecham com quem responde primeiro",
              delayFrames: 85,
            },
            {
              type: "warning",
              text: "Leads e contatos perdidos em conversas desorganizadas de WhatsApp",
              delayFrames: 125,
            },
          ]}
          className="w-full"
        />

        {/* Badges de Dor em Stagger */}
        <div className="grid grid-cols-3 gap-4 w-full pt-2">
          <div
            style={{
              opacity: interpolate(frame, [50, 70], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
            className="flex items-center space-x-3 rounded-2xl border border-slate-800 bg-[#0C1220] p-4"
          >
            <Clock className="h-6 w-6 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-slate-200">Demora Crítica</p>
              <p className="text-[11px] text-slate-400">
                Cliente esfria e busca concorrente
              </p>
            </div>
          </div>

          <div
            style={{
              opacity: interpolate(frame, [90, 110], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
            className="flex items-center space-x-3 rounded-2xl border border-slate-800 bg-[#0C1220] p-4"
          >
            <ZapOff className="h-6 w-6 text-rose-400" />
            <div>
              <p className="text-xs font-bold text-slate-200">Erros Manuais</p>
              <p className="text-[11px] text-slate-400">
                Dimensionamento e margem imprecisos
              </p>
            </div>
          </div>

          <div
            style={{
              opacity: interpolate(frame, [130, 150], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
            className="flex items-center space-x-3 rounded-2xl border border-slate-800 bg-[#0C1220] p-4"
          >
            <AlertCircle className="h-6 w-6 text-purple-400" />
            <div>
              <p className="text-xs font-bold text-slate-200">Sem Controle</p>
              <p className="text-[11px] text-slate-400">
                Sem saber se a proposta foi aberta
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Revelação da Solução - EnergivIA */}
      {showBrand && (
        <div
          style={{
            transform: `scale(${brandEntrance})`,
            opacity: brandEntrance,
          }}
          className="absolute inset-0 flex flex-col items-center justify-center space-y-6 z-20 bg-[#070A12]"
        >
          <BrandBadge
            size="lg"
            subtitle="A Solução Definitiva em Inteligência Solar"
          />
          <p className="max-w-xl text-center text-lg text-slate-300 font-light leading-relaxed">
            Um único ecossistema conectando{" "}
            <strong className="text-emerald-400 font-semibold">
              WhatsApp com IA
            </strong>
            ,{" "}
            <strong className="text-purple-400 font-semibold">
              Estúdio de Propostas
            </strong>{" "}
            e <strong className="text-sky-400 font-semibold">CRM Solar</strong>{" "}
            em tempo real.
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};
