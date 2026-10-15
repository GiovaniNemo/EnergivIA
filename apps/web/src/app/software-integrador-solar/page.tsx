import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "Software para Integrador Solar | Automação e Inteligência Artificial",
  description:
    "Descubra o software definitivo para integradores solares: automação de orçamentos, CRM integrado e geração instantânea de propostas com IA.",
  openGraph: {
    title: "Software para Integrador Solar | EnergivIA",
    description:
      "Acelere o atendimento, organize sua operação e aumente sua taxa de fechamento com a EnergivIA.",
    images: ["/og/og-image-1200x630.jpg"],
  },
};

export default function SoftwareIntegradorSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      pathname="/software-integrador-solar"
      eyebrow="Software para integrador solar"
      title="O que um software para integrador solar precisa entregar para acelerar vendas e sustentar escala"
      description="Mais do que um gerador de PDF, um software solar moderno precisa unificar atendimento no WhatsApp, leitura inteligente de faturas, dimensionamento fotovoltaico e CRM comercial em um fluxo contínuo e sem atritos operacionais."
      problemTitle="O gargalo invisível das ferramentas desconectadas na rotina do integrador"
      problemParagraphs={[
        "A maioria dos integradores solares no Brasil perde entre 2 e 5 horas por dia transitando manualmente entre planilhas de dimensionamento, portais de distribuidores, editores de PDF e conversas desorganizadas no WhatsApp. Esse retrabalho manual cria um abismo entre o momento em que o lead demonstra interesse e a entrega da proposta final.",
        "Em um mercado com margens mais pressionadas e clientes mais exigentes após a vigência da Lei 14.300, a velocidade de atendimento tornou-se o principal diferencial competitivo. Quando o cliente precisa esperar 24 a 48 horas por um orçamento, ele já recebeu simulações de concorrentes ou perdeu o ímpeto da decisão de compra.",
        "Além disso, a falta de padronização nas propostas prejudica a imagem institucional da integradora. Cada vendedor calcula margens de forma isolada, utiliza templates visuais desatualizados ou erra parâmetros fundamentais de simultaneidade e irradiação solar (HSP), colocando em risco a lucratividade do projeto.",
        "Sem um software unificado, a gestão da empresa fica cega: não é possível mensurar a taxa real de conversão do funil, os gargalos de atendimento da equipe ou o tempo médio de resposta por consultor comercial.",
      ]}
      flowTitle="O ciclo operacional ideal de uma integradora solar de alta performance"
      flowSteps={[
        "Recepção da fatura de energia diretamente pelo WhatsApp ou canal digital sem digitação manual de dados de consumo.",
        "Extração inteligente por visão computacional e IA dos parâmetros da conta: distribuidora, grupo tarifário, histórico de consumo e valores faturados.",
        "Dimensionamento automático da potência de pico (kWp) considerando o índice de irradiação solar (HSP) exato do município brasileiro.",
        "Cálculo financeiro regulatório com projeção de economia real considerando as regras vigentes da Lei 14.300 e taxas de simultaneidade.",
        "Seleção do kit fotovoltaico ideal entre distribuidores homologados com cálculo automático de margem comercial e custos operacionais.",
        "Geração instantânea e envio da proposta comercial personalizada com a identidade visual da integradora e rastreamento de abertura.",
      ]}
      examplesTitle="Ganhos operacionais mensuráveis com uma plataforma especializada"
      examples={[
        {
          title: "Tempo de resposta comercial de minutos",
          description:
            "A integradora consegue enviar um orçamento completo com simulação de economia enquanto o cliente ainda está na ligação ou no chat inicial do WhatsApp.",
        },
        {
          title: "Redução drástica de erros de engenharia e margem",
          description:
            "Cálculos fotovoltaicos padronizados e conferência automática de inversores e módulos eliminam propostas enviadas com potência insuficiente ou kits superdimensionados.",
        },
        {
          title: "Onboarding comercial imediato de novos vendedores",
          description:
            "Novos consultores e representantes comerciais conseguem gerar propostas técnicas perfeitas desde o primeiro dia de trabalho, sem necessidade de treinamentos complexos em planilhas.",
        },
        {
          title: "Previsibilidade de receita e governança no funil",
          description:
            "O gestor acompanha em tempo real quantas propostas foram abertas, quais clientes estão em negociação ativa e onde ocorrem as principais perdas comerciais.",
        },
      ]}
      comparisonTitle="Comparativo: Operação manual x Plataforma EnergivIA"
      comparisonRows={[
        {
          topic: "Fluxo comercial de atendimento",
          manual: "Fragmentado em planilhas, WhatsApp pessoal e editores manuais",
          energivia: "Fluxo 100% unificado, guiado e executado no WhatsApp e Web",
        },
        {
          topic: "Leitura de contas de energia",
          manual: "Digitação manual dos últimos 12 meses de consumo (sujeita a erros)",
          energivia: "Extração instantânea por inteligência artificial em segundos",
        },
        {
          topic: "Tempo médio para entregar proposta",
          manual: "De 4 a 48 horas dependendo da disponibilidade técnica",
          energivia: "Menos de 2 minutos do envio da conta ao link interativo/PDF",
        },
        {
          topic: "Aderência regulatória (Lei 14.300)",
          manual: "Cálculos estáticos que desconsideram transição tarifária",
          energivia: "Fórmulas regulatórias atualizadas com compensação e Fio B",
        },
        {
          topic: "Consistência de marca e layout",
          manual: "Cada vendedor usa um layout diferente, gerando ruído de marca",
          energivia: "Design executivo, padronizado com logo e cores da integradora",
        },
        {
          topic: "Escalabilidade operacional",
          manual: "Aumento de leads exige contratação proporcional de orçamentistas",
          energivia: "Multiplicação da capacidade comercial sem inflar custo fixo",
        },
      ]}
      checklistTitle="Checklist: O que exigir ao escolher um software para energia solar"
      checklistDescription="Antes de contratar qualquer ferramenta para sua integradora, certifique-se de que a solução preenche os 6 requisitos fundamentais de uma operação moderna."
      checklistItems={[
        {
          title: "Execução nativa no WhatsApp",
          description:
            "A ferramenta deve permitir que a interação com o lead aconteça no canal onde ele já está, sem exigir que o cliente baixe aplicativos ou acesse portais burocráticos.",
          detail: "Canal preferido por 98% dos clientes finais",
        },
        {
          title: "Visão computacional para contas de luz",
          description:
            "Capacidade de reconhecer faturas das principais distribuidoras do país (Enel, CPFL, Cemig, Copel, Equatorial, Neoenergia, etc.) sem digitação humana.",
          detail: "Economia de 15 minutos por atendimento",
        },
        {
          title: "Dimensionamento com HSP geolocalizado",
          description:
            "A base de dados de irradiação solar deve ser precisa para os mais de 5.500 municípios brasileiros, evitando estimativas genéricas que comprometem a geração.",
          detail: "Base Solarimétrica de alta resolução",
        },
        {
          title: "Cálculo preciso de Payback e TIR",
          description:
            "Demonstrações financeiras transparentes para o cliente: VPL, taxa interna de retorno e fluxo de caixa ao longo dos 25 anos de vida útil do sistema.",
          detail: "Argumento indispensável para fechar negócios",
        },
        {
          title: "Controle de margem e precificação flexível",
          description:
            "Configuração de regras de comissionamento, custos de instalação, frete, homologação de projeto e margem bruta por faixa de potência do sistema.",
          detail: "Blindagem da lucratividade da empresa",
        },
        {
          title: "CRM e Rastreamento de visualização",
          description:
            "Notificações automáticas no momento em que o cliente abre a proposta comercial, permitindo que o vendedor faça o follow-up no instante de maior interesse.",
          detail: "Aumento comprovado na taxa de conversão",
        },
      ]}
      segmentsTitle="Adaptabilidade operacional por perfil de empresa"
      segmentsDescription="A EnergivIA foi desenhada com flexibilidade para atender desde integradores locais até redes com abrangência nacional."
      segments={[
        {
          badge: "Integrador Autônomo e Engenheiro",
          title: "Agilidade máxima sem equipe de apoio",
          scenario:
            "Profissional técnico que cuida das vendas, projetos, homologação e instalação sozinho.",
          resolution:
            "Automatiza orçamentos e dimensionamentos em segundos, liberando tempo nobre para relacionamento e visitas técnicas.",
          metrics: "Até 5x mais orçamentos entregues por dia",
        },
        {
          badge: "Equipes Comerciais e Representantes",
          title: "Padronização rigorosa e controle de margem",
          scenario: "Empresas com 3 a 20 consultores externos espalhados na região ou no estado.",
          resolution:
            "Todos os consultores geram propostas no mesmo padrão visual e técnico com limites de desconto pré-aprovados pela diretoria.",
          metrics: "Eliminação total de propostas com margem negativa",
        },
        {
          badge: "Projetos Comerciais e Industriais",
          title: "Simulação de faturas complexas do Grupo A e B3",
          scenario:
            "Atendimento a indústrias, comércios e usinas com demanda contratada e múltiplos inversores.",
          resolution:
            "Suporte a múltiplos inversores idênticos de alta potência e estudo de perfil de carga para clientes de maior consumo.",
          metrics: "Apresentações executivas de nível corporativo",
        },
        {
          badge: "Franquias e Redes Solares",
          title: "Governança unificada e inteligência de dados",
          scenario:
            "Operações corporativas que precisam manter a marca impecável em centenas de cidades.",
          resolution:
            "Controle de permissões (RBAC), catálogo oficial homologado e relatórios integrados de desempenho comercial.",
          metrics: "Visão consolidada do pipeline em tempo real",
        },
      ]}
      faqTitle="Perguntas frequentes sobre software para integrador solar"
      faqItems={[
        {
          question: "A EnergivIA é apenas um gerador de propostas em PDF?",
          answer:
            "Não. A geração de proposta é apenas uma etapa do processo. A EnergivIA é uma plataforma comercial completa que integra recepção do lead, extração automática de dados da fatura por IA, dimensionamento fotovoltaico preciso, simulação financeira regulatória e acompanhamento no CRM com notificações em tempo real.",
        },
        {
          question:
            "Como funciona a leitura automática de contas de energia por inteligência artificial?",
          answer:
            "O integrador ou o cliente envia uma foto ou PDF da fatura de luz no WhatsApp. Nossa visão computacional analisa o documento, identifica a concessionária de energia, extrai o histórico mensal de consumo (kWh), dados de demanda, grupo tarifário e valores faturados, preenchendo todos os dados técnicos em menos de 10 segundos.",
        },
        {
          question: "O software já calcula as regras de compensação da Lei 14.300?",
          answer:
            "Sim. O motor de cálculo da EnergivIA está 100% atualizado com o marco legal da micro e minigeração distribuída, calculando com exatidão a taxa de simultaneidade, a transição progressiva do Fio B e as regras de custo de disponibilidade para apresentar ao cliente projeções financeiras realistas e sem surpresas futuras.",
        },
        {
          question: "Preciso de um computador potente para utilizar a plataforma?",
          answer:
            "Não. A plataforma opera 100% na nuvem (SaaS) e foi construída para funcionar com máxima velocidade em qualquer navegador moderno (desktop, notebook, tablet ou smartphone) e também via WhatsApp nativo.",
        },
        {
          question: "Posso personalizar a proposta com o logotipo, cores e dados da minha empresa?",
          answer:
            "Sim. Todas as propostas comerciais geradas refletem integralmente a identidade visual da sua integradora: logo oficial, cores da marca, dados de contato, fotos da equipe, depoimentos de clientes e termos contratuais customizados.",
        },
        {
          question: "Como o software impacta o tempo de resposta e fechamento de vendas?",
          answer:
            "Ao reduzir o tempo de elaboração de um orçamento de várias horas para menos de 2 minutos, o integrador consegue apresentar a proposta enquanto o lead está ativamente engajado na conversa. Dados de mercado mostram que responder um lead solar nos primeiros 15 minutos multiplica em até 7 vezes a probabilidade de fechamento da venda.",
        },
      ]}
      relatedTitle="Aprofunde seus conhecimentos operacionais"
      relatedLinks={[
        {
          href: "/proposta-energia-solar",
          title: "Gerador de Propostas de Energia Solar",
          description:
            "Descubra como estruturar propostas comerciais que convertem até 40% mais clientes.",
        },
        {
          href: "/simulacao-energia-solar",
          title: "Simulação Fotovoltaica com IA",
          description:
            "Entenda os parâmetros técnicos e cálculos de irradiação solar que garantem precisão.",
        },
        {
          href: "/crm-energia-solar",
          title: "CRM para Energia Solar",
          description:
            "Como organizar seu funil comercial e nunca mais perder um lead por falta de follow-up.",
        },
      ]}
      ctaTitle="Pronto para elevar o patamar comercial da sua integradora solar?"
      ctaDescription="Junte-se a integradores solares em todo o Brasil que transformaram atendimento lento e burocrático em uma máquina previsível de geração de propostas e vendas."
    />
  );
}
