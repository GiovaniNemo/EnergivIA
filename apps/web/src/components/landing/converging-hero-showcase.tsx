"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FileText, MessageCircle, Zap } from "lucide-react";

export function ConvergingHeroShowcase() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-[1240px]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-[#f3f8f8] to-transparent" />

      <div className="relative flex items-center justify-center">
        {/* Painel Principal (Dashboard) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
          className="relative z-0"
        >
          <Image
            src="/landing/demo.webp"
            alt="Demonstração do painel da EnergivIA"
            width={1080}
            height={675}
            className="h-auto w-full object-contain drop-shadow-2xl"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1080px"
          />
        </motion.div>

        {/* Card Flutuante 1: IA & Leitura (Esquerda) */}
        <motion.div
          initial={{ opacity: 0, x: -100, y: -60, rotate: -15 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -6 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.6 }}
          className="absolute -left-4 top-1/4 z-20 flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-white/90 p-3 shadow-xl backdrop-blur-md sm:left-4 sm:p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Leitura com IA</p>
            <p className="text-sm font-bold text-slate-900">Extrato PDF</p>
          </div>
        </motion.div>

        {/* Card Flutuante 2: Fluxo WhatsApp (Direita Superior) */}
        <motion.div
          initial={{ opacity: 0, x: 100, y: -40, rotate: 15 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 6 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.8 }}
          className="absolute -right-2 top-1/3 z-20 flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-white/90 p-3 shadow-xl backdrop-blur-md sm:right-8 sm:p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Fluxo Comercial</p>
            <p className="text-sm font-bold text-slate-900">WhatsApp</p>
          </div>
        </motion.div>

        {/* Card Flutuante 3: Proposta Gerada (Baixo Direita) */}
        <motion.div
          initial={{ opacity: 0, x: 80, y: 80, rotate: 20 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -4 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 1 }}
          className="absolute -right-4 bottom-1/4 z-20 flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-white/90 p-3 shadow-xl backdrop-blur-md sm:right-12 sm:p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Documento Final</p>
            <p className="text-sm font-bold text-slate-900">Proposta Pronta</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
