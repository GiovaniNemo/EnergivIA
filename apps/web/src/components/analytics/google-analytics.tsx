"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "energivia_cookie_consent";

export function GoogleAnalytics(): JSX.Element | null {
  const gaId = process.env["NEXT_PUBLIC_GA_ID"];
  const [canTrack, setCanTrack] = useState(false);

  useEffect(() => {
    if (!gaId) return;

    const checkConsent = () => {
      try {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        // Default allow if user hasn't explicitly chosen 'essential' only, or if explicitly 'all'
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
  }, [gaId]);

  if (!gaId || !canTrack) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true
            });
          `,
        }}
      />
    </>
  );
}
