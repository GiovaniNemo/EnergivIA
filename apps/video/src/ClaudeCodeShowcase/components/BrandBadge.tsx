import React from "react";
import { Zap, SunMedium } from "lucide-react";

interface BrandBadgeProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
}

export const BrandBadge: React.FC<BrandBadgeProps> = ({
  size = "md",
  subtitle = "O Ecossistema Completo de Vendas Solares",
  className = "",
}) => {
  const iconSize =
    size === "lg" ? "h-10 w-10" : size === "md" ? "h-8 w-8" : "h-6 w-6";
  const titleSize =
    size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-lg";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex items-center space-x-3">
        <div
          className={`relative flex ${iconSize} items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-2 shadow-lg shadow-emerald-500/20`}
        >
          <Zap className="h-full w-full text-white" />
          <SunMedium className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-300" />
        </div>
        <div className="flex items-baseline space-x-1">
          <span
            className={`font-extrabold tracking-tight text-white ${titleSize}`}
          >
            Energiv
          </span>
          <span
            className={`font-black tracking-tight text-emerald-400 ${titleSize}`}
          >
            IA
          </span>
        </div>
      </div>
      {subtitle && (
        <span className="mt-2 text-xs font-mono uppercase tracking-widest text-slate-400">
          {subtitle}
        </span>
      )}
    </div>
  );
};
