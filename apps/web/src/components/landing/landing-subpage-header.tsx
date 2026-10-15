"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const appLoginUrl = "/login";
const appSignupUrl = "/cadastro";

interface LandingSubpageHeaderProps {
  className?: string;
}

export function LandingSubpageHeader({ className = "" }: LandingSubpageHeaderProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 bg-[#02040a]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 relative group transition-opacity hover:opacity-95"
        >
          <Image
            src="/logo-dark.png"
            alt="EnergivIA"
            width={480}
            height={136}
            className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            priority
            unoptimized
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-slate-300">
          <Link href="/" className="hover:text-white transition-colors">
            Início
          </Link>
          <Link href="/#como-funciona" className="hover:text-white transition-colors">
            Como funciona
          </Link>
          <Link href="/#diferenciais" className="hover:text-white transition-colors">
            Diferenciais
          </Link>
          <a
            href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Demonstração
          </a>
        </nav>

        {/* Desktop Action CTAs */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href={appLoginUrl}
            className="text-slate-300 hover:text-white font-medium transition-colors text-[14px]"
          >
            Entrar
          </Link>
          <Link
            href={appSignupUrl}
            className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white rounded-full glass-pill border-emerald-500/40 hover:border-emerald-400/80 hover:bg-emerald-500/15 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all"
          >
            Começar Agora &rarr;
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-[#02040a]/95 backdrop-blur-2xl border-b border-emerald-500/20 transition-all duration-300 overflow-hidden ${
          isMenuOpen ? "max-h-[360px] py-4" : "max-h-0 py-0 border-transparent"
        }`}
      >
        <div className="flex flex-col px-6 gap-3">
          <Link
            href="/"
            className="text-slate-300 hover:text-white font-medium text-base py-2 border-b border-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            Início
          </Link>
          <Link
            href="/#como-funciona"
            className="text-slate-300 hover:text-white font-medium text-base py-2 border-b border-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            Como funciona
          </Link>
          <Link
            href="/#diferenciais"
            className="text-slate-300 hover:text-white font-medium text-base py-2 border-b border-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            Diferenciais
          </Link>
          <a
            href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 hover:text-white font-medium text-base py-2 border-b border-white/5"
            onClick={() => setIsMenuOpen(false)}
          >
            Demonstração
          </a>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href={appLoginUrl}
              className="text-center py-2 text-slate-300 hover:text-white font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Entrar
            </Link>
            <Link
              href={appSignupUrl}
              className="text-center py-2.5 text-sm font-semibold text-white rounded-full glass-pill border-emerald-500/40 bg-emerald-500/15"
              onClick={() => setIsMenuOpen(false)}
            >
              Começar Agora &rarr;
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
