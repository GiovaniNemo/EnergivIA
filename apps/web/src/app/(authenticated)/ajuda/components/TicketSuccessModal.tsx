"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    protocol: string;
    subject: string;
    category: string;
    email: string;
  } | null;
  onReset?: () => void;
}

export function TicketSuccessModal({
  open,
  onOpenChange,
  ticket,
  onReset,
}: TicketSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`#${ticket.protocol}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onReset) onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-[#0b0f19] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl">
        <DialogTitle className="sr-only">Chamado Registrado com Sucesso</DialogTitle>

        <div className="flex flex-col items-center text-center">
          {/* Ícone de Sucesso */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 ring-8 ring-emerald-500/5">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Solicitação Registrada!
          </h2>
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400 max-w-sm">
            Nossa equipe técnica e de atendimento já foi notificada e uma confirmação foi enviada
            para <strong className="text-neutral-900 dark:text-neutral-200">{ticket.email}</strong>.
          </p>

          {/* Box de Protocolo em Destaque */}
          <div className="mt-5 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 text-left">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Número de Protocolo
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-neutral-900 dark:text-white tracking-wide">
                #{ticket.protocol}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resumo e SLA */}
          <div className="mt-4 w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] p-3.5 text-left text-xs space-y-1.5">
            <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
              <span>Assunto:</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                {ticket.subject}
              </span>
            </div>
            <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
              <span>Previsão de retorno:</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                Até 4h (urgente) / 24h (geral)
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-6 flex w-full flex-col gap-2.5">
            <Button
              onClick={handleClose}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all"
            >
              Concluir e Voltar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
