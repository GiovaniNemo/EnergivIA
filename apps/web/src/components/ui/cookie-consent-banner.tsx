"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "energivia_cookie_consent";

export type CookieConsentStatus = "all" | "essential" | null;

export function CookieConsentBanner(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<CookieConsentStatus>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentStatus;
      if (saved) {
        setConsent(saved);
      }
    } catch {
      // Ignore localStorage errors (e.g. private mode)
    }
    setMounted(true);
  }, []);

  const handleChoice = (choice: "all" | "essential") => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, choice);
      window.dispatchEvent(new CustomEvent("energivia-cookie-consent-change", { detail: choice }));
    } catch {
      // Ignore
    }
    setConsent(choice);
  };

  // Don't render on SSR or if user already gave consent
  if (!mounted || consent !== null) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Consentimento de Cookies"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md text-slate-100 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Cookie className="h-5 w-5" />
          </div>

          <div className="flex-1 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-100">Privacidade & Cookies</h3>
              <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
                <ShieldCheck className="h-3 w-3" /> LGPD
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Utilizamos cookies essenciais para o funcionamento da plataforma e dados anônimos de
              navegação para melhorar sua experiência. Veja nossa{" "}
              <Link
                href="/privacidade"
                className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
              >
                Política de Privacidade
              </Link>
              .
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleChoice("all")}
                className="rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-400 active:scale-95"
              >
                Aceitar todos
              </button>
              <button
                type="button"
                onClick={() => handleChoice("essential")}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white active:scale-95"
              >
                Apenas necessários
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleChoice("essential")}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Fechar banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
