"use client";

import React, { useRef, useState } from "react";
import { LucideIcon } from "lucide-react";

interface MagneticFeatureCardProps {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  accentColor: string; // e.g. "emerald", "cyan", "amber", "purple"
  meta: string;
}

export function MagneticFeatureCard({
  title,
  description,
  badge,
  icon: Icon,
  accentColor,
  meta,
}: MagneticFeatureCardProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalize coordinates between -1 and 1
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    setRotateX(-normY * 10);
    setRotateY(normX * 10);
    setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const accentMap: Record<string, string> = {
    emerald: "rgba(16, 185, 129, 0.18)",
    cyan: "rgba(6, 182, 212, 0.18)",
    amber: "rgba(245, 158, 11, 0.18)",
    purple: "rgba(168, 85, 247, 0.18)",
  };
  const glowColor = accentMap[accentColor] || "rgba(16, 185, 129, 0.18)";

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative rounded-3xl p-[1px] transition-all duration-300"
      style={{
        perspective: 1000,
      }}
    >
      {/* 3D Tilting Card Body */}
      <div
        className="relative h-full flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/80 p-8 shadow-xl backdrop-blur-2xl transition-transform duration-200 ease-out"
        style={{
          transform: isHovered
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`
            : "rotateX(0deg) rotateY(0deg) translateZ(0px)",
        }}
      >
        {/* Dynamic cursor following radial light */}
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${glowPos.x}% ${glowPos.y}%, ${glowColor}, transparent 70%)`,
          }}
        />

        <div>
          {/* Top Row: Icon and Badge */}
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-white shadow-inner">
              <Icon className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {badge}
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="mt-6 text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
        </div>

        {/* Footer Meta info */}
        <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-500">
          <span>{meta}</span>
          <span className="text-emerald-400">ATIVO</span>
        </div>
      </div>
    </div>
  );
}
