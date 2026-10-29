"use client";

import { useEffect, useRef } from "react";
import type { DealStage } from "@/lib/leads-api";

export const PIPELINE_UPDATED_EVENT = "energivia-pipeline-updated";
export const PIPELINE_CHANNEL_NAME = "energivia_pipeline_sync_channel";

export interface PipelineSyncPayload {
  dealId?: string;
  leadId?: string;
  stage?: DealStage;
  source?: "painel" | "pipeline" | "proposal" | "sale";
  timestamp?: number;
}

let sharedChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!sharedChannel) {
    try {
      sharedChannel = new BroadcastChannel(PIPELINE_CHANNEL_NAME);
    } catch {
      sharedChannel = null;
    }
  }
  return sharedChannel;
}

/**
 * Notifica que o pipeline / funil foi atualizado (ex: card arrastado no Painel, em Negociações, ou venda convertida).
 * Sincroniza tanto a aba atual (CustomEvent) quanto outras abas abertas (BroadcastChannel).
 */
export function notifyPipelineUpdated(payload?: PipelineSyncPayload): void {
  if (typeof window === "undefined") return;

  const fullPayload: PipelineSyncPayload = {
    ...payload,
    timestamp: Date.now(),
  };

  // 1. Aba atual
  try {
    window.dispatchEvent(
      new CustomEvent<PipelineSyncPayload>(PIPELINE_UPDATED_EVENT, {
        detail: fullPayload,
      })
    );
  } catch {
    // Silently ignore if window dispatch fails
  }

  // 2. Outras abas (BroadcastChannel)
  try {
    const channel = getBroadcastChannel();
    channel?.postMessage(fullPayload);
  } catch {
    // Silently ignore if broadcast fails
  }
}

/**
 * Hook para escutar atualizações do pipeline em tempo real e reagir imediatamente (ex: recarregar lista ou invalidar cache).
 */
export function usePipelineSync(onUpdate: (payload?: PipelineSyncPayload) => void): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listener para a mesma aba
    const handleLocalEvent = (event: Event) => {
      const customEvent = event as CustomEvent<PipelineSyncPayload>;
      onUpdateRef.current(customEvent.detail);
    };

    window.addEventListener(PIPELINE_UPDATED_EVENT, handleLocalEvent);

    // Listener para outras abas
    let channel: BroadcastChannel | null = null;
    const handleBroadcastMessage = (event: MessageEvent<PipelineSyncPayload>) => {
      if (event.data) {
        onUpdateRef.current(event.data);
      }
    };

    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(PIPELINE_CHANNEL_NAME);
        channel.addEventListener("message", handleBroadcastMessage);
      } catch {
        channel = null;
      }
    }

    return () => {
      window.removeEventListener(PIPELINE_UPDATED_EVENT, handleLocalEvent);
      if (channel) {
        channel.removeEventListener("message", handleBroadcastMessage);
        channel.close();
      }
    };
  }, []);
}
