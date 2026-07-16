import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "EnergivIA",
};

export default function CrmEnergiaSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      eyebrow="CRM energia solar"
      title="CRM para energia solar: como organizar funil e responder mais rápido"
      description="Sem gestão de funil, oportunidades se perdem entre conversas, planilhas e tarefas manuais. A EnergivIA ajuda a conectar CRM, proposta e operação no mesmo fluxo."
      problemTitle="Onde o processo comercial costuma quebrar"
      problemParagraphs={[
        "Em muitas operações solares, o histórico do cliente fica espalhado em conversas e arquivos. Isso dificulta continuidade do atendimento e aumenta perda de contexto entre etapas.",
        "Quando o funil não está claro, o time comercial reage no improviso: leads quentes esfriam, follow-up atrasa e oportunidades com potencial acabam esquecidas.",
        "Um CRM para energia solar precisa ir além do cadastro. Ele deve estar conectado com simulação e proposta para transformar atividade comercial em fechamento real.",
      ]}
      flowTitle="Estrutura de CRM que melhora execução comercial"
      flowSteps={[
        "Registrar origem e status do lead no início do atendimento.",
        "Vincular dados de consumo e informações da fatura ao cadastro do cliente.",
        "Executar simulação e proposta sem perder contexto do funil.",
        "Enviar documento no WhatsApp e registrar o avanço da negociação.",
        "Acompanhar próximos passos com visão clara das oportunidades prioritárias.",
      ]}
      examplesTitle="Exemplos de uso do CRM no contexto solar"
      examples={[
        {
          title: "Recuperação de leads parados",
          description:
            "Com funil organizado, o gestor identifica etapas travadas e aciona campanhas de retomada com foco em oportunidades mais quentes.",
        },
        {
          title: "Follow-up consistente do time",
          description:
            "Cada vendedor sabe quais contatos priorizar e quais ações precisam ser executadas para avançar a negociação.",
        },
        {
          title: "Histórico completo por oportunidade",
          description:
            "Simulação, proposta enviada e interações ficam no mesmo contexto, facilitando continuidade mesmo com troca de responsável.",
        },
        {
          title: "Previsibilidade de fechamento",
          description:
            "Com etapas definidas e dados organizados, fica mais simples estimar resultados e ajustar estratégia comercial.",
        },
      ]}
      comparisonTitle="Como o CRM conectado ao fluxo melhora resultados"
      comparisonRows={[
        {
          topic: "Controle de pipeline",
          manual: "Status disperso em planilhas e conversas",
          energivia: "Visão clara das etapas e prioridades",
        },
        {
          topic: "Execução de follow-up",
          manual: "Ações reativas e pouco previsíveis",
          energivia: "Ritmo comercial com contexto por lead",
        },
        {
          topic: "Integração com proposta",
          manual: "CRM separado da operação de venda",
          energivia: "Funil conectado à simulação e proposta",
        },
        {
          topic: "Gestão de performance",
          manual: "Baixa visibilidade de gargalos",
          energivia: "Dados para decisões rápidas de gestão",
        },
      ]}
      faqTitle="FAQ: CRM para energia solar"
      faqItems={[
        {
          question: "A EnergivIA substitui um CRM tradicional?",
          answer:
            "Ela cobre a necessidade comercial focada no fluxo solar, conectando atendimento, proposta e evolução do funil no mesmo processo.",
        },
        {
          question: "Consigo acompanhar o andamento dos leads com clareza?",
          answer:
            "Sim. O objetivo é dar visão de status e próximos passos para evitar perda de oportunidades e melhorar ritmo de follow-up.",
        },
        {
          question: "O CRM fica integrado ao WhatsApp?",
          answer:
            "Sim. A execução comercial acontece no canal de atendimento e mantém o contexto operacional para proposta e avanço de negociação.",
        },
      ]}
      ctaTitle="Quer um CRM alinhado à operação solar real?"
      ctaDescription="A EnergivIA conecta CRM, simulação e proposta para seu time vender com mais velocidade e controle do funil."
    />
  );
}
