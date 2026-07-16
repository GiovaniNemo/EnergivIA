import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "EnergivIA",
};

export default function PropostaEnergiaSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      eyebrow="Proposta de energia solar"
      title="Como gerar proposta de energia solar mais rápido sem perder qualidade técnica"
      description="A EnergivIA ajuda integradores a transformar atendimento em proposta enviada no mesmo contato. O fluxo reduz retrabalho, padroniza cálculo e melhora o tempo de resposta comercial."
      problemTitle="O problema da proposta manual no dia a dia do integrador"
      problemParagraphs={[
        "Quando a proposta depende de planilha, troca de mensagens e revisão manual, o ciclo comercial fica lento e inconsistente. Isso reduz a capacidade de resposta justamente quando o lead está mais engajado.",
        "Além da demora, cada vendedor acaba montando propostas com padrões diferentes. O resultado é perda de confiança do cliente, mais ajustes de última hora e menor previsibilidade para gestão comercial.",
        "Em mercados competitivos, responder primeiro com proposta clara e confiável é uma vantagem real. Velocidade sem padrão técnico, porém, vira risco. O ideal é combinar os dois.",
      ]}
      flowTitle="Fluxo recomendado para proposta em alta velocidade"
      flowSteps={[
        "Receba a conta de luz e dados básicos do cliente no WhatsApp ou no chat de atendimento.",
        "Extraia e valide as informações da fatura com apoio da IA para reduzir digitação manual.",
        "Gere simulação com parâmetros técnicos e financeiros organizados para comparação.",
        "Selecione o kit indicado e monte o documento final no mesmo fluxo operacional.",
        "Envie a proposta em PDF no canal de atendimento e siga o avanço no funil comercial.",
      ]}
      examplesTitle="Exemplos de ganho prático na operação"
      examples={[
        {
          title: "Atendimento mais rápido em horários de pico",
          description:
            "Mesmo com múltiplas conversas simultâneas, o time mantém padrão de resposta e evita fila de propostas pendentes para o final do dia.",
        },
        {
          title: "Menos retrabalho entre pré-vendas e engenharia",
          description:
            "Dados estruturados desde a entrada reduzem idas e vindas para correção de consumo, economia estimada e premissas financeiras.",
        },
        {
          title: "Mais clareza para o cliente decidir",
          description:
            "A proposta chega com organização visual e narrativa comercial consistente, facilitando entendimento de retorno e próximos passos.",
        },
        {
          title: "Gestão com visibilidade de execução",
          description:
            "Com processo padronizado, fica mais simples medir tempo de resposta, taxa de envio e impacto na conversão do time.",
        },
      ]}
      comparisonTitle="Manual vs. proposta estruturada com EnergivIA"
      comparisonRows={[
        {
          topic: "Tempo de entrega",
          manual: "Horas entre coleta de dados e PDF final",
          energivia: "Proposta pronta em minutos no mesmo fluxo",
        },
        {
          topic: "Qualidade da informação",
          manual: "Risco alto de erros de digitação",
          energivia: "Dados extraídos e validados com apoio de IA",
        },
        {
          topic: "Consistência comercial",
          manual: "Cada vendedor opera de um jeito",
          energivia: "Padrão único para atendimento e proposta",
        },
        {
          topic: "Escalabilidade",
          manual: "Equipe cresce com custo operacional alto",
          energivia: "Mais propostas por pessoa sem ampliar retrabalho",
        },
      ]}
      faqTitle="FAQ: proposta de energia solar"
      faqItems={[
        {
          question: "A proposta já sai pronta para enviar ao cliente?",
          answer:
            "Sim. O fluxo finaliza com documento em formato profissional, pronto para envio no WhatsApp e acompanhamento comercial.",
        },
        {
          question: "Preciso trocar o processo comercial inteiro para usar?",
          answer:
            "Não. Você pode começar pelo fluxo de proposta e evoluir gradualmente para operação mais integrada com simulação e acompanhamento.",
        },
        {
          question: "Funciona para equipes pequenas e maiores?",
          answer:
            "Sim. O ganho aparece tanto em times enxutos, que precisam de produtividade, quanto em operações maiores, que precisam de padrão e previsibilidade.",
        },
      ]}
      ctaTitle="Quer acelerar a criação de propostas solares?"
      ctaDescription="Teste a EnergivIA e veja como reduzir tempo operacional, manter padrão técnico e aumentar velocidade comercial no mesmo atendimento."
    />
  );
}
