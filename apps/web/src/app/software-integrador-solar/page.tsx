import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "EnergivIA",
};

export default function SoftwareIntegradorSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      eyebrow="Software para integrador solar"
      title="O que um software para integrador solar precisa entregar para aumentar conversão"
      description="Mais do que gerar PDF, um bom software precisa acelerar atendimento, organizar processo e sustentar escala comercial. A EnergivIA foi desenhada para esse cenário."
      problemTitle="Quando a operação depende de ferramentas desconectadas"
      problemParagraphs={[
        "Integradores costumam operar com múltiplas ferramentas sem integração real entre atendimento, simulação e proposta. Isso aumenta o tempo de execução e cria ruído entre comercial e operação.",
        "A falta de padronização dificulta crescimento. Cada vendedor trabalha com seu método, o que torna a qualidade da proposta inconsistente e reduz previsibilidade dos resultados.",
        "Sem um sistema unificado, o gestor perde visibilidade sobre gargalos do funil e não consegue agir com rapidez para melhorar desempenho da equipe.",
      ]}
      flowTitle="O que avaliar em um software comercial para energia solar"
      flowSteps={[
        "Centralização do fluxo: atendimento, simulação e proposta no mesmo ambiente.",
        "Automação de tarefas repetitivas para reduzir esforço manual da equipe.",
        "Padronização de etapas para manter qualidade mesmo com times maiores.",
        "Integração com WhatsApp para execução no canal que o cliente já usa.",
        "Visibilidade operacional para acompanhar tempo de resposta e evolução do funil.",
      ]}
      examplesTitle="Resultados esperados com plataforma estruturada"
      examples={[
        {
          title: "Onboarding comercial mais rápido",
          description:
            "Novos vendedores seguem um fluxo padrão desde o início e entregam propostas com maior consistência.",
        },
        {
          title: "Gestão mais orientada por indicadores",
          description:
            "Com dados centralizados, fica mais simples identificar onde o processo está travando e ajustar rotina do time.",
        },
        {
          title: "Menos dependência de pessoas-chave",
          description:
            "O conhecimento operacional sai da planilha individual e vira processo replicável para toda a equipe.",
        },
        {
          title: "Escala comercial com controle",
          description:
            "A operação cresce sem perder padrão de atendimento e qualidade na entrega de propostas.",
        },
      ]}
      comparisonTitle="Critérios práticos para escolher o software"
      comparisonRows={[
        {
          topic: "Fluxo comercial",
          manual: "Ferramentas fragmentadas e retrabalho",
          energivia: "Processo unificado com etapas conectadas",
        },
        {
          topic: "Adoção pela equipe",
          manual: "Treinamento longo e pouco padrão",
          energivia: "Rotina simples com execução guiada",
        },
        {
          topic: "Velocidade de entrega",
          manual: "Propostas com prazo imprevisível",
          energivia: "Retorno mais rápido para o cliente final",
        },
        {
          topic: "Escalabilidade",
          manual: "Crescimento aumenta caos operacional",
          energivia: "Escala com governança e consistência",
        },
      ]}
      faqTitle="FAQ: software para integrador solar"
      faqItems={[
        {
          question: "A EnergivIA é só um gerador de propostas?",
          answer:
            "Não. A proposta é parte do fluxo. A plataforma conecta atendimento, simulação, seleção de kit e acompanhamento comercial.",
        },
        {
          question: "Preciso de equipe técnica grande para operar?",
          answer:
            "Não. O fluxo foi desenhado para facilitar a rotina comercial e reduzir dependência de processos manuais complexos.",
        },
        {
          question: "O software funciona para integradores em fase de crescimento?",
          answer:
            "Sim. Justamente nesse momento, padronização e velocidade fazem diferença para escalar sem perder qualidade.",
        },
      ]}
      ctaTitle="Busca um software completo para operação solar?"
      ctaDescription="Conheça a EnergivIA e veja como integrar atendimento, simulação e proposta em um fluxo comercial mais rápido e previsível."
    />
  );
}
