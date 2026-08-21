"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          backgroundColor: "#030712",
          color: "#f9fafb",
          fontFamily: "sans-serif",
          padding: "2rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            width: "100%",
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "1rem",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#ef4444", marginTop: 0 }}>
            Erro ao carregar a aplicação
          </h2>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Detalhes técnicos do erro:</p>
          <pre
            style={{
              backgroundColor: "#000",
              padding: "1rem",
              borderRadius: "0.5rem",
              color: "#f87171",
              fontSize: "0.75rem",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {error?.message || "Erro desconhecido"}
            {error?.digest ? `\nID: ${error.digest}` : ""}
            {error?.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.6rem 1.2rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
            <a
              href="/auth/logout"
              style={{ color: "#9ca3af", fontSize: "0.875rem", textDecoration: "underline" }}
            >
              Sair da conta
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
