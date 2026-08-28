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

  const [customLogoUrl, setCustomLogoUrl] = useState<string>("");

  useEffect(() => {
    fetch("/api/proxy/system-settings/branding", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setCustomLogoUrl(data?.brandLogoUrl || "");
      })
      .catch(() => {});
  }, []);

  const config = {
    sm: {
      iconClass: "h-7 w-7",
      fullLogoClass: "h-8 w-auto max-w-[150px]",
    },
    md: {
      iconClass: "h-9 w-9 md:h-10 md:w-10",
      fullLogoClass: "h-10 md:h-11 w-auto max-w-[210px]",
    },
    lg: {
      iconClass: "h-12 w-12",
      fullLogoClass: "h-12 md:h-13 w-auto max-w-[260px]",
    },
  }[size];

  if (customLogoUrl) {
    if (collapsed) {
      return (
        <div
          className={cn(
            "flex items-center justify-center transition-transform duration-200 hover:scale-105",
            className
          )}
          title="EnergivIA"
        >
          <img src={customLogoUrl} alt="Logo" className="h-9 w-9 object-contain shrink-0" />
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
          src={customLogoUrl}
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
