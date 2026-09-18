"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const appLoginUrl = "/login";
const demoWhatsappUrl =
  "https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergiVIA.%20Acredito%20que%20o%20produto%20de%20voc%C3%AAs%20%C3%A9%20incr%C3%ADvel%20e%20vai%20fazer%20a%20diferen%C3%A7a.%20Quando%20podemos%20conversar%3F";

export function LandingFooter(): JSX.Element {
  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden border-t border-white/10">
      {/* Glow highlight */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[350px] w-[800px] bg-emerald-500/10 blur-[150px]" />

      {/* High-Impact Pre-footer CTA Box */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16">
        <div className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 sm:p-14 text-center shadow-[0_20px_80px_rgba(16,185,129,0.2)] backdrop-blur-2xl">
          <div className="mx-auto max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-mono text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              EXPERIMENTE A REVOLUÇÃO SOLAR
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Pronto para transformar a velocidade do seu time comercial?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Junte-se aos integradores que já abandonaram planilhas demoradas e estão enviando
              propostas em segundos direto no WhatsApp.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={appLoginUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:bg-emerald-300 hover:scale-105 transition-all"
              >
                <span>Criar Conta Gratuita</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={demoWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:border-white/30 transition-all"
              >
                <FaWhatsapp className="h-4 w-4 text-emerald-400" />
                <span>Agendar Demonstração</span>
              </a>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Sem necessidade de cartão inicial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Configuração em 2 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        {/* Brand Col */}
        <div className="space-y-4 md:col-span-1">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="EnergivIA"
              width={160}
              height={42}
              className="h-9 w-auto object-contain brightness-110"
            />
          </Link>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plataforma de inteligência artificial para integradores de energia solar. Da conta de
            luz à proposta fechada no WhatsApp.
          </p>
          <div className="text-[11px] font-mono text-slate-500">Maringá, PR • Brasil</div>
        </div>

        {/* Links Col 1 */}
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Recursos</div>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>
              <a href="#pipeline" className="hover:text-emerald-400 transition-colors">
                Pipeline 3D
              </a>
            </li>
            <li>
              <a href="#simulador" className="hover:text-emerald-400 transition-colors">
                Simulador de Economia
              </a>
            </li>
            <li>
              <a href="#diferenciais" className="hover:text-emerald-400 transition-colors">
                Diferenciais Tecnológicos
              </a>
            </li>
            <li>
              <a href="#comparativo" className="hover:text-emerald-400 transition-colors">
                Comparativo de Produtividade
              </a>
            </li>
          </ul>
        </div>

        {/* Links Col 2 */}
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Soluções Solares
          </div>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>
              <Link href="/crm-energia-solar" className="hover:text-emerald-400 transition-colors">
                CRM para Energia Solar
              </Link>
            </li>
            <li>
              <Link
                href="/proposta-energia-solar"
                className="hover:text-emerald-400 transition-colors"
              >
                Gerador de Propostas Solares
              </Link>
            </li>
            <li>
              <Link
                href="/simulacao-energia-solar"
                className="hover:text-emerald-400 transition-colors"
              >
                Simulação Solar com IA
              </Link>
            </li>
            <li>
              <Link
                href="/software-integrador-solar"
                className="hover:text-emerald-400 transition-colors"
              >
                Software para Integradores
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Compliance */}
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Legal & Segurança
          </div>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>
              <Link href="/termos-de-uso" className="hover:text-emerald-400 transition-colors">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="hover:text-emerald-400 transition-colors">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                LGPD Compliance 100%
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Sub-bar */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div>© {new Date().getFullYear()} EnergivIA Tecnologia. Todos os direitos reservados.</div>
        <div className="flex items-center gap-1 text-slate-400">
          Feito com engenharia solar de alta performance ⚡
        </div>
      </div>
    </footer>
  );
}
