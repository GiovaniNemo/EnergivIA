"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
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

  const config = {
    sm: {
      imgClass: "h-full max-h-[44px] w-full object-contain scale-105",
      iconClass: "h-8 w-8",
    },
    md: {
      imgClass: "h-full max-h-[64px] w-full object-contain scale-[1.10]",
      iconClass: "h-10 w-10 sm:h-12 sm:w-12 scale-105",
    },
    lg: {
      imgClass: "h-full max-h-[80px] w-full object-contain scale-125",
      iconClass: "h-12 w-12 md:h-16 md:w-16 scale-110",
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
        {customLogoLightUrl ? (
          <img
            src={customLogoLightUrl}
            alt="EnergivIA"
            className={cn("object-contain shrink-0 dark:hidden block", config.iconClass)}
          />
        ) : (
          <Image
            src="/favicon-light.png"
            alt="EnergivIA"
            width={120}
            height={120}
            className={cn(
              "shrink-0 object-contain drop-shadow-sm dark:hidden block",
              config.iconClass
            )}
            priority={priority}
            unoptimized
          />
        )}
        {customLogoDarkUrl ? (
          <img
            src={customLogoDarkUrl}
            alt="EnergivIA"
            className={cn("object-contain shrink-0 hidden dark:block", config.iconClass)}
          />
        ) : (
          <Image
            src="/favicon-dark.png"
            alt="EnergivIA"
            width={120}
            height={120}
            className={cn(
              "shrink-0 object-contain drop-shadow-sm hidden dark:block",
              config.iconClass
            )}
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
      {customLogoLightUrl ? (
        <img
          src={customLogoLightUrl}
          alt="EnergivIA"
          className={cn("w-auto object-contain shrink-0 dark:hidden block", config.imgClass)}
        />
      ) : (
        <Image
          src="/logo.png"
          alt="EnergivIA"
          width={480}
          height={136}
          className={cn("w-auto object-contain shrink-0 dark:hidden block", config.imgClass)}
          priority={priority}
          unoptimized
        />
      )}
      {customLogoDarkUrl ? (
        <img
          src={customLogoDarkUrl}
          alt="EnergivIA"
          className={cn("w-auto object-contain shrink-0 hidden dark:block", config.imgClass)}
        />
      ) : (
        <Image
          src="/logo-dark.png"
          alt="EnergivIA"
          width={480}
          height={136}
          className={cn("w-auto object-contain shrink-0 hidden dark:block", config.imgClass)}
          priority={priority}
          unoptimized
        />
      )}
    </div>
  );
}
