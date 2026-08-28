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
  const fullLogoSrc = isDark ? "/logo-tema-escuro.png" : "/logo-tema-claro.png";

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
      iconClass: "h-7 w-7",
      fullLogoClass: "h-9 w-auto max-w-[180px]",
    },
    md: {
      iconClass: "h-9 w-9 md:h-10 md:w-10",
      fullLogoClass: "h-11 md:h-12 w-auto max-w-[250px]",
    },
    lg: {
      iconClass: "h-12 w-12",
      fullLogoClass: "h-14 w-auto max-w-[300px]",
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
          className={cn("shrink-0 object-contain", config.fullLogoClass)}
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
          width={160}
          height={160}
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
        "flex items-center justify-center select-none transition-opacity hover:opacity-95 py-0.5",
        className
      )}
    >
      <Image
        src={fullLogoSrc}
        alt="EnergivIA - o seu parceiro via I.A."
        width={900}
        height={250}
        className={cn("shrink-0 object-contain", config.fullLogoClass)}
        priority={priority}
        unoptimized
      />
    </div>
  );
}
