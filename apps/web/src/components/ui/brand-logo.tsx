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
  const defaultFullLogoSrc = isDark ? "/logo-dark.png" : "/logo-light.png";
  const defaultIconSrc = isDark ? "/favicon-dark.png" : "/favicon-light.png";

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
      imgClass: "h-7 sm:h-8 w-auto",
      iconClass: "h-7 w-7",
    },
    md: {
      imgClass: "h-8 sm:h-9 md:h-10 w-auto",
      iconClass: "h-8 w-8 sm:h-9 sm:w-9",
    },
    lg: {
      imgClass: "h-11 sm:h-12 md:h-14 w-auto",
      iconClass: "h-11 w-11 md:h-14 md:w-14",
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
        {activeCustomLogo ? (
          <img
            src={activeCustomLogo}
            alt="EnergivIA"
            className={cn("object-contain shrink-0", config.iconClass)}
          />
        ) : (
          <Image
            src={defaultIconSrc}
            alt="EnergivIA"
            width={120}
            height={120}
            className={cn("shrink-0 object-contain drop-shadow-sm", config.iconClass)}
            priority={priority}
            unoptimized
          />
        )}
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
      {activeCustomLogo ? (
        <img
          src={activeCustomLogo}
          alt="EnergivIA"
          className={cn("max-w-[220px] object-contain shrink-0", config.imgClass)}
        />
      ) : (
        <Image
          src={defaultFullLogoSrc}
          alt="EnergivIA"
          width={480}
          height={136}
          className={cn("max-w-[220px] object-contain shrink-0", config.imgClass)}
          priority={priority}
          unoptimized
        />
      )}
    </div>
  );
}
