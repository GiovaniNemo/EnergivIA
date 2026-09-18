"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Em quanto tempo consigo gerar a primeira proposta?",
    answer:
      "Após criar sua conta, você já pode enviar a conta de luz do cliente. Nosso motor de IA e OCR lê a fatura, calcula o arranjo fotovoltaico e monta a proposta completa em menos de 2 minutos.",
  },
  {
    question: "Preciso sair do WhatsApp para operar o fluxo comercial?",
    answer:
      "Não. O fluxo foi construído de forma nativa para o WhatsApp: receba a foto da conta de luz, gere a simulação e dispare a proposta e o link interativo diretamente na conversa com o lead.",
  },
  {
    question: "A plataforma substitui meu time de vendas?",
    answer:
      "Não. A EnergivIA funciona como o copiloto técnico do seu time. Ela remove horas de cálculo manual e montagem de propostas no Canva/PowerPoint, liberando seus consultores para negociação e relacionamento.",
  },
  {
    question: "Posso personalizar as propostas com o logotipo e cores da minha empresa?",
    answer:
      "Com certeza. O template da proposta reflete 100% a identidade da sua empresa: sua logo, cores, dados da equipe técnica, condições comerciais e políticas de garantia.",
  },
  {
    question: "Como o algoritmo calcula o retorno financeiro e a economia?",
    answer:
      "Consideramos as tarifas específicas da concessionária local (TUSD, TE, iluminação pública, bandeiras), curva de irradiação solar histórica regional (HSP) e degradação anual dos módulos fotovoltaicos ao longo de 25 anos.",
  },
];

export function FAQAccordion(): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 sm:py-32 bg-slate-950 text-white overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[700px] rounded-full bg-emerald-500/10 blur-[130px]" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-mono text-emerald-300">
            <HelpCircle className="h-3.5 w-3.5" />
            PERGUNTAS FREQUENTES
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Tudo o que você precisa saber
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Dúvidas comuns sobre como a EnergivIA acelera a operação de empresas de energia solar.
          </p>
        </div>

        {/* Accordion list */}
        <div className="mt-12 space-y-4">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-slate-100 pr-4">
                    {item.question}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-emerald-400 border-emerald-400/30" : ""
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm sm:text-base text-slate-400 leading-relaxed border-t border-white/[0.06] pt-4 animate-in fade-in-50 duration-200">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
