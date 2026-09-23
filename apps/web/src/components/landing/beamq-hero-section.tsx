"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";

const appLoginUrl = "/login";

export function BeamqHeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Fallback if autoplay is restricted
      });
    }
  }, []);

  return (
    <section className="relative min-h-[100vh] w-full bg-[#02040a] text-white overflow-hidden font-plus-jakarta selection:bg-[#38bdf8]/30 selection:text-white">
      {/* Background Media System - Hardware-accelerated fluid video with smooth blending */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-85 will-change-transform"
          src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/blue-light-glow.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
        {/* Hardware-accelerated gradient overlays for seamless atmospheric blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#02040a]/75 via-transparent to-[#02040a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#02040a_85%)]" />
      </div>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-black/20 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-12 py-5">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 relative group transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo-dark.png"
              alt="EnergivIA"
              width={480}
              height={136}
              className="h-10 sm:h-11 w-auto object-contain"
              priority
              unoptimized
            />
          </Link>

          {/* Desktop Nav Menu */}
          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-300">
            {["Como Funciona", "Resultados", "Cenários", "Diferenciais", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="relative hover:text-white transition-colors duration-300 group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#38bdf8] to-[#8b5cf6] transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden lg:flex items-center gap-6">
            <a
              href={appLoginUrl}
              className="text-slate-300 hover:text-white font-medium transition-colors text-[15px]"
            >
              Entrar
            </a>
            <a
              href={appLoginUrl}
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white rounded-full bg-white/5 backdrop-blur-md border border-cyan-500/35 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:bg-white/10 transition-all"
            >
              Começar Agora &rarr;
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          className={`lg:hidden absolute top-full left-0 w-full bg-[#02040a]/95 backdrop-blur-xl border-b border-cyan-500/20 transition-all duration-300 overflow-hidden ${isMenuOpen ? "max-h-[400px] py-4" : "max-h-0 py-0 border-transparent"}`}
        >
          <div className="flex flex-col px-6 gap-4">
            {["Como Funciona", "Resultados", "Cenários", "Diferenciais", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-slate-300 hover:text-white font-medium text-lg py-2 border-b border-white/5"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <a
                href={appLoginUrl}
                className="text-center py-3 font-medium text-white bg-white/10 rounded-lg"
              >
                Entrar
              </a>
              <a
                href={appLoginUrl}
                className="text-center py-3 font-semibold text-[#02040a] bg-gradient-to-r from-[#38bdf8] to-[#3b82f6] rounded-lg"
              >
                Começar Agora
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Content Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100vh] px-6 pt-24 pb-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col items-center">
          <div className="max-w-5xl text-center mx-auto flex flex-col items-center">
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center px-4 py-1.5 mb-8 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-sm shadow-[0_0_15px_rgba(56,189,248,0.2)]"
            >
              <span className="text-[#38bdf8] text-xs sm:text-sm font-bold uppercase tracking-[0.3em]">
                INTELIGENTE • SEGURO • ESCALÁVEL
              </span>
            </motion.div>

            {/* Main H1 Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-bold tracking-tight leading-[1.28] sm:leading-[1.24] mb-6 drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] overflow-visible">
              <motion.span
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="block text-white font-light mb-3 will-change-transform"
              >
                Acelere suas vendas solares.
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.75,
                  delay: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="inline-block pt-1 pb-6 sm:pb-8 px-2 text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#a855f7] drop-shadow-[0_0_25px_rgba(56,189,248,0.45)] will-change-transform"
              >
                <span className="inline-block">Gere propostas</span>{" "}
                <span className="inline-block">em segundos.</span>
              </motion.span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 max-w-2xl text-lg sm:text-xl text-white/90 font-light leading-relaxed drop-shadow-md"
            >
              Pare de perder tempo com planilhas e propostas manuais. Receba a conta de luz, simule
              a usina ideal com IA e entregue a proposta comercial pronta no WhatsApp em 2 minutos.
            </motion.p>

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto"
            >
              {/* White Primary Button */}
              <a
                href={appLoginUrl}
                className="w-full sm:w-auto bg-white text-black font-semibold rounded-full px-8 py-3.5 hover:scale-105 transition-transform duration-300 shadow-[0_0_25px_rgba(255,255,255,0.4)] text-[15px]"
              >
                Criar Conta Grátis
              </a>

              {/* Glass Secondary Button */}
              <a
                href="#como-funciona"
                className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/30 text-white font-medium rounded-full px-7 py-3.5 hover:bg-white/20 transition-all duration-300 text-[15px]"
              >
                Como Funciona
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-10">
        <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-400 to-transparent"></div>
      </div>
    </section>
  );
}
