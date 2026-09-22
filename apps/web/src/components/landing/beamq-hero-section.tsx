"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const appLoginUrl = "/login";

export function BeamqHeroSection() {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(1);

  // Dual Video Seamless Crossfade Mechanism
  useEffect(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (!v1 || !v2) return;

    const crossfadeDuration = 2; // seconds

    const handleTimeUpdate = () => {
      const currentVideo = activeVideo === 1 ? v1 : v2;
      const nextVideo = activeVideo === 1 ? v2 : v1;

      if (
        currentVideo.duration &&
        currentVideo.duration - currentVideo.currentTime <= crossfadeDuration
      ) {
        if (nextVideo.paused) {
          nextVideo.currentTime = 0;
          nextVideo.play().catch((e) => console.log("Play interrupted", e));
          setActiveVideo(activeVideo === 1 ? 2 : 1);
        }
      }
    };

    v1.addEventListener("timeupdate", handleTimeUpdate);
    v2.addEventListener("timeupdate", handleTimeUpdate);

    // Initial play
    v1.play().catch((e) => console.log("Auto-play prevented", e));

    return () => {
      v1.removeEventListener("timeupdate", handleTimeUpdate);
      v2.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [activeVideo]);

  return (
    <section className="relative min-h-[100vh] w-full bg-[#02040a] text-white overflow-hidden font-plus-jakarta selection:bg-[#38bdf8]/30 selection:text-white">
      {/* Background Media System */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 100%)",
        }}
      >
        <video
          ref={video1Ref}
          className={`absolute inset-0 w-full h-full object-cover object-center scale-105 transition-opacity duration-2000 ${activeVideo === 1 ? "opacity-80" : "opacity-0"}`}
          src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/blue-light-glow.mp4"
          muted
          playsInline
          preload="auto"
        />
        <video
          ref={video2Ref}
          className={`absolute inset-0 w-full h-full object-cover object-center scale-105 transition-opacity duration-2000 ${activeVideo === 2 ? "opacity-80" : "opacity-0"}`}
          src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/blue-light-glow.mp4"
          muted
          playsInline
          preload="auto"
        />
      </div>

      {/* Top Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/70 via-black/35 to-transparent pointer-events-none" />

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-black/20 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-12 py-5">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 relative group">
            {/* Isometric 3D Cube Grid SVG (Simplified) */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-md transform rotate-45 group-hover:rotate-90 transition-all duration-500 border border-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
              <div className="absolute w-4 h-4 bg-blue-500/40 rounded-sm transform -rotate-12"></div>
            </div>
            <span className="tracking-[0.25em] font-bold text-white text-xl">ENERGIVIA</span>
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
          <div className="max-w-4xl text-center mx-auto flex flex-col items-center">
            {/* Tagline Badge */}
            <div className="inline-flex items-center px-4 py-1.5 mb-8 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-sm shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <span className="text-[#38bdf8] text-xs sm:text-sm font-bold uppercase tracking-[0.3em]">
                INTELIGENTE • SEGURO • ESCALÁVEL
              </span>
            </div>

            {/* Main H1 Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1] mb-6 drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
              <span className="block text-white font-light mb-2">Acelere suas vendas solares.</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] via-[#3b82f6] to-[#8b5cf6] drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                Gere propostas em segundos.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-2xl text-lg sm:text-xl text-white/90 font-light leading-relaxed drop-shadow-md">
              Pare de perder tempo com planilhas e propostas manuais. Receba a conta de luz, simule
              a usina ideal com IA e entregue a proposta comercial pronta no WhatsApp em 2 minutos.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-12 flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
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
            </div>
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
