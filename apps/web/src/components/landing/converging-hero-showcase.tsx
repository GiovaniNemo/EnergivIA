"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Image from "next/image";
import { Sun, CheckCircle2, Zap, FileCheck2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export function ConvergingHeroShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll-driven 3D perspective animation
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  const rotateX = useTransform(smoothProgress, [0, 1], [8, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.93, 1]);
  const opacity = useTransform(smoothProgress, [0, 0.35, 1], [0.75, 0.95, 1]);
  const y = useTransform(smoothProgress, [0, 1], [40, 0]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mt-6 w-full max-w-[1200px] px-2 sm:px-4"
      style={{ perspective: 1200 }}
    >
      {/* Warm solar sunbeam radiance behind the platform */}
      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-44 w-3/4 max-w-2xl rounded-full bg-gradient-to-b from-amber-400/20 via-emerald-400/10 to-transparent blur-3xl" />

      {/* Floating Card Left: IA & Leitura de Fatura */}
      <motion.div
        initial={{ opacity: 0, x: -50, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.3 }}
        className="hidden lg:flex absolute -left-6 top-1/4 z-30 flex-col gap-1 rounded-2xl border border-amber-400/40 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Leitura com IA
            </p>
            <p className="text-sm font-bold text-white">Extrato PDF Analisado</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Consumo e dados extraídos em 2s</span>
        </div>
      </motion.div>

      {/* Floating Card Right Top: Fluxo Comercial WhatsApp */}
      <motion.div
        initial={{ opacity: 0, x: 50, y: -20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.5 }}
        className="hidden lg:flex absolute -right-6 top-1/5 z-30 flex-col gap-1 rounded-2xl border border-emerald-400/40 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <FaWhatsapp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Fluxo no WhatsApp
            </p>
            <p className="text-sm font-bold text-white">Proposta Pronta para Envio</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-300 font-medium">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Com simulação e kit comercial</span>
        </div>
      </motion.div>

      {/* Floating Card Right Bottom: Simulação Fotovoltaica */}
      <motion.div
        initial={{ opacity: 0, x: 50, y: 40 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.7 }}
        className="hidden xl:flex absolute -right-4 bottom-8 z-30 flex-col gap-1 rounded-2xl border border-amber-400/30 bg-slate-900/90 p-3.5 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
            <FileCheck2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Resultado Comercial
            </p>
            <p className="text-xs font-bold text-white">Payback & ROI Calculados</p>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* AUTHENTIC PLATFORM SHOWCASE (demo.webp)                        */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        style={{
          rotateX,
          scale,
          opacity,
          y,
          transformStyle: "preserve-3d",
        }}
        className="relative mx-auto flex items-center justify-center filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
      >
        <Image
          src="/landing/demo.webp"
          alt="Painel real da plataforma EnergivIA"
          width={1120}
          height={700}
          className="h-auto w-full object-contain"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1120px"
        />
      </motion.div>
    </div>
  );
}
