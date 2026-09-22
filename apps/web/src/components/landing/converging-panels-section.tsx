"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { MockProposalPreview, type ProposalMockType } from "./mock-proposal-previews";

interface PanelData {
  id: number;
  title: string;
  badge: string;
  mockType: ProposalMockType;
  clientName: string;
  initialTransform: { x: number; y: number; rotate: number };
  className: string;
}

interface PanelCardProps {
  panel: PanelData;
  smoothProgress: MotionValue<number>;
  opacity: MotionValue<number>;
}

const panels: PanelData[] = [
  {
    id: 1,
    title: "Residencial",
    badge: "PROPOSTAS EM MINUTOS",
    mockType: "residential",
    clientName: "Residencial Família Santana",
    initialTransform: { x: -100, y: -80, rotate: -6 },
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 2,
    title: "Comercial",
    badge: "ANÁLISE TÉCNICA E TARIFA",
    mockType: "commercial",
    clientName: "Supermercado Central",
    initialTransform: { x: 100, y: -60, rotate: 4 },
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 3,
    title: "Usinas e Autoconsumo",
    badge: "CRIAÇÃO DE CENÁRIOS E ROI",
    mockType: "usinas",
    clientName: "Usina Solar Horizonte",
    initialTransform: { x: -80, y: 80, rotate: 5 },
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 4,
    title: "Operação no WhatsApp",
    badge: "CONVERSÃO EM TEMPO REAL",
    mockType: "whatsapp",
    clientName: "Dr. Marcos Silveira",
    initialTransform: { x: 90, y: 100, rotate: -4 },
    className: "md:col-span-1 md:row-span-1",
  },
];

function PanelCard({ panel, smoothProgress, opacity }: PanelCardProps) {
  const x = useTransform(smoothProgress, [0, 1], [panel.initialTransform.x, 0]);
  const y = useTransform(smoothProgress, [0, 1], [panel.initialTransform.y, 0]);
  const rotate = useTransform(smoothProgress, [0, 1], [panel.initialTransform.rotate, 0]);

  return (
    <motion.article
      style={{ x, y, rotate, opacity }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-[#070b14]/90 shadow-2xl transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_35px_rgba(56,189,248,0.15)] ${panel.className}`}
    >
      <div className="relative h-[380px] sm:h-[410px] w-full overflow-hidden bg-[#03060c] p-2.5 sm:p-3 pb-20 sm:pb-24">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]">
          <MockProposalPreview type={panel.mockType} clientName={panel.clientName} />
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] group-hover:shadow-[inset_0_0_24px_rgba(56,189,248,0.15)] transition-shadow duration-500" />
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 w-full p-5 sm:p-7 z-30 bg-gradient-to-t from-[#03060c] via-[#03060c]/90 to-transparent">
        <h3 className="text-xl font-bold text-white sm:text-2xl">{panel.title}</h3>
        <p className="mt-1 text-xs font-semibold tracking-widest text-cyan-400 uppercase">
          {panel.badge}
        </p>
      </div>
    </motion.article>
  );
}

export function ConvergingPanelsSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.001,
  });

  const opacity = useTransform(smoothProgress, [0, 0.6, 1], [0, 0.8, 1]);
  const scale = useTransform(smoothProgress, [0, 1], [0.9, 1]);

  return (
    <section
      id="cenarios"
      ref={containerRef}
      className="relative overflow-hidden border-y border-white/5 bg-[#02040a] px-4 py-24 sm:px-6 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <motion.div style={{ opacity, y: useTransform(smoothProgress, [0, 1], [50, 0]) }}>
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Cenários Ilimitados
            </h2>
            <p className="mt-6 text-lg text-slate-400">
              Da residência à usina de investimento, nossas soluções se adaptam a qualquer modelo de
              negócio com performance excepcional.
            </p>
          </motion.div>
        </div>

        <motion.div className="grid gap-6 md:grid-cols-2 lg:gap-8" style={{ scale }}>
          {panels.map((panel) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              smoothProgress={smoothProgress}
              opacity={opacity}
              scale={scale}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
