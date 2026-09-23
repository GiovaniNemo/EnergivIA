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
      imgClass: "h-full max-h-[34px] w-full object-contain",
      iconClass: "h-7 w-7",
    },
    md: {
      imgClass: "h-full max-h-[38px] md:max-h-[40px] w-full object-contain",
      iconClass: "h-9 w-9",
    },
    lg: {
      imgClass: "h-full max-h-[56px] w-full object-contain",
      iconClass: "h-11 w-11",
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
