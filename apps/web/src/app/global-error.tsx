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

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <html lang="pt-BR">
      <body
        style={{
          backgroundColor: "#030712",
          color: "#f9fafb",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
            maxWidth: "540px",
            width: "100%",
            backgroundColor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}
          >
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0.5rem",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f87171",
                fontSize: "1.25rem",
                fontWeight: "bold",
              }}
            >
              !
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Falha ao carregar a aplicação
            </h2>
          </div>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              marginTop: 0,
              marginBottom: "1.25rem",
            }}
          >
            Ocorreu uma instabilidade crítica no carregamento. Nossa equipe já foi notificada para
            correção.
          </p>

          <div
            style={{
              backgroundColor: "#020617",
              border: "1px solid #1e293b",
              padding: "1rem",
              borderRadius: "0.75rem",
              color: "#cbd5e1",
              fontSize: "0.8rem",
              overflowX: "auto",
              marginBottom: "1.5rem",
              fontFamily: "monospace",
            }}
          >
            <div style={{ color: "#f87171", fontWeight: "600" }}>
              {error?.message || "Erro interno no servidor"}
            </div>
            {error?.digest && (
              <div style={{ color: "#64748b", marginTop: "0.25rem", fontSize: "0.75rem" }}>
                Código do Erro: {error.digest}
              </div>
            )}
            {isDev && error?.stack && (
              <pre
                style={{
                  marginTop: "0.75rem",
                  color: "#94a3b8",
                  fontSize: "0.7rem",
                  whiteSpace: "pre-wrap",
                  maxHeight: "180px",
                  overflowY: "auto",
                }}
              >
                {error.stack}
              </pre>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#0d9488",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.625rem 1.25rem",
                fontWeight: "600",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
            <a
              href="/"
              style={{
                color: "#94a3b8",
                fontSize: "0.875rem",
                textDecoration: "none",
                padding: "0.625rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #334155",
              }}
            >
              Ir para o Início
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
