"use client";

import { useEffect, useState } from "react";
import { getChatbaseIdentity } from "@/lib/chatbase-api";

const CHATBASE_AGENT_ID = process.env["NEXT_PUBLIC_CHATBASE_AGENT_ID"];

export function ChatbaseChatPage(): JSX.Element {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CHATBASE_AGENT_ID) {
      setError("Chatbase não está configurado (NEXT_PUBLIC_CHATBASE_AGENT_ID ausente).");
      return;
    }
    let cancelled = false;
    getChatbaseIdentity()
      .then(({ userId, userHash }) => {
        if (cancelled) return;
        const params = new URLSearchParams({ userId, userHash });
        setIframeSrc(
          `https://www.chatbase.co/chatbot-iframe/${CHATBASE_AGENT_ID}?${params.toString()}`
        );
      })
      .catch(() => {
        if (!cancelled) setIframeSrc(`https://www.chatbase.co/chatbot-iframe/${CHATBASE_AGENT_ID}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-[var(--color-background)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-card)] px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight tracking-tight">
              Assistente IA de Propostas
            </h1>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              Converse com o assistente para tirar dúvidas sobre o catálogo e o processo comercial
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden">
        {error ? (
          <p className="m-auto text-sm text-[var(--color-muted-foreground)]">{error}</p>
        ) : iframeSrc ? (
          <iframe
            src={iframeSrc}
            title="Chatbase"
            className="h-full w-full border-0"
            allow="clipboard-write"
          />
        ) : (
          <p className="m-auto text-sm text-[var(--color-muted-foreground)]">
            Carregando assistente…
          </p>
        )}
      </div>
    </div>
  );
}
