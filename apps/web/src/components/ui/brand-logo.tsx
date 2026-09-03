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
      imgClass: "h-8 max-h-9 w-auto max-w-[190px]",
      iconClass: "h-7 w-7",
    },
    md: {
      imgClass: "h-11 sm:h-12 w-full max-h-[48px] max-w-[250px]",
      iconClass: "h-8 w-8 sm:h-9 sm:w-9",
    },
    lg: {
      imgClass: "h-14 sm:h-16 w-full max-h-[60px] max-w-[320px]",
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
        "flex w-full h-full items-center justify-center select-none transition-opacity hover:opacity-95 px-1",
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
