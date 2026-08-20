"use client";

import Image from "next/image";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@energivia/utils";

interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  priority?: boolean;
}

export function BrandLogo({
  collapsed = false,
  className,
  size = "md",
  showTagline = true,
  priority = true,
}: BrandLogoProps): JSX.Element {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const iconSrc = isDark ? "/favicon-dark.png" : "/favicon-light.png";

  const config = {
    sm: {
      iconClass: "h-7 w-7",
      titleClass: "text-[1.2rem]",
      taglineClass: "text-[8.5px]",
    },
    md: {
      iconClass: "h-9 w-9 md:h-10 md:w-10",
      titleClass: "text-[1.45rem]",
      taglineClass: "text-[10px]",
    },
    lg: {
      iconClass: "h-12 w-12",
      titleClass: "text-[1.75rem]",
      taglineClass: "text-[12px]",
    },
  }[size];

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center transition-transform duration-200 hover:scale-105",
          className
        )}
        title="EnergivIA - o seu parceiro via I.A."
      >
        <Image
          src={iconSrc}
          alt="EnergivIA"
          width={120}
          height={120}
          className={cn("shrink-0 object-contain drop-shadow-sm", config.iconClass)}
          priority={priority}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 select-none transition-opacity hover:opacity-95",
        className
      )}
    >
      <Image
        src={iconSrc}
        alt="EnergivIA"
        width={120}
        height={120}
        className={cn("shrink-0 object-contain drop-shadow-sm", config.iconClass)}
        priority={priority}
        unoptimized
      />
      <div className="flex flex-col justify-start min-w-0 font-[family-name:var(--font-montserrat),sans-serif] pt-0.5">
        <div className="flex items-baseline leading-none">
          <span
            className={cn(
              "font-bold tracking-tight text-[#1e3a8a] dark:text-white",
              config.titleClass
            )}
          >
            Energiv
          </span>
          <span
            className={cn(
              "font-bold tracking-tight bg-gradient-to-r from-[#14b8a6] via-[#10b981] to-[#84cc16] dark:from-[#2dd4bf] dark:via-[#10b981] dark:to-[#a3e635] bg-clip-text text-transparent ml-0.5",
              config.titleClass
            )}
          >
            IA
          </span>
        </div>
        {showTagline ? (
          <span
            className={cn(
              "text-right w-full font-medium tracking-normal text-slate-600 dark:text-slate-300 leading-tight mt-1 whitespace-nowrap",
              config.taglineClass
            )}
          >
            o seu parceiro via I.A.
          </span>
        ) : null}
      </div>
    </div>
  );
}
