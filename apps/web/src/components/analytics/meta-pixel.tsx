"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "energivia_cookie_consent";
const DEFAULT_PIXEL_ID = "3792893900850746";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * Função utilitária para disparar eventos customizados do Meta Pixel
 * Ex: trackMetaEvent("Lead"), trackMetaEvent("Purchase", { value: 100, currency: "BRL" })
 */
export function trackMetaEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (params) {
      window.fbq("track", eventName, params);
    } else {
      window.fbq("track", eventName);
    }
  }
}

export function MetaPixel(): JSX.Element | null {
  const pixelId = process.env["NEXT_PUBLIC_META_PIXEL_ID"] || DEFAULT_PIXEL_ID;
  const [canTrack, setCanTrack] = useState(false);

  useEffect(() => {
    if (!pixelId) return;

    const checkConsent = () => {
      try {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        // Permite se não for explicitamente limitado a 'essential'
        if (consent !== "essential") {
          setCanTrack(true);
        } else {
          setCanTrack(false);
        }
      } catch {
        setCanTrack(true);
      }
    };

    checkConsent();

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setCanTrack(customEvent.detail === "all");
    };

    window.addEventListener("energivia-cookie-consent-change", handleConsentChange);
    return () => {
      window.removeEventListener("energivia-cookie-consent-change", handleConsentChange);
    };
  }, [pixelId]);

  if (!pixelId || !canTrack) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
