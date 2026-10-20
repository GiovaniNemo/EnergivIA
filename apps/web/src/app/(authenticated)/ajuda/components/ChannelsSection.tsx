"use client";

import { Mail, Clock, ShieldCheck, ExternalLink } from "lucide-react";

export function ChannelsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Canal E-mail */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0f172a]/60 p-5 shadow-xs backdrop-blur-sm transition-all hover:border-emerald-500/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3.5">
          <Mail className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
          E-mail Corporativo
        </h3>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Canal direto com a diretoria técnica e sócios para dúvidas, sugestões e suporte.
        </p>
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5">
          <a
            href="mailto:contato@energivia.com.br"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            contato@energivia.com.br
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Horário de Atendimento e SLA */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0f172a]/60 p-5 shadow-xs backdrop-blur-sm transition-all hover:border-emerald-500/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3.5">
          <Clock className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
          Horário de Atendimento
        </h3>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Segunda a Sexta-feira, das 08h00 às 18h00 (Horário de Brasília).
        </p>
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>Tempo médio de resposta:</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">Até 4h úteis</span>
        </div>
      </div>

      {/* Status da Plataforma */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0f172a]/60 p-5 shadow-xs backdrop-blur-sm transition-all hover:border-emerald-500/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3.5">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
          Disponibilidade do Sistema
        </h3>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Monitoramento ativo 24/7 com alta disponibilidade e contingência em nuvem.
        </p>
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Todos os serviços operando normalmente
          </span>
        </div>
      </div>
    </div>
  );
}
