"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import Image from "next/image";

interface PanelData {
  id: number;
  title: string;
  badge: string;
  image: string;
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
    image: "/landing/demo.png", // Usando imagem de fallback disponível
    initialTransform: { x: -100, y: -80, rotate: -6 },
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 2,
    title: "Comercial",
    badge: "ANÁLISE TÉCNICA E TARIFA",
    image: "/landing/demo.png",
    initialTransform: { x: 100, y: -60, rotate: 4 },
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 3,
    title: "Usinas e Autoconsumo",
    badge: "CRIAÇÃO DE CENÁRIOS E ROI",
    image: "/landing/demo.png",
    initialTransform: { x: -80, y: 80, rotate: 5 },
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 4,
    title: "Operação no WhatsApp",
    badge: "CONVERSÃO EM TEMPO REAL",
    image: "/landing/demo.png",
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
      className={`group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl transition-all duration-300 hover:border-emerald-500/50 ${panel.className}`}
    >
      <div className="absolute inset-0 bg-slate-950/40 z-10 transition-colors group-hover:bg-transparent/20" />
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,rgba(0,0,0,0.8)_100%)] z-10 mix-blend-multiply" />
        <Image
          src={panel.image}
          alt={panel.title}
          fill
          className="object-cover opacity-60 transition-transform duration-700 ease-out group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] z-20 rounded-3xl group-hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] transition-shadow duration-500" />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 z-30 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <h3 className="text-2xl font-bold text-white sm:text-3xl">{panel.title}</h3>
        <p className="mt-2 text-xs font-semibold tracking-widest text-emerald-400 uppercase">
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
      className="relative overflow-hidden border-y border-slate-800 bg-[#060B11] px-4 py-24 sm:px-6 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.1),transparent_60%)]" />

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
