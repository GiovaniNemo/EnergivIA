import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "Gerador de Proposta de Energia Solar | Orçamentos em Segundos",
  description:
    "Crie propostas comerciais de energia solar interativas e em PDF com cálculos fotovoltaicos automáticos, link no WhatsApp e alta taxa de conversão.",
  openGraph: {
    title: "Gerador de Proposta de Energia Solar | EnergivIA",
    description:
      "Apresente orçamentos solares modernos e profissionais aos seus clientes em poucos cliques.",
    images: ["/og/og-image-1200x630.jpg"],
  },
};

export default function PropostaEnergiaSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      pathname="/proposta-energia-solar"
      eyebrow="Proposta de energia solar"
      title="Como gerar propostas de energia solar que transmitem autoridade e aceleram o fechamento"
      description="A proposta comercial é o momento mais crítico da venda solar. Descubra como transformar dados de faturas em orçamentos executivos, interativos e em PDF com cálculos automáticos e envio instantâneo no WhatsApp."
      problemTitle="Por que propostas manuais e genéricas estão custando caro para os integradores"
      problemParagraphs={[
        "No mercado fotovoltaico atual, o cliente final costuma solicitar cotações para 3 ou 4 integradores simultaneamente. A empresa que demora para responder ou entrega um arquivo em PDF desformatado, montado no Word ou com prints de planilha, é descartada quase de imediato.",
        "Propostas confusas, que omitem dados cruciais como marcas dos equipamentos homologados, taxas de degradação dos módulos, custo de disponibilidade da concessionária ou impacto real da Lei 14.300, geram insegurança no cliente e abrem espaço para concorrentes que comunicam clareza e solidez.",
        "Além disso, o tempo investido pelo time comercial montando cada proposta manualmente impede que os consultores façam follow-up ativo com leads mornos. O resultado é um funil com alto custo de aquisição e baixa taxa de conversão final.",
        "Com a EnergivIA, a proposta solar deixa de ser um entrave operacional e passa a ser uma ferramenta de vendas de alto impacto visual, entregue em menos de 2 minutos no WhatsApp do cliente.",
      ]}
      flowTitle="O passo a passo para criar uma proposta fotovoltaica de alta conversão"
      flowSteps={[
        "Envio da conta de energia no WhatsApp ou upload do arquivo no painel de vendas da integradora.",
        "Leitura automática por inteligência artificial, identificando concessionária, histórico de consumo de 12 meses e tipo de conexão (mono, bi ou trifásica).",
        "Dimensionamento inteligente da potência recomendada (kWp) e cálculo da geração média mensal com base na irradiação solar (HSP) do município.",
        "Composição automática de opções comerciais em camadas: opções Standard, Elite e Premium para dar poder de escolha ao cliente.",
        "Simulação de retorno do investimento (Payback, VPL e TIR) com estimativa de economia acumulada em 25 anos considerando inflação energética.",
        "Disparo imediato do link de proposta interativa e PDF executivo pronto para assinatura com rastreamento de abertura em tempo real.",
      ]}
      examplesTitle="Resultados práticos de uma proposta comercial moderna"
      examples={[
        {
          title: "Apresentação profissional que vence concorrência",
          description:
            "Design moderno com layout executivo, gráficos limpos de consumo x geração e detalhamento de inversores e módulos homologados pelo Inmetro.",
        },
        {
          title: "Poder de escolha com opções de kits (Tiering)",
          description:
            "Apresente 3 opções de kits com diferentes marcas e potências na mesma proposta, aumentando o ticket médio e evitando que o cliente busque opções fora.",
        },
        {
          title: "Follow-up no momento exato da leitura",
          description:
            "Receba um aviso no momento exato em que o tomador de decisão abre o documento, permitindo um contato proativo enquanto o interesse está em alta.",
        },
        {
          title: "Aceite online sem papel ou burocracia",
          description:
            "O cliente aprova a proposta comercial com um clique pelo celular, formalizando o interesse e agilizando a vistoria técnica e contrato final.",
        },
      ]}
      comparisonTitle="Comparativo: Proposta tradicional x Proposta EnergivIA"
      comparisonRows={[
        {
          topic: "Formato de entrega ao cliente",
          manual: "PDF estático e pesado enviado por e-mail ou documento impresso",
          energivia: "Link interativo otimizado para celular + PDF executivo para download",
        },
        {
          topic: "Tempo de elaboração técnica",
          manual: "De 45 minutos a 3 horas por proposta comercial",
          energivia: "Menos de 2 minutos com dimensionamento e kit inclusos",
        },
        {
          topic: "Opções de equipamentos",
          manual: "Cotação única; qualquer alteração exige refazer o documento todo",
          energivia: "Múltiplos tiers (Standard, Elite, Premium) comparados lado a lado",
        },
        {
          topic: "Notificação de abertura",
          manual: "Nenhuma visibilidade; o vendedor não sabe se o cliente leu",
          energivia: "Aviso em tempo real quando o cliente abre e visualiza a proposta",
        },
        {
          topic: "Clareza financeira (Lei 14.300)",
          manual: "Planilhas antigas que prometem 95% de economia sem considerar taxas",
          energivia: "Cálculo transparente com transição do Fio B e custo de disponibilidade",
        },
        {
          topic: "Formalização e aceite",
          manual: "Impressão, assinatura física, escaneamento e reenvio por WhatsApp",
          energivia: "Botão de aceite digital direto na tela da proposta",
        },
      ]}
      checklistTitle="Checklist: A anatomia da proposta de energia solar perfeita"
      checklistDescription="Confira os elementos obrigatórios que transformam uma simples cotação em um instrumento poderoso de fechamento de vendas."
      checklistItems={[
        {
          title: "Capa executiva personalizada",
          description:
            "Logotipo da integradora, foto do projeto ou da sede da empresa, nome do cliente e dados de contato do consultor responsável.",
          detail: "Primeira impressão profissional e confiável",
        },
        {
          title: "Gráfico de Consumo x Geração",
          description:
            "Visualização clara mês a mês comparando o histórico de consumo da fatura com a geração estimada do sistema ao longo do ano.",
          detail: "Compreensão imediata para o cliente leigo",
        },
        {
          title: "BOM detalhado com homologação Inmetro",
          description:
            "Quantidade de módulos, inversores, estruturas de fixação e cabeamento com registro de homologação e garantia dos fabricantes.",
          detail: "Transparência total contra equipamentos piratas",
        },
        {
          title: "Estudo financeiro de Payback e Economia",
          description:
            "Tempo estimado de retorno do investimento (payback simples e descontado), taxa interna de retorno (TIR) e economia projetada em 25 anos.",
          detail: "Demonstração de que a energia solar supera investimentos bancários",
        },
        {
          title: "Condições de pagamento e parcelamento",
          description:
            "Opções à vista, financiamento bancário solar e parcelamento no cartão de crédito em até 18x ou 21x com taxas simuladas.",
          detail: "Flexibilidade para fechar sem objeção de capital",
        },
        {
          title: "Termo de aceite e garantias de serviço",
          description:
            "Cláusulas claras de validade da proposta, cronograma de engenharia e prazos de garantia da instalação e dos equipamentos.",
          detail: "Segurança jurídica para integrador e cliente",
        },
      ]}
      segmentsTitle="Propostas sob medida para cada tipo de cliente"
      segmentsDescription="Ajuste a linguagem e os dados apresentados de acordo com as prioridades de quem decide a compra."
      segments={[
        {
          badge: "Cliente Residencial B1",
          title: "Foco em economia na conta de luz e valorização do imóvel",
          scenario:
            "Famílias que buscam previsibilidade nos gastos mensais e proteção contra reajustes tarifários da distribuidora.",
          resolution:
            "Proposta visualmente atraente, explicando de forma simples a compensação de créditos e o valor da parcela comparado à conta atual.",
          metrics: "Economia mensal imediata superior a 80%",
        },
        {
          badge: "Comércio, Serviços e PMEs B3",
          title: "Foco em redução de custos operacionais e fluxo de caixa",
          scenario:
            "Padarias, supermercados, academias, farmácias e escritórios com alto consumo em horário comercial.",
          resolution:
            "Destaque para o payback rápido (frequentemente inferior a 3 anos) e reinvestimento do capital economizado no próprio negócio.",
          metrics: "Redução de até 90% no custo com eletricidade",
        },
        {
          badge: "Produtor Rural e Agronegócio",
          title: "Irrigação, aviários e redução de despesas com diesel",
          scenario:
            "Propriedades rurais que necessitam de usinas de solo ou telhados de galpões para viabilizar safras e armazenamento.",
          resolution:
            "Análise de sazonalidade e compatibilidade com linhas de crédito rural (Pronaf, Pronamp, FCO e Plano Safra).",
          metrics: "Proteção contra bandeiras tarifárias e seca",
        },
        {
          badge: "Indústrias e Alta Tensão (Grupo A)",
          title: "Estudo tarifário de demanda na ponta e fora de ponta",
          scenario:
            "Grandes consumidores que operam com contratos de demanda e buscam migração para Mercado Livre ou autoprodução local.",
          resolution:
            "Relatório executivo técnico com gráficos de carga, potência reativa e viabilidade regulatória avançada.",
          metrics: "Economia de centenas de milhares de reais ao ano",
        },
      ]}
      faqTitle="Perguntas frequentes sobre o gerador de propostas solares"
      faqItems={[
        {
          question: "Como o cliente recebe e visualiza a proposta comercial?",
          answer:
            "O cliente recebe um link exclusivo e seguro pelo WhatsApp ou e-mail, que abre uma proposta interativa com visual moderno e responsivo, adaptada perfeitamente à tela de qualquer smartphone. Além disso, há um botão para baixar o documento oficial completo em PDF em alta resolução.",
        },
        {
          question:
            "Como a proposta calcula o retorno financeiro com as novas regras da Lei 14.300?",
          answer:
            "Nosso motor matemático aplica com rigor a transição progressiva do Fio B estabelecida na lei, a taxa de simultaneidade do consumo e o custo de disponibilidade da concessionária. Dessa forma, o payback exibido ao cliente é fidedigno e reflete a realidade da conta de energia pós-instalação.",
        },
        {
          question:
            "Posso incluir opções de financiamento bancário e cartão de crédito na proposta?",
          answer:
            "Sim. Você pode configurar as condições de financiamento dos principais bancos do setor (BV, Santander, Solfácil, FinanZero, etc.) e simulações de cartão de crédito em até 21x, permitindo que o cliente compare a parcela do financiamento com o valor da economia na conta de luz.",
        },
        {
          question: "A integradora é notificada quando o cliente abre o orçamento?",
          answer:
            "Sim! Cada proposta possui rastreamento ativo de visualização. Assim que o cliente abre o link, seu time comercial recebe uma notificação instantânea, permitindo agir no momento exato em que o cliente está analisando o investimento.",
        },
        {
          question: "É possível oferecer mais de uma opção de kit na mesma proposta?",
          answer:
            "Sim. É possível apresentar propostas com comparação entre opções Standard, Elite e Premium. Essa técnica de vendas em camadas aumenta as chances de fechamento ao oferecer alternativas com diferentes marcas de módulos e microinversores ou inversores string.",
        },
        {
          question: "A proposta possui validade configurável?",
          answer:
            "Sim. O integrador define o prazo de validade comercial (por exemplo, 5, 10 ou 15 dias). Caso a validade expire, a proposta exibe um aviso orientando o cliente a solicitar uma revalidação de preços dos equipamentos.",
        },
      ]}
      relatedTitle="Continue aprimorando seu processo de vendas"
      relatedLinks={[
        {
          href: "/software-integrador-solar",
          title: "Software para Integrador Solar",
          description:
            "Entenda como centralizar atendimento, simulação e contratos em um sistema único.",
        },
        {
          href: "/simulacao-energia-solar",
          title: "Simulação Fotovoltaica com IA",
          description:
            "Conheça os cálculos de engenharia e base solarimétrica por trás de cada orçamento.",
        },
        {
          href: "/crm-energia-solar",
          title: "CRM para Energia Solar",
          description:
            "Como organizar os leads recebidos e aumentar a taxa de conversão do seu time comercial.",
        },
      ]}
      ctaTitle="Pronto para impressionar seus clientes com propostas solares irresistíveis?"
      ctaDescription="Crie sua conta na EnergivIA e comece a gerar propostas fotovoltaicas de alto padrão em menos de 2 minutos hoje mesmo."
    />
  );
}
