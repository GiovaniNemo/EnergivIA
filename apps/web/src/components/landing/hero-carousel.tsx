"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useAnimation, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

const SLIDES = [
  { id: 1, title: "Painel em Tempo Real", desc: "Acompanhe todo o seu funil de ponta a ponta." },
  {
    id: 2,
    title: "Funil Integrado ao WhatsApp",
    desc: "Mova os cards e notifique o cliente automaticamente.",
  },
  {
    id: 3,
    title: "Propostas com Inteligência Artificial",
    desc: "Gere documentos comerciais impecáveis em 10 segundos.",
  },
  {
    id: 4,
    title: "Visão do Integrador Solar",
    desc: "Métricas focadas no crescimento da sua empresa de energia solar.",
  },
];

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragX = useMotionValue(0);
  const controls = useAnimation();

  // Handle drag end to snap to the closest slide
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50; // pixels to trigger slide change
    if (info.offset.x < -threshold && currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (info.offset.x > threshold && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Animate the container to the active slide index
  useEffect(() => {
    controls.start({
      x: `calc(-${currentIndex * 100}% - ${currentIndex * 1.5}rem)`,
      transition: { type: "spring", stiffness: 200, damping: 25 },
    });
  }, [currentIndex, controls]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < SLIDES.length - 1 ? prev + 1 : prev));
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Carousel Viewport */}
      <div className="overflow-hidden rounded-3xl">
        <motion.div
          className="flex gap-6 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          style={{ x: dragX }}
          animate={controls}
          onDragEnd={handleDragEnd}
        >
          {SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;

            return (
              <motion.div
                key={slide.id}
                className={`relative shrink-0 w-full sm:w-[85%] md:w-[75%] lg:w-[65%] h-[400px] sm:h-[500px] md:h-[600px] rounded-3xl border transition-all duration-500 overflow-hidden ${
                  isActive
                    ? "border-amber-400/30 bg-gradient-to-br from-slate-900/80 via-[#0c1424]/90 to-[#050811]/95 shadow-[0_0_50px_-12px_rgba(251,191,36,0.15)]"
                    : "border-slate-800/50 bg-slate-950/50 opacity-50 scale-[0.97]"
                } backdrop-blur-xl flex flex-col items-center justify-center`}
              >
                {/* Image Placeholder Icon */}
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="w-20 h-20 mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-inner">
                    <ImageIcon className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{slide.title}</h3>
                  <p className="text-slate-400 max-w-md">{slide.desc}</p>

                  <div className="mt-8 px-4 py-2 rounded-full border border-slate-700/50 bg-slate-800/30 text-xs font-mono text-slate-500 uppercase tracking-widest">
                    Placeholder Visual {slide.id}
                  </div>
                </div>

                {/* Subtle Glint Effect on Active Slide */}
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl border-t border-r border-amber-200/20" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between md:justify-center gap-8 mt-8">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-3">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-amber-400 w-8" : "bg-slate-700 hover:bg-slate-500"
              }`}
              aria-label={`Ir para o slide ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === SLIDES.length - 1}
          className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Próximo slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
