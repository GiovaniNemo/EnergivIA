"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";

interface WelcomeIntroSplashProps {
  onComplete?: () => void;
}

export function triggerWelcomeIntroSplash(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("energivia_show_welcome_splash", "true");
  }
}

export function WelcomeIntroSplash({ onComplete }: WelcomeIntroSplashProps): JSX.Element | null {
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  // Step: 1 = "Bem-vindo à EnergivIA", 2 = "O seu parceiro via IA", 3 = Loading State
  const [step, setStep] = useState<number>(1);
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPending =
        sessionStorage.getItem("energivia_show_welcome_splash") === "true" ||
        localStorage.getItem("energivia_show_welcome_splash") === "true";
      setShouldShow(isPending);
    } else {
      setShouldShow(false);
    }
  }, []);

  const handleFinish = useCallback(() => {
    setIsExiting(true);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("energivia_show_welcome_splash");
      localStorage.removeItem("energivia_show_welcome_splash");
    }
    setTimeout(() => {
      setIsDismissed(true);
      if (onComplete) onComplete();
    }, 850);
  }, [onComplete]);

  useEffect(() => {
    if (!shouldShow) return;

    // ESC key listener to skip intro quickly
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldShow, handleFinish]);

  useEffect(() => {
    if (!shouldShow) return;

    // Timeline sequence
    // Phase 1: Step 1 (0 -> 2400ms) - "Bem-vindo à EnergivIA"
    const timerStep2 = setTimeout(() => {
      setStep(2);
    }, 2400);

    // Phase 2: Step 2 (2400ms -> 4800ms) - "O seu parceiro via IA"
    const timerStep3 = setTimeout(() => {
      setStep(3);
    }, 4800);

    // Phase 3: Step 3 Loading bar progress (4800ms -> 7200ms)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 4;
      });
    }, 80);

    // Phase 4: Final reveal (7400ms)
    const timerFinish = setTimeout(() => {
      handleFinish();
    }, 7400);

    return () => {
      clearTimeout(timerStep2);
      clearTimeout(timerStep3);
      clearTimeout(timerFinish);
      clearInterval(progressInterval);
    };
  }, [shouldShow, handleFinish]);

  if (!shouldShow || isDismissed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bem-vindo à EnergivIA"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#050811] select-none transition-all duration-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting
          ? "opacity-0 scale-[1.03] blur-sm pointer-events-none"
          : "opacity-100 scale-100 blur-0 pointer-events-auto"
      }`}
    >
      {/* Dynamic ambient backdrop aura / organic breathing glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow 1 - Emerald Top Left */}
        <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22)_0%,rgba(5,150,105,0.08)_45%,transparent_70%)] blur-[100px] animate-aura-slow" />

        {/* Glow 2 - Cyan / Teal Bottom Right */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.2)_0%,rgba(14,165,233,0.06)_40%,transparent_70%)] blur-[120px] animate-aura-reverse" />

        {/* Glow 3 - Central Breathing Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.12)_0%,rgba(16,185,129,0.04)_50%,transparent_75%)] blur-[90px] animate-pulse-slow" />

        {/* Subtle geometric dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.7) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Skip button (discreet top-right) */}
      <button
        type="button"
        onClick={handleFinish}
        className="absolute top-6 right-6 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
      >
        <span>Pular</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Main Animated Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl px-6 text-center">
        {/* PHASE 1: "Bem-vindo à EnergivIA" */}
        {step === 1 && (
          <div className="animate-intro-phrase flex flex-col items-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              Bem-vindo à{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-teal-200">
                EnergivIA
              </span>
            </h1>
          </div>
        )}

        {/* PHASE 2: "O seu parceiro via IA" */}
        {step === 2 && (
          <div className="animate-intro-phrase flex flex-col items-center">
            <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              O seu parceiro{" "}
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                via IA
              </span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-400 font-light tracking-wide max-w-lg">
              Inteligência e tecnologia impulsionando as suas vendas solares.
            </p>
          </div>
        )}

        {/* PHASE 3: Loading / Seamless Morph to Dashboard */}
        {step === 3 && (
          <div className="animate-intro-loading flex flex-col items-center">
            {/* Logo/Icon with radiant glow */}
            <div className="relative mb-7 flex items-center justify-center">
              <div className="absolute -inset-3 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl border border-emerald-500/30 bg-[#0c1220]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <Image
                  src="/favicon-dark.png"
                  alt="EnergivIA"
                  width={46}
                  height={46}
                  className="object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  priority
                  unoptimized
                />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">
              Preparando seu painel...
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Só mais um instante enquanto organizamos tudo para você
            </p>

            {/* Modern Slim Smooth Progress Bar */}
            <div className="mt-8 w-64 sm:w-80 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes auraSlow {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(6%, 8%) scale(1.1);
          }
        }
        @keyframes auraReverse {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-6%, -8%) scale(1.12);
          }
        }
        @keyframes pulseSlow {
          0%,
          100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.95;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }
        @keyframes introPhrase {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
            filter: blur(8px);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-14px) scale(1.02);
            filter: blur(6px);
          }
        }
        @keyframes introLoading {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.97);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes spinSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .animate-aura-slow {
          animation: auraSlow 16s ease-in-out infinite;
        }
        .animate-aura-reverse {
          animation: auraReverse 18s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulseSlow 8s ease-in-out infinite;
        }
        .animate-intro-phrase {
          animation: introPhrase 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-intro-loading {
          animation: introLoading 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
