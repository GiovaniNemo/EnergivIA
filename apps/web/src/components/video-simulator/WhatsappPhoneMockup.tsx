"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  CheckCheck,
  Play,
  ExternalLink,
  Sun,
} from "lucide-react";

export interface WhatsappPhoneMockupProps {
  currentStep: number; // 0 a 7
  onOpenProposalPreview?: () => void;
}

export function WhatsappPhoneMockup({
  currentStep,
  onOpenProposalPreview,
}: WhatsappPhoneMockupProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll suave para o final do chat a cada novo passo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentStep]);

  return (
    <div className="relative mx-auto flex h-[680px] w-[350px] sm:w-[380px] flex-col overflow-hidden rounded-[48px] border-[10px] border-slate-900 bg-[#EFEAE2] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] select-none">
      {/* Dynamic Island / Câmera Superior */}
      <div className="absolute left-1/2 top-2.5 z-40 h-5 w-28 -translate-x-1/2 rounded-full bg-slate-950 flex items-center justify-end px-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
      </div>

      {/* Header do WhatsApp Business */}
      <div className="z-30 flex items-center justify-between border-b border-[#075E54]/20 bg-[#075E54] pt-8 pb-3 px-3.5 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <ChevronLeft className="h-5 w-5 text-white/90" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white p-0.5 shadow-sm">
            {/* Avatar do BART no Header */}
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0E2650] text-xs font-bold text-white">
              <span className="text-[#00D1FF] font-extrabold text-sm">B</span>
            </div>
            {/* Ponto verde de status Online */}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>

          <div className="leading-tight">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <span>BART • EnergivIA</span>
              <span className="rounded bg-emerald-600/60 px-1 py-0.2 text-[9px] font-semibold tracking-wide uppercase">
                Oficial
              </span>
            </h2>
            <p className="text-[11px] text-emerald-100 flex items-center gap-1">
              <span>online • resposta em segundos</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-white/90">
          <Video className="h-4 w-4" />
          <Phone className="h-4 w-4" />
          <MoreVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Área de Conversa do WhatsApp (Feed com Scroll Suave) */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto p-3 space-y-3 bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {/* Carimbo de Criptografia do WhatsApp */}
        <div className="mx-auto my-1 flex max-w-[280px] items-center justify-center rounded-lg bg-amber-100/80 px-2 py-1 text-center shadow-xs">
          <p className="text-[10px] text-amber-900 leading-tight">
            🔒 As mensagens são protegidas com criptografia de ponta a ponta.
          </p>
        </div>

        {/* 1. MENSAGEM DO PROSPECT (HOOK) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-start"
        >
          <div className="max-w-[85%] rounded-2xl rounded-tl-xs bg-white p-3 shadow-xs text-slate-800 border border-slate-200/50">
            <p className="text-[11px] font-bold text-emerald-800">Dr. Marcos Rocha (Cliente)</p>
            <p className="text-xs mt-0.5 text-slate-700">
              Consegue me passar o orçamento do sistema solar da minha casa ainda hoje?
            </p>
            <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
              <span>10:14</span>
            </div>
          </div>
        </motion.div>

        {/* 2. ÁUDIO GRAVADO E ENVIADO PELO INTEGRADOR */}
        {currentStep >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex justify-end"
          >
            <div className="max-w-[88%] rounded-2xl rounded-tr-xs bg-[#DCF8C6] p-3 shadow-xs text-slate-800 border border-emerald-200/60">
              {/* Player de Áudio do WhatsApp */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                  <Play className="h-4 w-4 fill-white ml-0.5" />
                </div>
                {/* Waveform animada */}
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {[4, 12, 18, 8, 14, 22, 16, 20, 10, 15, 6, 18, 12, 7].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}px` }}
                      className={`w-1 rounded-full ${i < 6 ? "bg-emerald-600" : "bg-emerald-400/50"}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-emerald-900">0:05</span>
              </div>

              {/* Transcrição da fala */}
              <div className="mt-2 rounded-lg bg-emerald-50/80 p-2 text-[11px] text-emerald-950 border border-emerald-100">
                <p className="italic">
                  "Bart, cliente consome 950 kWh em Ribeirão Preto, telhado cerâmico, bifásico."
                </p>
              </div>

              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                <span>10:15</span>
                <CheckCheck className="h-3.5 w-3.5 text-cyan-600" />
              </div>
            </div>
          </motion.div>
        )}

        {/* INDICADOR DE DIGITAÇÃO DO BOT (Quando calculando) */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start items-center gap-2 text-xs text-slate-500 italic pl-1"
          >
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>BART está dimensionando...</span>
          </motion.div>
        )}

        {/* 3. RESPOSTA DO BART COM DIMENSIONAMENTO E KITS */}
        {currentStep >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex justify-start"
          >
            <div className="max-w-[92%] rounded-2xl rounded-tl-xs bg-white p-3 shadow-xs text-slate-800 border border-slate-200/70">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Dimensionamento Solar Concluído!</span>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug">
                📍 <strong>Ribeirão Preto/SP</strong> (HSP: 5.12 kWh/m²)
                <br />⚡ Potência Estimada: <strong className="text-emerald-700">7.42 kWp</strong>
              </p>

              <div className="mt-2.5 space-y-1.5 text-[11px]">
                <p className="font-semibold text-slate-700">Selecione o kit ideal:</p>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 leading-tight">
                  <strong className="text-slate-900">1️⃣ Kit Standard</strong>
                  <p className="text-slate-600 mt-0.5">13 Módulos 575W + Inversor 6kW</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 leading-tight">
                  <strong className="text-slate-900">2️⃣ Kit Premium</strong>
                  <p className="text-slate-600 mt-0.5">14 Módulos 580W + Microinversores</p>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-500 italic">
                Responda com 1 ou 2 para prosseguir.
              </p>

              <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                <span>10:15</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. SELEÇÃO DO INTEGRADOR E NOME DO CLIENTE */}
        {currentStep >= 4 && (
          <>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-end"
            >
              <div className="rounded-2xl rounded-tr-xs bg-[#DCF8C6] px-3 py-1.5 shadow-xs text-xs font-bold text-slate-800">
                1
                <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500">
                  <CheckCheck className="h-3 w-3 text-cyan-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl rounded-tl-xs bg-white px-3 py-2 shadow-xs text-xs text-slate-800 border border-slate-200/50">
                Qual o nome do seu cliente final?
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-end"
            >
              <div className="rounded-2xl rounded-tr-xs bg-[#DCF8C6] px-3.5 py-1.5 shadow-xs text-xs font-bold text-slate-900">
                Dr. Marcos Rocha
                <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500">
                  <CheckCheck className="h-3 w-3 text-cyan-600" />
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* 5. ENTREGA DA PROPOSTA COMERCIAL PELO BART */}
        {currentStep >= 5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="flex justify-start"
          >
            <div className="max-w-[95%] rounded-2xl rounded-tl-xs bg-white p-3.5 shadow-md text-slate-800 border-2 border-emerald-500/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <span>Proposta Comercial Gerada! 📋</span>
              </div>

              <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[11px] space-y-1 border border-slate-100">
                <p>
                  👤 Cliente: <strong>Dr. Marcos Rocha</strong>
                </p>
                <p>
                  ⚡ Potência: <strong>7.42 kWp</strong>
                </p>
                <p>
                  💰 Valor Total:{" "}
                  <strong className="text-emerald-700 font-bold">R$ 26.800,00</strong>
                </p>
              </div>

              {/* Botão de abrir proposta */}
              <button
                type="button"
                onClick={onOpenProposalPreview}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0E2650] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#153468] transition-colors"
              >
                <span>Ver Proposta do Cliente</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              <div className="mt-2 rounded-lg bg-emerald-50/60 p-2 text-[10px] text-emerald-900 border border-emerald-100/70">
                👉 <em>Mensagem pronta para encaminhar com 1 clique pro WhatsApp do cliente!</em>
              </div>

              <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                <span>10:16</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Barra Inferior de Entrada do WhatsApp */}
      <div className="z-30 flex items-center gap-2 border-t border-slate-200 bg-[#F0F2F5] px-2.5 py-2">
        <Smile className="h-5 w-5 text-slate-500" />
        <Paperclip className="h-5 w-5 text-slate-500" />

        <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-xs text-slate-500 shadow-inner">
          {currentStep === 1 ? (
            <span className="text-emerald-600 font-medium animate-pulse">
              Gravando áudio (0:05)...
            </span>
          ) : (
            "Mensagem"
          )}
        </div>

        {/* Botão de Microfone com Animação Fluida se estiver Gravando */}
        <div className="relative">
          {currentStep === 1 && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute inset-0 rounded-full bg-emerald-500"
            />
          )}
          <button
            type="button"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm ${
              currentStep === 1 ? "bg-red-500" : "bg-[#075E54]"
            }`}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
