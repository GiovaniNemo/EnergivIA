"use client";

import React from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu,
  Scan,
  Send,
  TrendingUp,
  FileCheck,
  ChevronDown,
  Layers,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { LandingNavbar } from "@/components/landing-v2/landing-navbar";
import { HeroCanvasBackground } from "@/components/landing-v2/hero-canvas-background";
import { ScrollPinnedPipeline } from "@/components/landing-v2/scroll-pinned-pipeline";
import { InteractiveSolarSim } from "@/components/landing-v2/interactive-solar-sim";
import { MagneticFeatureCard } from "@/components/landing-v2/magnetic-feature-card";
import { ComparisonMatrix } from "@/components/landing-v2/comparison-matrix";
import { LiveTelemetryStats } from "@/components/landing-v2/live-telemetry-stats";
import { FAQAccordion } from "@/components/landing-v2/faq-accordion";
import { LandingFooter } from "@/components/landing-v2/landing-footer";

const appLoginUrl = "/login";
const demoWhatsappUrl =
  "https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergiVIA.%20Acredito%20que%20o%20produto%20de%20voc%C3%AAs%20%C3%A9%20incr%C3%ADvel%20e%20vai%20fazer%20a%20diferen%C3%A7a.%20Quando%20podemos%20conversar%3F";

export function LandingHomeClient(): JSX.Element {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-slate-950 antialiased overflow-x-hidden">
      {/* Top Navbar */}
      <LandingNavbar />

      {/* ======================================================== */}
      {/* HERO SECTION WITH DYNAMIC INTERACTIVE CANVAS            */}
      {/* ======================================================== */}
      <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Mouse-reactive particle canvas */}
        <HeroCanvasBackground />

        {/* Top ambient glow */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-cyan-500/15 blur-[160px]" />

        <div className="relative z-10 mx-auto max-w-5xl text-center space-y-8">
          {/* High-tech status pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/80 px-4 py-1.5 text-xs font-mono backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">EnergivIA Engine v2.4</span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400 font-semibold">IA para Integradores Solares</span>
          </div>

          {/* Kinetic Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08]">
            Propostas solares em{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 drop-shadow-[0_0_35px_rgba(16,185,129,0.3)]">
              segundos
            </span>
            .<br className="hidden sm:inline" /> Vendas fechadas no WhatsApp.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-xl text-slate-400 leading-relaxed">
            Elimine planilhas manuais e horas de dimensionamento. Envie a conta de luz, receba o
            arranjo fotovoltaico otimizado e envie uma proposta 3D interativa para o cliente antes
            de todo mundo.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={appLoginUrl}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 px-8 py-4 text-sm font-bold text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(16,185,129,0.7)]"
            >
              <Sparkles className="h-4 w-4 text-slate-950 transition-transform group-hover:rotate-12" />
              <span>Criar Conta Gratuita</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={demoWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-slate-900/60 px-8 py-4 text-sm font-semibold text-slate-200 backdrop-blur-lg transition-all hover:bg-white/10 hover:border-white/30 hover:text-white"
            >
              <FaWhatsapp className="h-4 w-4 text-emerald-400" />
              <span>Falar com Especialista</span>
            </a>
          </div>

          {/* Assurance guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Primeira proposta em 2 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>Compatível com todas as distribuidoras</span>
            </div>
          </div>
        </div>

        {/* Scroll down indicator pointing to the pinned pipeline */}
        <div className="relative z-10 mt-16 sm:mt-24 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
          <span className="text-[10px] font-mono tracking-widest uppercase">
            Desça para ver a interação em 3D
          </span>
          <ChevronDown className="h-4 w-4 text-emerald-400" />
        </div>
      </section>

      {/* ======================================================== */}
      {/* LIVE TELEMETRY STATS BAR                                */}
      {/* ======================================================== */}
      <div className="-mt-10 relative z-20">
        <LiveTelemetryStats />
      </div>

      {/* ======================================================== */}
      {/* SCROLL-PINNED 3D PIPELINE (The Showstopper Core)         */}
      {/* ======================================================== */}
      <ScrollPinnedPipeline />

      {/* ======================================================== */}
      {/* INTERACTIVE REAL-TIME SOLAR SIMULATOR                   */}
      {/* ======================================================== */}
      <InteractiveSolarSim />

      {/* ======================================================== */}
      {/* MAGNETIC 3D FEATURE CARDS (Diferenciais)                */}
      {/* ======================================================== */}
      <section
        id="diferenciais"
        className="relative py-24 sm:py-32 bg-slate-950 text-white overflow-hidden"
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/10 blur-[150px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-mono text-emerald-300">
              <Cpu className="h-3.5 w-3.5" />
              ARQUITETURA DE ENGENHARIA SOLAR
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Diferenciais pensados exclusivamente para integradores
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Desenvolvido lado a lado com instaladores e engenheiros para resolver o gargalo
              comercial do início ao fechamento.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MagneticFeatureCard
              title="Leitura OCR com Visão Computacional"
              description="Identifica 12 meses de consumo, tarifa TUSD/TE, demanda contratada e histórico de todas as concessionárias do Brasil sem digitação manual."
              badge="Visão IA"
              icon={Scan}
              accentColor="cyan"
              meta="Precisão de 99.8%"
            />

            <MagneticFeatureCard
              title="Dimensionamento Elétrico Inteligente"
              description="Cálculo rigoroso de kWp necessário, fator de sobrecarga do inversor (FDI), área útil de telhado e irradiação solar precisa pelo banco HSP oficial."
              badge="Engenharia NBR"
              icon={Cpu}
              accentColor="emerald"
              meta="Algoritmo Validado"
            />

            <MagneticFeatureCard
              title="Disparo Nativo no WhatsApp"
              description="Envie o PDF profissional com a identidade da sua marca e o link de simulação interativa direto na conversa com o cliente em 1 clique."
              badge="Omnichannel"
              icon={Send}
              accentColor="amber"
              meta="Sem Troca de Telas"
            />

            <MagneticFeatureCard
              title="Proposta Interativa em Camadas 3D"
              description="O cliente explora o gráfico de economia acumulada em 25 anos, vê o tempo exato de retorno (payback) e a valorização do imóvel de forma clara."
              badge="Alta Conversão"
              icon={Layers}
              accentColor="emerald"
              meta="Design Responsivo"
            />

            <MagneticFeatureCard
              title="Catálogo & Margens de Distribuidores"
              description="Configure sua margem de lucro por faixa de potência e integre com seu catálogo de módulos, inversores e estruturas de fixação."
              badge="Precificação"
              icon={TrendingUp}
              accentColor="cyan"
              meta="Margem Protegida"
            />

            <MagneticFeatureCard
              title="Contratos e Assinatura Eletrônica"
              description="Reduza a burocracia e acelere o fechamento permitindo que o cliente dê o aceite digital na proposta comercial imediatamente."
              badge="Fechamento"
              icon={FileCheck}
              accentColor="purple"
              meta="Validade Jurídica"
            />
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* COMPARISON MATRIX (Manual vs EnergivIA)                  */}
      {/* ======================================================== */}
      <ComparisonMatrix />

      {/* ======================================================== */}
      {/* FAQ SECTION                                             */}
      {/* ======================================================== */}
      <FAQAccordion />

      {/* ======================================================== */}
      {/* HIGH-CONVERSION FOOTER                                  */}
      {/* ======================================================== */}
      <LandingFooter />
    </div>
  );
}
