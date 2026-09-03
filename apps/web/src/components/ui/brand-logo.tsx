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
      imgClass: "h-full max-h-[48px] w-full object-contain scale-110",
      iconClass: "h-8 w-8",
    },
    md: {
      imgClass: "h-full max-h-[72px] w-full object-contain scale-125",
      iconClass: "h-10 w-10 sm:h-12 sm:w-12 scale-110",
    },
    lg: {
      imgClass: "h-full max-h-[96px] w-full object-contain scale-150",
      iconClass: "h-12 w-12 md:h-16 md:w-16 scale-125",
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
        "flex w-full h-full items-center justify-center select-none transition-opacity hover:opacity-95",
        className
      )}
    >
      {activeCustomLogo ? (
        <img
          src={activeCustomLogo}
          alt="EnergivIA"
          className={cn("w-auto object-contain shrink-0", config.imgClass)}
        />
      ) : (
        <Image
          src={defaultFullLogoSrc}
          alt="EnergivIA"
          width={480}
          height={136}
          className={cn("w-auto object-contain shrink-0", config.imgClass)}
          priority={priority}
          unoptimized
        />
      )}
    </div>
  );
}
