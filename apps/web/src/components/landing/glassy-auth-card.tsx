"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

interface GlassyAuthCardProps {
  initialMode?: "signup" | "login";
  onSuccess?: () => void;
  redirectUrl?: string;
  isEmbedded?: boolean;
}

export function GlassyAuthCard({
  initialMode = "signup",
  redirectUrl = "/auth/login",
  isEmbedded = false,
}: GlassyAuthCardProps): JSX.Element {
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Redireciona para o Auth0 passando screen_hint de acordo com o modo
    const authTarget = `${redirectUrl}?screen_hint=${mode === "signup" ? "signup" : "login"}&login_hint=${encodeURIComponent(email)}`;
    window.location.href = authTarget;
  };

  return (
    <div className={`relative w-full overflow-hidden ${isEmbedded ? "py-4" : "py-12 sm:py-16"}`}>
      {/* 3D Geometric Polygonal Background System */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Faceted Geometric SVG Pattern */}
        <svg
          className="absolute inset-0 h-full w-full opacity-35 object-cover"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="facet-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#090d16" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="facet-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#131e2e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#04070d" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="facet-grad-3" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1a2538" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#080c14" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          {/* Tessellated polygonal facets recreating the 3D relief in reference */}
          <polygon
            points="0,0 240,120 180,360 0,280"
            fill="url(#facet-grad-1)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <polygon
            points="240,120 540,80 480,320 180,360"
            fill="url(#facet-grad-2)"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <polygon
            points="540,80 840,140 760,400 480,320"
            fill="url(#facet-grad-3)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <polygon
            points="840,140 1140,90 1080,350 760,400"
            fill="url(#facet-grad-1)"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <polygon
            points="1140,90 1440,0 1440,300 1080,350"
            fill="url(#facet-grad-2)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />

          <polygon
            points="0,280 180,360 120,620 0,580"
            fill="url(#facet-grad-2)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <polygon
            points="180,360 480,320 420,600 120,620"
            fill="url(#facet-grad-3)"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <polygon
            points="480,320 760,400 700,660 420,600"
            fill="url(#facet-grad-1)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <polygon
            points="760,400 1080,350 1020,630 700,660"
            fill="url(#facet-grad-2)"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <polygon
            points="1080,350 1440,300 1440,600 1020,630"
            fill="url(#facet-grad-3)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />

          <polygon
            points="0,580 120,620 60,900 0,900"
            fill="url(#facet-grad-3)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <polygon
            points="120,620 420,600 360,900 60,900"
            fill="url(#facet-grad-1)"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <polygon
            points="420,600 700,660 640,900 360,900"
            fill="url(#facet-grad-2)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <polygon
            points="700,660 1020,630 960,900 640,900"
            fill="url(#facet-grad-3)"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <polygon
            points="1020,630 1440,600 1440,900 960,900"
            fill="url(#facet-grad-1)"
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
        </svg>

        {/* Atmospheric Backlight Bloom behind the Glass Card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[440px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.14)_0%,rgba(20,184,166,0.06)_40%,transparent_70%)] blur-2xl" />
      </div>

      {/* Main Glassmorphism Floating Card Container */}
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] border border-white/15 border-t-white/30 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] p-1 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),inset_0_1px_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl"
        >
          {/* Inner frosted glass surface */}
          <div className="relative grid grid-cols-1 md:grid-cols-12 rounded-[26px] sm:rounded-[34px] bg-[#050811]/75 backdrop-blur-3xl overflow-hidden">
            {/* LEFT COLUMN: Welcome / Brand Side */}
            <div className="relative md:col-span-5 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent">
              {/* Subtle light beam inside left column */}
              <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-2xl" />

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 glass-pill border-emerald-500/30 bg-emerald-950/40">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  EnergivIA
                </div>

                <AnimatePresence mode="wait">
                  {mode === "signup" ? (
                    <motion.div
                      key="left-signup"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3 }}
                      className="mt-8"
                    >
                      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
                        BEM-VINDO <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-white">
                          DE VOLTA!
                        </span>
                      </h2>
                      <p className="mt-4 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
                        Já faz parte da nossa plataforma? Acesse agora com suas credenciais para
                        gerenciar propostas e clientes.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="left-login"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3 }}
                      className="mt-8"
                    >
                      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
                        COMECE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-white">
                          AGORA!
                        </span>
                      </h2>
                      <p className="mt-4 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
                        Crie sua conta em segundos e gere sua primeira proposta comercial solar hoje
                        mesmo via WhatsApp e IA.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Button to Toggle Mode */}
              <div className="mt-8 pt-4">
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                  className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white glass-pill border-white/20 hover:border-emerald-400/60 hover:bg-emerald-500/15 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                >
                  <span>{mode === "signup" ? "Já tem conta? Entrar" : "Criar nova conta"}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Form */}
            <div className="relative md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
              <div className="max-w-md w-full mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {mode === "signup" ? "Criar Conta" : "Entrar na Plataforma"}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-400 font-light">
                      {mode === "signup"
                        ? "Preencha seus dados para criar sua conta gratuita"
                        : "Digite seus dados de acesso corporativo"}
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {mode === "signup" && (
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <User className="h-4 w-4 text-emerald-400/80" />
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="Nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all focus:border-emerald-500/50 focus:bg-white/[0.08] focus:ring-1 focus:ring-emerald-400/30"
                          />
                        </div>
                      )}

                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Mail className="h-4 w-4 text-emerald-400/80" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="E-mail corporativo"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all focus:border-emerald-500/50 focus:bg-white/[0.08] focus:ring-1 focus:ring-emerald-400/30"
                        />
                      </div>

                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Lock className="h-4 w-4 text-emerald-400/80" />
                        </div>
                        <input
                          type="password"
                          required
                          placeholder={mode === "signup" ? "Criar uma senha segura" : "Sua senha"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none backdrop-blur-md transition-all focus:border-emerald-500/50 focus:bg-white/[0.08] focus:ring-1 focus:ring-emerald-400/30"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full rounded-xl border border-white/20 border-t-white/40 bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-emerald-500/25 py-3.5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(16,185,129,0.2),inset_0_1px_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/80 hover:bg-emerald-500/35 hover:shadow-[0_4px_30px_rgba(16,185,129,0.35)] active:scale-[0.99] disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              Redirecionando...
                            </span>
                          ) : mode === "signup" ? (
                            "Criar Conta Grátis"
                          ) : (
                            "Entrar"
                          )}
                        </button>
                      </div>

                      {/* Toggle Link below button */}
                      <div className="pt-2 text-center text-xs text-slate-400">
                        <span>
                          {mode === "signup" ? "Já tem uma conta? " : "Ainda não tem conta? "}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                          className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors ml-1"
                        >
                          {mode === "signup" ? "Entrar" : "Cadastre-se"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
