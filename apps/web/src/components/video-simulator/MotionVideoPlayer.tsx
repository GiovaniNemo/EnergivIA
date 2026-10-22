"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  CheckCircle2,
  BellRing,
  Sun,
  ChevronRight,
  Sparkles,
  Smartphone,
  Tv,
} from "lucide-react";

import { BartSprite } from "./BartSprite";
import { useAudioFx } from "./useAudioFx";

// Duração total do vídeo: 32 segundos (ritmo dinâmico de alta conversão)
const TOTAL_DURATION_SEC = 32;

export function MotionVideoPlayer() {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const audioFx = useAudioFx(soundEnabled);
  const soundPlayedRef = useRef<{ [key: string]: boolean }>({});

  // Cenas baseadas no tempo contínuo (0 a 32s):
  // Cena 1 (0.0s - 5.5s): Hook - Pare de perder horas em planilhas
  // Cena 2 (5.5s - 11.5s): A Dor do Cliente & O Áudio no WhatsApp
  // Cena 3 (11.5s - 17.5s): O Cálculo Instantâneo do BART & Kits
  // Cena 4 (17.5s - 23.5s): Confirmação do Kit e Nome do Cliente
  // Cena 5 (23.5s - 28.5s): Proposta Web Aberta & Alerta de Visualização
  // Cena 6 (28.5s - 32.0s): CTA Final - Teste Gratuito no WhatsApp

  const currentScene =
    currentTime < 5.5
      ? 1
      : currentTime < 11.5
        ? 2
        : currentTime < 17.5
          ? 3
          : currentTime < 23.5
            ? 4
            : currentTime < 28.5
              ? 5
              : 6;

  // Triggers de som sincronizados com a timeline
  useEffect(() => {
    if (!soundEnabled) return;

    if (currentTime >= 0.2 && !soundPlayedRef.current["s1"]) {
      soundPlayedRef.current["s1"] = true;
      audioFx.playNotification();
    }
    if (currentTime >= 5.8 && !soundPlayedRef.current["s2_rec"]) {
      soundPlayedRef.current["s2_rec"] = true;
      audioFx.playRecordStart();
    }
    if (currentTime >= 9.0 && !soundPlayedRef.current["s2_sent"]) {
      soundPlayedRef.current["s2_sent"] = true;
      audioFx.playMessageSent();
    }
    if (currentTime >= 13.0 && !soundPlayedRef.current["s3_bot"]) {
      soundPlayedRef.current["s3_bot"] = true;
      audioFx.playMessageReceived();
    }
    if (currentTime >= 18.0 && !soundPlayedRef.current["s4_click"]) {
      soundPlayedRef.current["s4_click"] = true;
      audioFx.playKeyClick();
    }
    if (currentTime >= 23.5 && !soundPlayedRef.current["s5_success"]) {
      soundPlayedRef.current["s5_success"] = true;
      audioFx.playSuccessChime();
    }
    if (currentTime >= 25.5 && !soundPlayedRef.current["s5_alert"]) {
      soundPlayedRef.current["s5_alert"] = true;
      audioFx.playNotification();
    }
  }, [currentTime, soundEnabled, audioFx]);

  // Loop de Animação a 60fps usando requestAnimationFrame
  const updateLoop = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= TOTAL_DURATION_SEC) {
            // Loop do vídeo
            soundPlayedRef.current = {};
            return 0;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    },
    [isPlaying]
  );

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateLoop]);

  const handleTogglePlay = () => {
    lastTimeRef.current = null;
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    lastTimeRef.current = null;
    setCurrentTime(0);
    soundPlayedRef.current = {};
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    lastTimeRef.current = null;
    setCurrentTime(val);
    soundPlayedRef.current = {};
  };

  // Gravação de Tela nativa do elemento em WebM/MP4
  const startRecording = async () => {
    try {
      if (!videoContainerRef.current) return;
      setIsRecording(true);
      handleReset();

      // Solicita captura da aba para renderização 1080p perfeita
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: 60 },
        audio: false,
      });

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp9",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `energivIA-bart-motion-video-${aspectRatio.replace(":", "x")}.webm`;
        a.click();
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Para após o tempo do vídeo
      setTimeout(
        () => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            stream.getTracks().forEach((track) => track.stop());
          }
        },
        (TOTAL_DURATION_SEC + 1) * 1000
      );
    } catch {
      setIsRecording(false);
    }
  };

  const progressPercent = (currentTime / TOTAL_DURATION_SEC) * 100;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#070D18] text-white p-3 sm:p-6 overflow-hidden select-none font-plus-jakarta">
      {/* Luz Suave Arquitetônica de Estúdio (Sem Neon) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(14,38,80,0.45),transparent_75%)]" />

      {/* BARRA SUPERIOR DE CONTROLES DO PLAYER */}
      <div className="relative z-30 mb-4 flex w-full max-w-4xl items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E2650] border border-[#00D1FF]/40 text-white shadow-xs">
            <Sun className="h-4 w-4 text-[#00D1FF]" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Vídeo Motion: BART no WhatsApp</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300">
                Full 60fps
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Alta Conversão para Integradores • Duração: 00:32
            </p>
          </div>
        </div>

        {/* Formato 9:16 (Reels/WhatsApp) vs 16:9 (Cinema) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                aspectRatio === "9:16"
                  ? "bg-[#0E2650] text-[#00D1FF] shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>9:16 Reels</span>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio("16:9")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                aspectRatio === "16:9"
                  ? "bg-[#0E2650] text-[#00D1FF] shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>16:9 Widescreen</span>
            </button>
          </div>

          {/* Toggle Som */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
              soundEnabled
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                : "border-white/10 bg-slate-950 text-slate-500"
            }`}
            title={soundEnabled ? "Desativar Sons" : "Ativar Sons"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Botão Baixar Vídeo */}
          <button
            type="button"
            onClick={startRecording}
            disabled={isRecording}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all disabled:opacity-50"
            title="Grava a animação e baixa o arquivo de vídeo no seu computador"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isRecording ? "Gravando..." : "Baixar Vídeo (.webm)"}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TELA DE CINEMA / CONTAINER PRINCIPAL DO VÍDEO            */}
      {/* ======================================================== */}
      <div
        ref={videoContainerRef}
        className={`relative overflow-hidden rounded-3xl border-2 border-slate-700/60 bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] text-slate-900 shadow-[0_25px_70px_rgba(0,0,0,0.6)] transition-all duration-500 flex flex-col justify-between ${
          aspectRatio === "9:16"
            ? "w-[360px] h-[640px] sm:w-[390px] sm:h-[690px]"
            : "w-[720px] h-[405px] sm:w-[860px] sm:h-[484px]"
        }`}
      >
        {/* Barra de Progresso Cinética no Topo */}
        <div className="absolute top-0 inset-x-0 h-1 bg-slate-300/60 z-40">
          <div
            className="h-full bg-emerald-500 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Iluminação Estúdio Interna (Clean, sem Neon) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.9),transparent_60%)]" />

        {/* Topo do Vídeo: Logo e Tag Oficial */}
        <div className="relative z-30 flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-[#0E2650]">
              Energiv<span className="text-[#00D1FF]">IA</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">• Solar AI</span>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-slate-300/80 bg-white/90 px-2.5 py-0.5 shadow-xs text-[10px] font-bold text-[#0E2650]">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            <span>Fluxo WhatsApp em &lt; 2 min</span>
          </div>
        </div>

        {/* CORPO DINÂMICO DO VÍDEO (CENAS CINEMÁTICAS) */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-2 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ---------------------------------------------------- */}
            {/* CENA 1 (0.0s - 5.5s): O HOOK DE IMPACTO             */}
            {/* ---------------------------------------------------- */}
            {currentScene === 1 && (
              <motion.div
                key="scene-1"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col items-center text-center justify-center my-auto"
              >
                {/* Badge de dor */}
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-full bg-[#0E2650] text-[#00D1FF] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm"
                >
                  Chega de perder vendas
                </motion.div>

                {/* Letreiro Cinético de Alto Impacto */}
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-3 text-xl sm:text-2xl font-black text-[#0E2650] tracking-tight leading-tight uppercase max-w-[320px]"
                >
                  Quanto tempo você perde fazendo <br />
                  <span className="text-emerald-700 underline decoration-[#00D1FF] decoration-4">
                    cálculo e proposta?
                  </span>
                </motion.h2>

                {/* BART 3D Oficial entrando com mola suave */}
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.3 }}
                  className="my-3 flex items-center justify-center"
                >
                  <BartSprite pose="thumbs_up" size={aspectRatio === "9:16" ? 220 : 180} />
                </motion.div>

                {/* Benefício imediato */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-md max-w-[300px]"
                >
                  <p className="text-xs font-extrabold text-slate-800">
                    O BART entrega sua proposta pronta no WhatsApp em{" "}
                    <strong className="text-emerald-700">menos de 2 minutos</strong>.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* CENA 2 (5.5s - 11.5s): A DOR DO CLIENTE & O ÁUDIO   */}
            {/* ---------------------------------------------------- */}
            {currentScene === 2 && (
              <motion.div
                key="scene-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col items-center justify-center my-auto space-y-3"
              >
                {/* Notificação que cai no topo (O cliente cobrando) */}
                <motion.div
                  initial={{ opacity: 0, y: -40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full max-w-[320px] rounded-2xl border border-slate-300 bg-white p-3 shadow-lg flex items-center gap-3 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0E2650] text-[#00D1FF] font-bold text-xs">
                    M
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        Dr. Marcos (Cliente)
                      </span>
                      <span className="text-[9px] text-slate-400">agora</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      Consegue me mandar a proposta hoje ainda?
                    </p>
                  </div>
                </motion.div>

                {/* Letreiro Dinâmico */}
                <div className="text-center">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-[10px] font-extrabold uppercase">
                    No Trânsito ou na Obra
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-[#0E2650] mt-1">
                    Basta mandar um ÁUDIO para o BART:
                  </h3>
                </div>

                {/* Balão de Áudio no WhatsApp com Waveform */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-full max-w-[310px] rounded-2xl rounded-tr-xs bg-[#DCF8C6] p-3 shadow-md border border-emerald-300/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                      <Play className="h-4 w-4 fill-white ml-0.5" />
                    </div>
                    <div className="flex-1 flex items-center gap-1 h-6">
                      {[6, 14, 20, 10, 16, 24, 18, 22, 12, 18, 8, 20, 14, 9].map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [h, h * 1.3, h] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.05 }}
                          style={{ height: `${h}px` }}
                          className="w-1 rounded-full bg-emerald-700"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-emerald-950">0:05</span>
                  </div>

                  <div className="mt-2 rounded-lg bg-emerald-50/90 p-2 text-[11px] text-emerald-950 font-medium italic border border-emerald-200/80">
                    "Bart, cliente consome 950 kWh em Ribeirão Preto, telhado cerâmico, bifásico."
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* CENA 3 (11.5s - 17.5s): CÁLCULO E KITS EM SEGUNDOS  */}
            {/* ---------------------------------------------------- */}
            {currentScene === 3 && (
              <motion.div
                key="scene-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.45 }}
                className="w-full flex flex-col items-center justify-center my-auto space-y-2.5"
              >
                {/* Header da cena */}
                <div className="text-center">
                  <span className="rounded-full bg-[#0E2650] text-[#00D1FF] px-3 py-0.5 text-[10px] font-extrabold uppercase">
                    Inteligência Fotovoltaica
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#0E2650] mt-1">
                    Cálculo Exato & Kits dos Distribuidores
                  </h3>
                </div>

                {/* Balão do WhatsApp do BART */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="w-full max-w-[325px] rounded-2xl rounded-tl-xs bg-white p-3.5 shadow-lg border border-slate-200"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Dimensionamento Concluído (1.8s)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl mb-2">
                    <div>
                      📍 <strong>Ribeirão Preto/SP</strong>
                      <p className="text-[10px] text-slate-500">HSP: 5.12 kWh/m²</p>
                    </div>
                    <div className="text-right">
                      ⚡ Potência: <strong className="text-emerald-700">7.42 kWp</strong>
                      <p className="text-[10px] text-slate-500">Consumo: 950 kWh</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-50/50 p-2 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900">1️⃣ Kit Standard</strong>
                        <p className="text-[10px] text-slate-600">13 Módulos 575W + Inversor 6kW</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded shadow-xs">
                        Recomendado
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 text-[10px]">
                      <strong>2️⃣ Kit Premium:</strong> 14 Módulos 580W TOPCon
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* CENA 4 (17.5s - 23.5s): ESCOLHA DO KIT E NOME       */}
            {/* ---------------------------------------------------- */}
            {currentScene === 4 && (
              <motion.div
                key="scene-4"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.45 }}
                className="w-full flex flex-col items-center justify-center my-auto space-y-2.5"
              >
                <div className="text-center">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-[10px] font-extrabold uppercase">
                    Sem complicação
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#0E2650] mt-1">
                    Você escolhe o kit e digita o nome:
                  </h3>
                </div>

                <div className="w-full max-w-[310px] space-y-2">
                  {/* Integrador envia '1' */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-end"
                  >
                    <div className="rounded-2xl rounded-tr-xs bg-[#DCF8C6] px-4 py-1.5 text-xs font-bold text-slate-900 shadow-sm border border-emerald-200">
                      1
                    </div>
                  </motion.div>

                  {/* BART pergunta nome */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl rounded-tl-xs bg-white px-3.5 py-2 text-xs text-slate-800 shadow-sm border border-slate-200">
                      Qual o nome do seu cliente final?
                    </div>
                  </motion.div>

                  {/* Integrador envia nome */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-end"
                  >
                    <div className="rounded-2xl rounded-tr-xs bg-[#DCF8C6] px-4 py-2 text-xs font-bold text-slate-900 shadow-sm border border-emerald-200">
                      Dr. Marcos Rocha
                    </div>
                  </motion.div>
                </div>

                {/* BART ao lado confirmando */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 px-3.5 py-1.5 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700">
                    Gerando proposta comercial oficial...
                  </span>
                </motion.div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* CENA 5 (23.5s - 28.5s): PROPOSTA WEB & ALERTA REAL   */}
            {/* ---------------------------------------------------- */}
            {currentScene === 5 && (
              <motion.div
                key="scene-5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.45 }}
                className="w-full flex flex-col items-center justify-center my-auto space-y-2.5"
              >
                {/* Alerta em Tempo Real que Desce */}
                <motion.div
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full max-w-[325px] rounded-2xl border border-emerald-500/40 bg-emerald-950 text-white p-3 shadow-xl flex items-center gap-2.5 text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
                    <BellRing className="h-4 w-4 animate-bounce" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">
                      Alerta no WhatsApp
                    </p>
                    <p className="text-xs font-bold text-white truncate">
                      Dr. Marcos acabou de abrir sua proposta!
                    </p>
                  </div>
                </motion.div>

                {/* Card Editorial da Proposta Comercial Aberta */}
                <div className="w-full max-w-[325px] rounded-2xl border border-slate-300 bg-white p-3.5 shadow-lg text-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div>
                      <span className="text-[9px] font-bold bg-[#0E2650] text-white px-2 py-0.5 rounded">
                        PROPOSTA #PV-8942
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900 mt-1">
                        Dr. Marcos Rocha
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block uppercase">Potência</span>
                      <strong className="text-xs text-emerald-700">7.42 kWp</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 p-2 rounded-xl mb-2">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">
                        Economia Estimada
                      </span>
                      <strong className="text-emerald-700 font-bold">~R$ 910/mês</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">
                        Investimento
                      </span>
                      <strong className="text-[#0E2650] font-bold">R$ 26.800</strong>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50/80 p-2 text-[10px] font-semibold text-emerald-900 flex items-center justify-between">
                    <span>13 Módulos Tier 1 + Inversor 6kW</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* CENA 6 (28.5s - 32.0s): O CALL TO ACTION FINAL       */}
            {/* ---------------------------------------------------- */}
            {currentScene === 6 && (
              <motion.div
                key="scene-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="w-full flex flex-col items-center justify-center my-auto text-center space-y-3"
              >
                <div className="rounded-full bg-[#0E2650] text-[#00D1FF] px-4 py-1 text-xs font-extrabold uppercase tracking-wider">
                  EnergivIA • O Sol Que Potencia Sua Vida
                </div>

                <h2 className="text-2xl font-black text-[#0E2650] tracking-tight uppercase leading-tight max-w-[300px]">
                  Teste 3 Propostas <br />
                  <span className="text-emerald-700 underline decoration-[#00D1FF] decoration-4">
                    Gratuitas Agora
                  </span>
                </h2>

                {/* BART Comemorando */}
                <div className="flex items-center justify-center">
                  <BartSprite pose="acenando" size={aspectRatio === "9:16" ? 200 : 160} />
                </div>

                {/* Botão de Ação Imediata */}
                <div className="w-full max-w-[280px] rounded-2xl bg-[#0E2650] p-3 text-white shadow-xl flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase">
                      Sem instalar nada
                    </p>
                    <p className="text-xs font-black">Mande um "Oi" no WhatsApp</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-xs">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rodapé do Vídeo com Indicador de Cena e Barra de Progresso */}
        <div className="relative z-30 px-5 pb-3 pt-1 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between text-[10px] font-bold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Cena {currentScene} de 6: {currentScene === 1 && "O Problema"}
              {currentScene === 2 && "O Áudio"}
              {currentScene === 3 && "O Cálculo da IA"}
              {currentScene === 4 && "A Escolha do Kit"}
              {currentScene === 5 && "A Proposta & Alerta"}
              {currentScene === 6 && "Comece Grátis"}
            </span>
          </div>

          <span className="text-slate-500">
            00:{String(Math.floor(currentTime)).padStart(2, "0")} / 00:{TOTAL_DURATION_SEC}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA INFERIOR DE CONTROLE (TIMELINE & SCRUBBER)          */}
      {/* ======================================================== */}
      <div className="relative z-30 mt-4 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 backdrop-blur-md shadow-xl">
        {/* Scrubber do Tempo */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={TOTAL_DURATION_SEC}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-slate-700"
          />
        </div>

        {/* Botões Play / Pause / Reset e Saltos de Cena */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E2650] border border-[#00D1FF]/40 text-white shadow-sm hover:brightness-125 transition-all"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 fill-white ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              title="Reiniciar Vídeo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Marcadores de Cena Clicáveis */}
          <div className="flex items-center gap-1">
            {[
              { s: 1, t: 0, label: "Hook" },
              { s: 2, t: 5.6, label: "Áudio" },
              { s: 3, t: 11.6, label: "Cálculo" },
              { s: 4, t: 17.6, label: "Kit" },
              { s: 5, t: 23.6, label: "Proposta" },
              { s: 6, t: 28.6, label: "CTA" },
            ].map((scene) => (
              <button
                key={scene.s}
                type="button"
                onClick={() => {
                  setCurrentTime(scene.t);
                  soundPlayedRef.current = {};
                }}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                  currentScene === scene.s
                    ? "bg-emerald-500 text-slate-950 font-extrabold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {scene.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
