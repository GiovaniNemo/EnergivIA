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
      titleClass: "text-[1.15rem]",
      taglineClass: "text-[8.5px]",
    },
    md: {
      iconClass: "h-9 w-9",
      titleClass: "text-[1.35rem]",
      taglineClass: "text-[10px]",
    },
    lg: {
      iconClass: "h-11 w-11",
      titleClass: "text-[1.6rem]",
      taglineClass: "text-[11px]",
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
        "flex items-center gap-2.5 select-none transition-opacity hover:opacity-95",
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
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-baseline leading-tight">
          <span
            className={cn(
              "font-black tracking-tight text-slate-900 dark:text-white",
              config.titleClass
            )}
          >
            Energiv
          </span>
          <span
            className={cn(
              "font-black tracking-tight bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500 dark:from-emerald-400 dark:via-teal-300 dark:to-green-400 bg-clip-text text-transparent ml-0.5",
              config.titleClass
            )}
          >
            IA
          </span>
        </div>
        {showTagline ? (
          <span
            className={cn(
              "font-semibold tracking-normal text-slate-500 dark:text-slate-400 leading-none mt-0.5 whitespace-nowrap",
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
