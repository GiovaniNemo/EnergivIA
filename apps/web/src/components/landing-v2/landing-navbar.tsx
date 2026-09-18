"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Menu, X } from "lucide-react";

const appLoginUrl = "/login";
const demoWhatsappUrl =
  "https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergiVIA.%20Acredito%20que%20o%20produto%20de%20voc%C3%AAs%20%C3%A9%20incr%C3%ADvel%20e%20vai%20fazer%20a%20diferen%C3%A7a.%20Quando%20podemos%20conversar%3F";

export function LandingNavbar(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalScroll > 0 ? (currentScroll / totalScroll) * 100 : 0;
      setScrollProgress(progress);
      setScrolled(currentScroll > 30);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-white/5 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-all duration-100 ease-out shadow-[0_0_10px_rgba(16,185,129,0.7)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Brand Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/10 p-1.5 border border-emerald-500/30 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="EnergivIA"
                width={160}
                height={42}
                className="h-9 w-auto object-contain brightness-110 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                priority
              />
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-white/[0.07] bg-slate-900/60 px-5 py-2 backdrop-blur-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <a
              href="#pipeline"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Pipeline 3D
            </a>
            <span className="text-white/20 text-xs">•</span>
            <a
              href="#simulador"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Simulador Solar
            </a>
            <span className="text-white/20 text-xs">•</span>
            <a
              href="#diferenciais"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Diferenciais
            </a>
            <span className="text-white/20 text-xs">•</span>
            <a
              href="#comparativo"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Comparativo
            </a>
            <span className="text-white/20 text-xs">•</span>
            <a
              href="#faq"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href={appLoginUrl}
              className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
            >
              Entrar
            </a>
            <a
              href={appLoginUrl}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 p-[1px] font-semibold transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
            >
              <div className="flex items-center gap-1.5 rounded-full bg-slate-950 px-5 py-2 text-xs text-white transition-colors group-hover:bg-transparent group-hover:text-slate-950">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 transition-transform group-hover:rotate-12" />
                <span>Começar Grátis</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 p-2 text-slate-300 hover:text-white hover:border-white/20"
            aria-label="Abrir Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-white/10 bg-slate-950/95 backdrop-blur-2xl px-6 py-6 shadow-2xl animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-3">
              <a
                href="#pipeline"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                Pipeline 3D
              </a>
              <a
                href="#simulador"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                Simulador Solar
              </a>
              <a
                href="#diferenciais"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                Diferenciais
              </a>
              <a
                href="#comparativo"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                Comparativo
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                FAQ
              </a>
              <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-white/10">
                <a
                  href={appLoginUrl}
                  className="w-full text-center rounded-xl border border-white/20 py-2.5 text-sm font-semibold text-white"
                >
                  Entrar
                </a>
                <a
                  href={appLoginUrl}
                  className="w-full text-center rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  Começar Grátis
                </a>
                <a
                  href={demoWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300"
                >
                  Falar com Especialista
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
