"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
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
  showTagline: _showTagline = true,
  priority = true,
}: BrandLogoProps): JSX.Element {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const iconSrc = isDark ? "/favicon-dark.png" : "/favicon-light.png";

  const [customLogoDarkUrl, setCustomLogoDarkUrl] = useState<string>("");
  const [customLogoLightUrl, setCustomLogoLightUrl] = useState<string>("");

  useEffect(() => {
    fetch("/api/proxy/system-settings/branding", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setCustomLogoDarkUrl(data?.brandLogoDarkUrl || "");
        setCustomLogoLightUrl(data?.brandLogoLightUrl || "");
      })
      .catch(() => {});
  }, []);

  const activeCustomLogo = isDark ? customLogoDarkUrl : customLogoLightUrl;

  const config = {
    sm: {
      iconClass: "h-8 w-8",
      titleClass: "text-[1.35rem]",
      taglineClass: "text-[9.5px]",
    },
    md: {
      iconClass: "h-10 w-10 md:h-11 md:w-11",
      titleClass: "text-[1.65rem] md:text-[1.8rem]",
      taglineClass: "text-[11px] md:text-[11.5px]",
    },
    lg: {
      iconClass: "h-14 w-14",
      titleClass: "text-[2.1rem]",
      taglineClass: "text-[13px]",
    },
  }[size];

  if (activeCustomLogo) {
    if (collapsed) {
      return (
        <div
          className={cn(
            "flex items-center justify-center transition-transform duration-200 hover:scale-105",
            className
          )}
          title="EnergivIA"
        >
          <img src={activeCustomLogo} alt="Logo" className="h-9 w-9 object-contain shrink-0" />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center select-none transition-opacity hover:opacity-95",
          className
        )}
      >
        <img
          src={activeCustomLogo}
          alt="Logo"
          className="h-10 md:h-11 max-w-[200px] object-contain shrink-0"
        />
      </div>
    );
  }

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
        "flex items-center gap-3 select-none transition-opacity hover:opacity-95",
        className
      )}
    >
      <Image
        src={iconSrc}
        alt="EnergivIA"
        width={140}
        height={140}
        className={cn("shrink-0 object-contain drop-shadow-sm", config.iconClass)}
        priority={priority}
        unoptimized
      />
      <div className="flex flex-col justify-center min-w-0 font-[family-name:var(--font-montserrat),sans-serif]">
        <div className="flex items-baseline leading-none">
          <span
            className={cn(
              "font-bold tracking-[-0.02em] text-[#1e3a8a] dark:text-white transition-colors duration-150",
              config.titleClass
            )}
          >
            Energiv
          </span>
          <span
            className={cn(
              "font-bold tracking-[-0.02em] bg-gradient-to-r from-[#14b8a6] via-[#10b981] to-[#84cc16] dark:from-[#2dd4bf] dark:via-[#10b981] dark:to-[#a3e635] bg-clip-text text-transparent ml-0.5",
              config.titleClass
            )}
          >
            IA
          </span>
        </div>
        {_showTagline ? (
          <div className="flex justify-end w-full">
            <span
              className={cn(
                "text-right font-medium tracking-normal text-slate-600 dark:text-slate-300 leading-tight mt-1 whitespace-nowrap transition-colors duration-150 pr-0.5",
                config.taglineClass
              )}
            >
              o seu parceiro via I.A.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
