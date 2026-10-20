"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: "wa-ai",
    category: "WhatsApp IA",
    question: "Como funciona a IA no WhatsApp para atendimento aos meus clientes?",
    answer:
      "A IA no WhatsApp atua como seu assistente comercial autônomo. Ela pode tirar dúvidas técnicas sobre energia solar, solicitar a conta de luz do cliente, simular o dimensionamento em tempo real e agendar visitas técnicas direto no seu funil de vendas. Você pode testar e ativar pelo botão 'IA no WhatsApp' no topo da plataforma.",
  },
  {
    id: "proposta-pdf",
    category: "Propostas & Dimensionamento",
    question: "Como gerar e personalizar minhas propostas solares em PDF?",
    answer:
      "Acesse a aba 'Propostas' ou crie diretamente através de uma negociação no CRM. O sistema calcula a geração solar pelo banco de irradiação solar do município, define a potência do inversor e quantidade de módulos e monta um documento comercial executivo completo pronto para envio.",
  },
  {
    id: "trial-planos",
    category: "Planos & Assinaturas",
    question: "O que acontece quando o período de teste grátis (Trial) terminar?",
    answer:
      "Você receberá um aviso na barra superior. Seus dados, leads e propostas anteriores ficam 100% preservados com segurança. Para continuar gerando novas propostas e utilizando a IA, basta acessar a aba 'Meus Planos' e escolher o plano ideal para a sua empresa.",
  },
  {
    id: "equipe-usuarios",
    category: "Equipe & Gestão",
    question: "Como adicionar vendedores e membros na minha equipe?",
    answer:
      "Se você for administrador ou proprietário da conta, acesse 'Equipe' no menu lateral e envie convites por e-mail para seus consultores. Cada consultor terá seu próprio login e poderá gerenciar suas oportunidades de forma organizada.",
  },
  {
    id: "marcas-preferidas",
    category: "Configurações",
    question: "Como definir as marcas de módulos e inversores padrão da minha integradora?",
    answer:
      "No menu lateral em 'Perfil do Integrador' (ou 'Configurações'), você pode selecionar os fabricantes homologados que você comercializa, além de ajustar margens de lucro, valor médio por kWp e taxa de instalação.",
  },
  {
    id: "seguranca-dados",
    category: "Segurança & Privacidade",
    question: "Meus dados de clientes e orçamentos são protegidos?",
    answer:
      "Sim. A plataforma utiliza isolamento multi-inquilino rígido (Row Level Security e tenant scoping), criptografia de dados em trânsito e em repouso, e conformidade rigorosa com a LGPD. Nenhuma outra integradora tem acesso aos seus dados.",
  },
];

export function FaqSection({ onOpenTicket }: { onOpenTicket?: () => void }) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>("wa-ai");

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return FAQ_DATA;
    const query = search.toLowerCase();
    return FAQ_DATA.filter(
      (f) =>
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Barra de Busca de Dúvidas */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="text"
          placeholder="Buscar dúvida frequente (ex: WhatsApp, proposta, planos...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-white dark:bg-[#0f172a]/60 border-neutral-200 dark:border-white/10 text-sm shadow-xs focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Lista de Acordeões */}
      <div className="space-y-3 max-w-3xl mx-auto">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-white/10 p-8 text-center">
            <HelpCircle className="h-8 w-8 text-neutral-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nenhuma resposta encontrada para sua pesquisa.
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Você pode abrir um chamado direto para receber ajuda personalizada da nossa equipe.
            </p>
            {onOpenTicket && (
              <button
                type="button"
                onClick={onOpenTicket}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Abrir chamado agora ➔
              </button>
            )}
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0f172a]/60 overflow-hidden shadow-xs transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
                      {faq.category}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-500" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-white/5 bg-neutral-50/30 dark:bg-black/20">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
