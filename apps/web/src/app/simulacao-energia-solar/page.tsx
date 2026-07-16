import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "EnergivIA",
};

export default function SimulacaoEnergiaSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      eyebrow="Simulação de energia solar"
      title="Simulação de energia solar com velocidade comercial e consistência técnica"
      description="A simulação é o centro da proposta. Com a EnergivIA, integradores conseguem transformar dados da conta em cenários claros para o cliente sem travar a operação."
      problemTitle="Por que a simulação manual trava o crescimento"
      problemParagraphs={[
        "Muitas equipes comerciais dependem de processos manuais para calcular cenários de economia e dimensionamento inicial. Isso gera gargalo operacional e limita quantidade de atendimentos por dia.",
        "Quando o vendedor demora para retornar com estimativa, o lead perde interesse ou compara com concorrentes mais rápidos. Velocidade de resposta é um fator decisivo na etapa de avaliação.",
        "A simulação precisa ser rápida, mas também confiável. Sem estrutura de dados e critérios padronizados, aumenta o risco de apresentar valores inconsistentes e perder credibilidade.",
      ]}
      flowTitle="Como estruturar uma simulação mais eficiente"
      flowSteps={[
        "Receba a fatura e informações iniciais do cliente no canal comercial.",
        "Extraia dados relevantes para consumo, perfil e premissas financeiras.",
        "Monte cenário de simulação com parâmetros claros para equipe e cliente.",
        "Converta o cenário aprovado em proposta com kit e apresentação profissional.",
        "Envie no WhatsApp e acompanhe o próximo passo da negociação.",
      ]}
      examplesTitle="Cenários onde a simulação rápida gera vantagem"
      examples={[
        {
          title: "Lead quente pedindo retorno imediato",
          description:
            "Seu time responde no mesmo contato com cenário inicial validado, mantendo o interesse e reduzindo risco de perda para concorrentes.",
        },
        {
          title: "Filial com alto volume de atendimentos",
          description:
            "Processo padronizado diminui filas internas e evita atrasos em momentos de pico comercial.",
        },
        {
          title: "Revisão de proposta após objeção",
          description:
            "Ajustes de parâmetros podem ser feitos com rapidez sem reconstruir tudo do zero.",
        },
        {
          title: "Operação com múltiplos vendedores",
          description:
            "Todos seguem o mesmo fluxo de simulação, o que melhora governança e previsibilidade de entrega.",
        },
      ]}
      comparisonTitle="Como a simulação muda com processo estruturado"
      comparisonRows={[
        {
          topic: "Velocidade para gerar cenário",
          manual: "Depende de disponibilidade individual",
          energivia: "Fluxo padronizado e mais rápido para todo o time",
        },
        {
          topic: "Confiabilidade dos números",
          manual: "Varia conforme cada planilha e operador",
          energivia: "Premissas organizadas com base na fatura",
        },
        {
          topic: "Integração com proposta",
          manual: "Etapas desconectadas",
          energivia: "Simulação integrada ao documento final",
        },
        {
          topic: "Experiência do cliente",
          manual: "Retorno lento e pouco previsível",
          energivia: "Resposta mais ágil no canal de atendimento",
        },
      ]}
      faqTitle="FAQ: simulação de energia solar"
      faqItems={[
        {
          question: "A simulação já considera dados da conta de luz?",
          answer:
            "Sim. O fluxo parte da fatura para estruturar os principais parâmetros e acelerar a análise inicial.",
        },
        {
          question: "Consigo transformar a simulação em proposta no mesmo processo?",
          answer:
            "Sim. A EnergivIA conecta simulação, seleção de kit e geração da proposta sem quebrar o fluxo operacional.",
        },
        {
          question: "A simulação ajuda a reduzir tempo de resposta comercial?",
          answer:
            "Sim. Ao reduzir tarefas manuais e padronizar etapas, o time consegue retornar ao cliente com muito mais rapidez.",
        },
      ]}
      ctaTitle="Quer simular e enviar proposta em menos tempo?"
      ctaDescription="Use a EnergivIA para acelerar a simulação de energia solar e manter sua operação comercial mais previsível."
    />
  );
}
