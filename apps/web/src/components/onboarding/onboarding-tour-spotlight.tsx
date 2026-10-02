"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, CheckCircle2, Compass } from "lucide-react";
import { useOnboardingTour } from "./onboarding-tour-provider";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function OnboardingTourSpotlight(): JSX.Element | null {
  const { isActive, currentStep, currentStepIndex, totalSteps, nextStep, prevStep, skipTour } =
    useOnboardingTour();

  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const updateTargetRect = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (!element) {
      setTargetRect(null);
      return;
    }

    // Rolagem suave para manter o elemento visível se necessário
    const rawRect = element.getBoundingClientRect();
    const isOutOfViewport =
      rawRect.top < 80 ||
      rawRect.bottom > window.innerHeight - 80 ||
      rawRect.left < 20 ||
      rawRect.right > window.innerWidth - 20;

    if (isOutOfViewport) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const updatedRect = element.getBoundingClientRect();
    const PADDING = 8;
    setTargetRect({
      top: Math.max(0, updatedRect.top - PADDING),
      left: Math.max(0, updatedRect.left - PADDING),
      width: updatedRect.width + PADDING * 2,
      height: updatedRect.height + PADDING * 2,
      bottom: updatedRect.bottom + PADDING,
      right: updatedRect.right + PADDING,
    });
  }, [currentStep?.targetSelector]);

  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }

    updateTargetRect();

    // Rastreia atualizações dinâmicas (scroll, redimensionamento, renderização atrasada)
    const interval = setInterval(updateTargetRect, 250);
    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [isActive, currentStep, updateTargetRect]);

  if (!mounted || !isActive || !currentStep) return null;

  // Cálculo da posição do Card Flutuante
  const CARD_WIDTH = Math.min(420, viewportSize.width - 32);
  const CARD_HEIGHT_ESTIMATE = 240;

  let cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    width: `${CARD_WIDTH}px`,
  };

  if (!targetRect) {
    // Centralizado quando não houver alvo no DOM
    cardStyle = {
      ...cardStyle,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else {
    const placement = currentStep.preferredPlacement ?? "bottom";
    let posX = targetRect.left + (targetRect.width - CARD_WIDTH) / 2;
    let posY = targetRect.bottom + 16;

    if (placement === "top") {
      posY = targetRect.top - CARD_HEIGHT_ESTIMATE - 16;
      if (posY < 16) {
        posY = targetRect.bottom + 16;
      }
    } else if (placement === "bottom") {
      posY = targetRect.bottom + 16;
      if (posY + CARD_HEIGHT_ESTIMATE > viewportSize.height - 16) {
        posY = Math.max(16, targetRect.top - CARD_HEIGHT_ESTIMATE - 16);
      }
    } else if (placement === "left") {
      posX = targetRect.left - CARD_WIDTH - 16;
      posY = targetRect.top;
      if (posX < 16) {
        posX = Math.max(16, (viewportSize.width - CARD_WIDTH) / 2);
        posY = targetRect.bottom + 16;
      }
    } else if (placement === "right") {
      posX = targetRect.right + 16;
      posY = targetRect.top;
      if (posX + CARD_WIDTH > viewportSize.width - 16) {
        posX = Math.max(16, (viewportSize.width - CARD_WIDTH) / 2);
        posY = targetRect.bottom + 16;
      }
    }

    // Clamp horizontal e vertical
    posX = Math.max(16, Math.min(viewportSize.width - CARD_WIDTH - 16, posX));
    posY = Math.max(16, Math.min(viewportSize.height - CARD_HEIGHT_ESTIMATE - 20, posY));

    cardStyle = {
      ...cardStyle,
      left: `${posX}px`,
      top: `${posY}px`,
    };
  }

  const isLastStep = currentStepIndex === totalSteps - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial interativo da EnergivIA"
      className="fixed inset-0 z-[99990] overflow-hidden pointer-events-auto"
    >
      {/* SVG Backdrop com máscara recortada */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto transition-opacity duration-300"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Fundo branco = visível / opaco */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Recorte preto = transparente no alvo */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Retângulo escurecido global */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 7, 14, 0.76)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Borda iluminada sutil ao redor do elemento em foco */}
        {targetRect && (
          <rect
            x={targetRect.left}
            y={targetRect.top}
            width={targetRect.width}
            height={targetRect.height}
            rx="14"
            ry="14"
            fill="none"
            stroke="rgba(16, 185, 129, 0.85)"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Card Flutuante de Explicação */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -8 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={cardStyle}
          className="rounded-2xl border border-white/10 bg-[#0c1220]/95 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-slate-100"
        >
          {/* Top Bar: Badge e Fechar */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Compass className="w-3.5 h-3.5" />
                <span>
                  Passo {currentStepIndex + 1} de {totalSteps}
                </span>
              </span>
              {currentStep.highlightBadge && (
                <span className="text-[11px] font-medium text-slate-400">
                  {currentStep.highlightBadge}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={skipTour}
              title="Pular tour"
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo Principal */}
          <div className="mb-5">
            <h3 className="text-base font-semibold text-white tracking-tight leading-snug">
              {currentStep.title}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {currentStep.description}
            </p>
          </div>

          {/* Rodapé e Ações */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={skipTour}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline px-1 py-1.5"
            >
              {currentStep.skipLabel || "Já conheço / Pular"}
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
              )}

              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all duration-200 shadow-[0_2px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)]"
              >
                <span>{currentStep.nextLabel || (isLastStep ? "Concluir" : "Avançar")}</span>
                {isLastStep ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
