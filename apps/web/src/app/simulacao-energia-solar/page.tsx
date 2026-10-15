import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "Simulação de Energia Solar | Cálculos Fotovoltaicos com IA",
  description:
    "Faça simulações fotovoltaicas precisas a partir da conta de luz em instantes, dimensione sistemas solares e gere estimativas de payback com a EnergivIA.",
  openGraph: {
    title: "Simulação de Energia Solar | EnergivIA",
    description:
      "Transforme dados da fatura em dimensionamentos solares completos e propostas de alto impacto em segundos.",
    images: ["/og/og-image-1200x630.jpg"],
  },
};

export default function SimulacaoEnergiaSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      pathname="/simulacao-energia-solar"
      eyebrow="Simulação de energia solar"
      title="Simulação de Energia Solar com IA: Precisão Técnica e Retorno Financeiro Comprovado"
      description="Transforme contas de energia em estudos fotovoltaicos completos em segundos. Cálculos automáticos de irradiação solar (HSP), perdas térmicas (PR), compensação da Lei 14.300 e projeção de Payback real."
      problemTitle="O perigo das simulações solares superficiais e imprecisas"
      problemParagraphs={[
        "Muitas ferramentas comerciais de energia solar utilizam regras simplórias de 'três' ou multiplicadores genéricos para calcular a geração estimada. Essa abordagem amadora ignora variações climáticas regionais, orientação dos módulos, sombreamento e as perdas normativas do sistema (cabeamento, sujeira, temperatura e eficiência do inversor).",
        "O resultado de uma simulação mal calculada é catastrófico para o integrador: sistemas subdimensionados que não entregam a economia prometida, clientes frustrados exigindo módulos adicionais por conta da empresa ou propostas superdimensionadas que perdem concorrência por preço excessivo.",
        "Com o advento da Lei 14.300, a simulação ficou ainda mais exigente. Não basta calcular kWh gerado: é obrigatório simular o percentual de autoconsumo simultâneo e a injeção na rede para aplicar a cobrança progressiva do Fio B sobre a energia compensada.",
        "A EnergivIA resolve esse desafio integrando a base solarimétrica municipal brasileira com inteligência artificial, entregando simulações precisas de engenharia com a velocidade que o fechamento comercial exige.",
      ]}
      flowTitle="Como funciona o motor de simulação inteligente da EnergivIA"
      flowSteps={[
        "Extração imediata do consumo médio mensal (kWh) e valores pagos a partir do PDF ou foto da conta de luz enviada no WhatsApp.",
        "Consulta automática da base de irradiação solar (HSP) geolocalizada para o município exato onde o sistema será instalado.",
        "Aplicação do índice de Performance Ratio (PR 0.80 a 0.85) com compensação de perdas térmicas e rendimento de inversores homologados.",
        "Cálculo da potência de pico ótima (kWp) necessária para suprir o consumo desejado respeitando o custo de disponibilidade da distribuidora.",
        "Modelagem da taxa de simultaneidade regulatória da Lei 14.300 e estimativa de abatimento tarifário mês a mês ao longo do ano.",
        "Conversão imediata do estudo técnico em proposta executiva pronta para envio no WhatsApp do cliente.",
      ]}
      examplesTitle="Impacto da simulação precisa na rotina da integradora"
      examples={[
        {
          title: "Confiança inabalável na entrega de geração",
          description:
            "A usina instalada gera exatamente o que foi prometido na proposta comercial, gerando clientes satisfeitos e indicações orgânicas na região.",
        },
        {
          title: "Simulação de múltiplos cenários em segundos",
          description:
            "Se o cliente desejar instalar ar-condicionado futuro ou adquirir um veículo elétrico, o integrador recalcula o projeto com 1 clique.",
        },
        {
          title: "Demonstração financeira de alto nível (Payback e TIR)",
          description:
            "Apresente gráficos claros de amortização do investimento comparados com a inflação da conta de energia nos próximos 25 anos.",
        },
        {
          title: "Eliminação do gargalo do setor de projetos",
          description:
            "O vendedor comercial simula com segurança matemática sem sobrecarregar os engenheiros da empresa com orçamentos preliminares.",
        },
      ]}
      comparisonTitle="Comparativo: Simulação com planilhas x Simulação com EnergivIA"
      comparisonRows={[
        {
          topic: "Base de Irradiação Solar",
          manual: "Média estadual aproximada ou número fixo (ex: 4,5 HSP)",
          energivia: "HSP municipal específico com dados de satélite validados",
        },
        {
          topic: "Cálculo de perdas (Performance Ratio)",
          manual: "Frequentemente ignorado, gerando promessas irreais de produção",
          energivia: "PR calibrado com perdas térmicas, sujeira e cabos",
        },
        {
          topic: "Regras da Lei 14.300 (Fio B)",
          manual: "Cálculos estáticos e defasados que iludem o cliente",
          energivia: "Algoritmo dinâmico com o escalonamento anual da lei",
        },
        {
          topic: "Tempo para gerar simulação",
          manual: "De 20 a 60 minutos por cliente",
          energivia: "Menos de 10 segundos a partir da leitura da fatura",
        },
        {
          topic: "Vinculação com kits de distribuidores",
          manual: "O vendedor precisa caçar kits compatíveis manualmente",
          energivia: "Associação instantânea de inversores e módulos ideais",
        },
        {
          topic: "Apresentação visual para o cliente",
          manual: "Tabelas secas e de difícil compreensão para leigos",
          energivia: "Gráficos executivos interativos de geração x consumo",
        },
      ]}
      checklistTitle="Checklist: Variáveis obrigatórias em uma simulação solar rigorosa"
      checklistDescription="Garanta que seus cálculos de viabilidade considerem todos os fatores técnicos e econômicos exigidos pelas normas brasileiras."
      checklistItems={[
        {
          title: "Índice HSP por município",
          description:
            "Horas de Sol a Pico (HSP) baseadas em latitude e longitude municipais para capturar o perfil real de radiação global diária.",
          detail: "Dados calibrados com Atlas Brasileiro de Energia Solar",
        },
        {
          title: "Taxa de simultaneidade do cliente",
          description:
            "Percentual da energia gerada consumida instantaneamente no imóvel versus energia injetada na rede da concessionária.",
          detail: "Essencial para o cálculo de cobrança do Fio B",
        },
        {
          title: "Custo de disponibilidade regulatório",
          description:
            "Tarifa mínima legal (30 kWh mono, 50 kWh bi ou 100 kWh trifásico) que o cliente sempre pagará à distribuidora de energia.",
          detail: "Evita prometer 'conta zero' e frustrar o cliente",
        },
        {
          title: "Sobrecarga do inversor (Overload / FDI)",
          description:
            "Fator de dimensionamento do inversor para otimizar a curva de geração no início da manhã e final da tarde sem 'clipping' excessivo.",
          detail: "Relação CC/CA ideal entre 1.15 e 1.35",
        },
        {
          title: "Degradação anual dos módulos",
          description:
            "Perda nominal de eficiência dos painéis solares (geralmente até 2% no 1º ano e 0,4% a 0,55% nos anos seguintes de garantia).",
          detail: "Garante projeção honesta de economia de 25 anos",
        },
        {
          title: "Inflação energética anual projetada",
          description:
            "Índice histórico de reajuste tarifário da Aneel para estimar o valor futuro do kWh economizado pelo consumidor.",
          detail: "Base sólida para demonstrar o retorno financeiro",
        },
      ]}
      segmentsTitle="Simulações adaptadas a diferentes padrões e telhados"
      segmentsDescription="Ajuste os parâmetros de dimensionamento de acordo com a infraestrutura do imóvel."
      segments={[
        {
          badge: "Telhados Metálicos e Fibrocimento",
          title: "Orientação e ângulo de inclinação ideal",
          scenario:
            "Galpões comerciais e residências com telhas trapezoidais ou onduladas com boa área útil.",
          resolution:
            "Simulação rápida com foco em aproveitamento de área de cobertura e distribuição uniforme de strings.",
          metrics: "Menor custo por Wp instalado",
        },
        {
          badge: "Telhados Cerâmicos e Coloniais",
          title: "Orientação mista e sombreamento pontual",
          scenario:
            "Casas com múltiplas águas de telhado (Norte, Leste e Oeste) e eventuais obstáculos físicos.",
          resolution:
            "Modelagem com múltiplos MPPTs ou microinversores para garantir que sombras não afetem o circuito todo.",
          metrics: "Aproveitamento máximo da área solar útil",
        },
        {
          badge: "Usinas de Solo e Microgeração",
          title: "Estruturas fixas com inclinação otimizada",
          scenario:
            "Chácaras, fazendas e terrenos com usinas dedicadas para geração compartilhada ou autoconsumo remoto.",
          resolution:
            "Cálculo do espaçamento entre fileiras (pitch) para evitar autossombreamento e maximizar a captação anual.",
          metrics: "Geração por kWp até 15% superior",
        },
        {
          badge: "Múltiplos Inversores Comerciais",
          title: "Sistemas de alta potência com demanda B3 ou Grupo A",
          scenario:
            "Comércios com 2, 3 ou 4 inversores de 15kW a 30kW dividindo o mesmo ponto de conexão.",
          resolution:
            "Simulador com alocação automática de múltiplos inversores idênticos e distribuição equilibrada de cargas.",
          metrics: "Equilíbrio elétrico e facilidade de manutenção",
        },
      ]}
      faqTitle="Perguntas frequentes sobre simulação de energia solar"
      faqItems={[
        {
          question: "De onde vêm os índices de irradiação solar utilizados na simulação?",
          answer:
            "Nossa base de dados integra registros oficiais de estações meteorológicas e satélites do INPE (Instituto Nacional de Pesquisas Espaciais) e CRESESB para todos os municípios brasileiros, calculando a irradiação solar média mensal com precisão científica.",
        },
        {
          question: "Como o sistema calcula as perdas térmicas dos painéis solares?",
          answer:
            "A simulação aplica o índice de Performance Ratio (PR), que contabiliza a perda de rendimento dos módulos fotovoltaicos provocada pelo calor ambiente, perdas por reflexão, sujeira sobre o vidro, perdas ôhmicas no cabeamento de corrente contínua e a eficiência de conversão dos inversores.",
        },
        {
          question: "A simulação considera a taxa de iluminação pública e custos fixos?",
          answer:
            "Sim. A plataforma deduz o valor da CIP (Contribuição de Iluminação Pública) e o custo de disponibilidade referente ao padrão de entrada (monofásico, bifásico ou trifásico) para que a fatura projetada represente o custo real final que o cliente pagará à distribuidora.",
        },
        {
          question:
            "É possível simular projetos para clientes que planejam aumentar o consumo no futuro?",
          answer:
            "Sim. O integrador pode simular tanto a partir da média da fatura atual quanto inserindo um valor de consumo futuro desejado (por exemplo, acrescentando 300 kWh/mês para novos aparelhos de ar-condicionado).",
        },
        {
          question: "Como a simulação é convertida em kit solar de distribuidor?",
          answer:
            "Assim que a potência (kWp) e o número de módulos são determinados, o algoritmo busca automaticamente opções de inversores e módulos compatíveis no catálogo, montando o kit fotovoltaico ideal sem necessidade de busca manual.",
        },
        {
          question: "Quanto tempo leva para gerar um estudo de simulação completo?",
          answer:
            "O processamento completo da imagem da fatura, cálculo solarimétrico e montagem do estudo financeiro leva menos de 10 segundos na EnergivIA.",
        },
      ]}
      relatedTitle="Continue expandindo sua operação fotovoltaica"
      relatedLinks={[
        {
          href: "/software-integrador-solar",
          title: "Software para Integrador Solar",
          description:
            "Descubra como unificar simulações, atendimento e CRM em um único ambiente integrado.",
        },
        {
          href: "/proposta-energia-solar",
          title: "Gerador de Propostas Solares",
          description:
            "Veja como transformar simulações em propostas executivas interativas que aceleram vendas.",
        },
        {
          href: "/crm-energia-solar",
          title: "CRM para Energia Solar",
          description:
            "Gerencie oportunidades, organize follow-ups e melhore a taxa de conversão da sua equipe.",
        },
      ]}
      ctaTitle="Pronto para simular com precisão e fechar vendas no primeiro contato?"
      ctaDescription="Crie sua conta gratuita na EnergivIA e descubra como entregar simulações fotovoltaicas impecáveis em segundos."
    />
  );
}
