"use client";

import { useState } from "react";
import {
  LifeBuoy,
  MessageSquarePlus,
  HelpCircle,
  PhoneCall,
  Clock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { TicketForm, type TicketCategory } from "./components/TicketForm";
import { FaqSection } from "./components/FaqSection";
import { ChannelsSection } from "./components/ChannelsSection";
import { TicketSuccessModal } from "./components/TicketSuccessModal";

type ActiveTab = "chamado" | "faq" | "canais";

interface SubmittedTicket {
  protocol: string;
  subject: string;
  category: TicketCategory;
  email: string;
}

export default function CentralAjudaPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("chamado");
  const [successTicket, setSuccessTicket] = useState<SubmittedTicket | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const handleTicketSuccess = (ticket: SubmittedTicket) => {
    setSuccessTicket(ticket);
    setSuccessModalOpen(true);
  };

  return (
    <div className="min-h-full pb-16">
      {/* Hero Header Institucional */}
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-white/10 bg-gradient-to-b from-white via-neutral-50/50 to-white dark:from-[#0b0f19] dark:via-[#070b13] dark:to-[#0b0f19] p-6 sm:p-10 shadow-xs mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>Central de Atendimento & Suporte</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Como podemos ajudar você hoje?
          </h1>

          <p className="mt-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
            Abra chamados para suporte técnico, envie sugestões de melhorias ou relate dificuldades
            diretamente para nossa diretoria e equipe técnica. Cada chamado gera um protocolo
            corporativo com acompanhamento por e-mail.
          </p>
        </div>

        {/* Badges de Garantia de Atendimento */}
        <div className="mt-6 pt-6 border-t border-neutral-200/80 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
            <span>Retorno rápido em até 4h úteis</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="h-4 w-4" />
            </div>
            <span className="truncate">contato@energivia.com.br</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>Acompanhamento por protocolo</span>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 mb-8 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("chamado")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "chamado"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Abrir Chamado / Reportar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "faq"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Dúvidas Frequentes (FAQ)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("canais")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "canais"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <PhoneCall className="h-4 w-4" />
          <span>Canais Oficiais & SLA</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico por Aba */}
      {activeTab === "chamado" && (
        <div className="max-w-3xl mx-auto rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#070b13] p-6 sm:p-9 shadow-sm">
          <div className="mb-6 pb-4 border-b border-neutral-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Nova Solicitação de Atendimento
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Preencha os campos abaixo com o máximo de detalhes possível para agilizar seu
              atendimento.
            </p>
          </div>
          <TicketForm onSuccess={handleTicketSuccess} />
        </div>
      )}

      {activeTab === "faq" && <FaqSection onOpenTicket={() => setActiveTab("chamado")} />}

      {activeTab === "canais" && <ChannelsSection />}

      {/* Modal de Sucesso com Protocolo */}
      <TicketSuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        ticket={successTicket}
        onReset={() => {
          setSuccessTicket(null);
          setActiveTab("chamado");
        }}
      />
    </div>
  );
}
