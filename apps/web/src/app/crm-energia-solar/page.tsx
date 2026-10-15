import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/landing/seo-intent-page";

export const metadata: Metadata = {
  title: "CRM para Energia Solar | Gestão de Funil e Vendas",
  description:
    "Organize o funil de vendas da sua empresa de energia solar, atenda leads mais rápido e integre simulações e propostas em um só lugar com a EnergivIA.",
  openGraph: {
    title: "CRM para Energia Solar | EnergivIA",
    description:
      "Organize seu funil comercial solar, acelere o atendimento e converta mais orçamentos com a EnergivIA.",
    images: ["/og/og-image-1200x630.jpg"],
  },
};

export default function CrmEnergiaSolarPage(): JSX.Element {
  return (
    <SeoIntentPage
      pathname="/crm-energia-solar"
      eyebrow="CRM energia solar"
      title="CRM para Energia Solar: Gestão de Funil, Follow-up no WhatsApp e Conversão de Vendas"
      description="O CRM construído exclusivamente para a jornada de compra de energia solar. Conecte entrada de leads, faturas de luz, simulações fotovoltaicas e propostas comerciais no mesmo fluxo operacional."
      problemTitle="Por que os CRMs genéricos falham miseravelmente em empresas de energia solar"
      problemParagraphs={[
        "Muitas integradoras solares investem em CRMs de mercado tradicionais (como Pipedrive, HubSpot ou RD Station) e se deparam com um problema crônico: os consultores comerciais simplesmente abandonam o sistema. Isso acontece porque ferramentas generalistas não entendem a linguagem fotovoltaica — não possuem campos para kWp, leitura de faturas de luz, kits de distribuidores ou regras da Lei 14.300.",
        "Para usar um CRM genérico, o vendedor precisa preencher dezenas de campos manuais, sair da plataforma para dimensionar em uma planilha, ir a outro site gerar o PDF e depois lembrar de colar o link no WhatsApp. O excesso de burocracia paralisa a equipe, e as negociações voltam para cadernos e conversas particulares.",
        "Enquanto isso, a empresa perde o controle do seu principal ativo: mais de 60% dos orçamentos solares são perdidos por pura falta de follow-up estruturado nos primeiros 3 a 5 dias após o envio da proposta.",
        "Com o CRM especializado da EnergivIA, cada lead já nasce conectado à sua conta de energia, simulação e proposta comercial, permitindo que a gestão acompanhe gargalos em tempo real e o vendedor feche mais contratos com menos cliques.",
      ]}
      flowTitle="O funil comercial fotovoltaico de alta conversão"
      flowSteps={[
        "Entrada automática do lead via WhatsApp, campanhas digitais ou indicação de clientes com registro imediato da origem.",
        "Anexação instantânea da fatura de luz ao histórico do cliente, com extração por IA dos dados de consumo e concessionária.",
        "Geração de simulação e proposta comercial executiva diretamente vinculada ao card do negócio sem troca de telas.",
        "Envio da proposta personalizada via WhatsApp com link interativo e PDF para download.",
        "Notificação automática no celular do vendedor no instante exato em que o cliente abre e estuda a proposta.",
        "Follow-up guiado por etapas (Proposta Enviada, Em Análise, Vistoria Técnica e Fechamento) até a assinatura do contrato.",
      ]}
      examplesTitle="O que muda na gestão comercial com o CRM da EnergivIA"
      examples={[
        {
          title: "Fim definitivo dos leads esquecidos no WhatsApp",
          description:
            "Visualização clara em Kanban de todos os negócios em andamento, destacando quais clientes estão há mais de 48 horas sem contato do vendedor.",
        },
        {
          title: "Histórico 360° unificado por cliente",
          description:
            "Todas as versões de propostas, contas de luz enviadas, kits cotados e anotações de conversas centralizados no mesmo cadastro.",
        },
        {
          title: "Follow-up cirúrgico no momento de maior interesse",
          description:
            "O consultor recebe aviso de leitura e liga para o cliente enquanto ele está navegando pela proposta e comparando as opções de kits.",
        },
        {
          title: "Governança e redistribuição inteligente de leads",
          description:
            "O gestor transfere oportunidades de consultores sobrecarregados para outros vendedores com um clique, garantindo velocidade máxima de resposta.",
        },
      ]}
      comparisonTitle="Comparativo: CRM Genérico/Planilhas x CRM Solar EnergivIA"
      comparisonRows={[
        {
          topic: "Aderência ao setor de energia solar",
          manual: "Nenhuma (exige dezenas de campos customizados manuais)",
          energivia: "100% nativo (entende faturas, kWp, inversores e kits)",
        },
        {
          topic: "Conexão com a proposta comercial",
          manual: "Desconectado (proposta é feita fora e colada manualmente)",
          energivia: "Integrado em 1 clique (proposta nasce dentro do lead)",
        },
        {
          topic: "Adoção pela equipe comercial",
          manual: "Baixa (vendedores reclamam da lentidão e burocracia)",
          energivia: "Altíssima (acelera a rotina em vez de burocratizar)",
        },
        {
          topic: "Rastreamento de visualização de propostas",
          manual: "Inexistente (vendedor fica no escuro sem saber se o cliente leu)",
          energivia: "Alerta em tempo real de abertura de propostas",
        },
        {
          topic: "Canal de execução diária",
          manual: "Janela separada do navegador fora do canal de conversa",
          energivia: "Execução unificada no WhatsApp e no painel web",
        },
        {
          topic: "Visibilidade do pipeline para a gestão",
          manual: "Planilhas defasadas atualizadas apenas no final da semana",
          energivia: "Métricas ao vivo de tempo de resposta e conversão",
        },
      ]}
      checklistTitle="Checklist: O que um CRM solar precisa entregar para acelerar vendas"
      checklistDescription="Exija estas funcionalidades indispensáveis para transformar o comercial da sua integradora em uma operação profissional e previsível."
      checklistItems={[
        {
          title: "Kanban adaptado às etapas solares",
          description:
            "Fases claras: Lead Novo, Fatura Recebida, Proposta Enviada, Visita/Vistoria, Financiamento em Análise e Contrato Fechado.",
          detail: "Sem perder tempo desenhando funil do zero",
        },
        {
          title: "Visão 360° do cliente em gaveta lateral",
          description:
            "Acesso aos dados de contato, endereço da instalação, faturas anexadas e propostas emitidas sem precisar sair da tela do funil.",
          detail: "Agilidade de atendimento com zero reload",
        },
        {
          title: "Integração nativa com gerador de propostas",
          description:
            "Capacidade de emitir orçamentos e comparar opções Standard, Elite e Premium diretamente a partir do card do lead.",
          detail: "Elimina a troca de 4 softwares diferentes",
        },
        {
          title: "Rastreamento e auditoria de aberturas",
          description:
            "Registro de quando e quantas vezes o tomador de decisão visualizou o link da proposta comercial.",
          detail: "O fim do 'vou dar uma olhada e te aviso'",
        },
        {
          title: "Campos técnicos específicos de energia",
          description:
            "Armazenamento de concessionária, número da unidade consumidora (UC), grupo tarifário, histórico em kWh e coordenadas geográficas.",
          detail: "Tudo o que a engenharia precisa para homologação",
        },
        {
          title: "Controle de permissões e privacidade (RBAC)",
          description:
            "Vendedores visualizam apenas as suas oportunidades ativas, enquanto gestores e diretores possuem visão consolidada de toda a operação.",
          detail: "Segurança de dados da carteira da empresa",
        },
      ]}
      segmentsTitle="Gestão de funil adequada para cada modelo comercial"
      segmentsDescription="Ajuste o fluxo de trabalho de acordo com a estrutura da sua força de vendas."
      segments={[
        {
          badge: "Equipe de Inside Sales (SDRs e Closers)",
          title: "Atendimento ultra-rápido a leads de internet",
          scenario:
            "Empresas que recebem leads de anúncios no Instagram, Google e Facebook e precisam qualificar em minutos.",
          resolution:
            "Recebimento do lead, extração automática da fatura e envio de proposta inicial em menos de 2 minutos para agendar fechamento.",
          metrics: "Multiplicação da taxa de qualificação",
        },
        {
          badge: "Representantes e Consultores Externos",
          title: "Acompanhamento de visitas e prospecção de rua",
          scenario:
            "Vendedores que visitam clientes residenciais, comércios e fazendas presencialmente.",
          resolution:
            "CRM no celular via WhatsApp e web responsiva, gerando propostas na frente do cliente durante a visita técnica.",
          metrics: "Fechamento de contratos na primeira visita",
        },
        {
          badge: "Grandes Contas e Clientes B2B",
          title: "Ciclos de venda longos com múltiplos decisores",
          scenario:
            "Vendas para indústrias, redes de supermercados e usinas de investimento com prazo de decisão de 30 a 90 dias.",
          resolution:
            "Histórico detalhado de reuniões, anexos de laudos estruturais e versionamento de propostas técnicas e financeiras.",
          metrics: "Controle rigoroso de propostas de alto ticket",
        },
        {
          badge: "Pós-Venda e Indicações (Member Get Member)",
          title: "Ativação de clientes instalados para novas vendas",
          scenario:
            "Base de centenas de clientes satisfeitos que podem indicar vizinhos, parentes e parceiros de negócios.",
          resolution:
            "Etapa de funil dedicada para clientes conectados, gerando pedidos de indicação periódicos após a primeira conta reduzida.",
          metrics: "Custo de aquisição (CAC) próximo de zero",
        },
      ]}
      faqTitle="Perguntas frequentes sobre o CRM para integradores solares"
      faqItems={[
        {
          question:
            "Por que escolher um CRM especializado em energia solar em vez de um sistema genérico?",
          answer:
            "CRMs genéricos exigem meses de customização e ainda assim não conseguem ler contas de energia por inteligência artificial, calcular irradiação solar ou gerar propostas fotovoltaicas. O CRM da EnergivIA já vem pré-configurado com toda a jornada de vendas de energia solar, garantindo adesão imediata dos vendedores.",
        },
        {
          question: "Como o CRM ajuda o vendedor a fazer follow-up no momento certo?",
          answer:
            "Quando um cliente abre a proposta comercial, o CRM envia um alerta imediato. Além disso, o quadro Kanban destaca visualmente quais oportunidades estão paradas há vários dias, permitindo que o consultor retome o contato com argumentos personalizados.",
        },
        {
          question: "É possível gerenciar múltiplos vendedores e atribuir clientes específicos?",
          answer:
            "Sim. A plataforma possui controle de usuários e permissões. Cada consultor comercial pode gerenciar apenas os seus próprios leads e propostas, enquanto o gestor geral tem visão completa do desempenho e conversão de toda a equipe.",
        },
        {
          question: "Consigo acessar o CRM direto pelo celular enquanto estou em visita técnica?",
          answer:
            "Sim. O CRM da EnergivIA é totalmente responsivo e otimizado para dispositivos móveis, permitindo registrar novas oportunidades, consultar dados da conta de luz e enviar propostas diretamente do smartphone.",
        },
        {
          question: "O CRM armazena todas as versões de propostas que enviei para o mesmo cliente?",
          answer:
            "Sim. Se você enviou uma proposta inicial e depois o cliente solicitou adicionar mais 4 módulos ou mudar a marca do inversor, o histórico preserva todas as versões geradas, permitindo comparar valores e configurações a qualquer momento.",
        },
        {
          question: "Como o CRM contribui para o aumento real das vendas da empresa?",
          answer:
            "Ele elimina o tempo desperdiçado em digitação manual, reduz o tempo de resposta aos leads para minutos e impede que oportunidades esfriem por esquecimento. Nossos clientes relatam um aumento médio de 30% a 40% na taxa de conversão final do funil nos primeiros 60 dias de uso.",
        },
      ]}
      relatedTitle="Conheça todos os módulos da plataforma"
      relatedLinks={[
        {
          href: "/software-integrador-solar",
          title: "Software para Integrador Solar",
          description: "Entenda a arquitetura unificada de atendimento, propostas e gestão solar.",
        },
        {
          href: "/proposta-energia-solar",
          title: "Gerador de Propostas Solares",
          description:
            "Descubra como encantar clientes com propostas interativas de alto impacto visual.",
        },
        {
          href: "/simulacao-energia-solar",
          title: "Simulação Fotovoltaica com IA",
          description:
            "Cálculos solares automáticos de engenharia e base solarimétrica geolocalizada.",
        },
      ]}
      ctaTitle="Pronto para transformar seu funil solar em uma máquina de vendas?"
      ctaDescription="Crie sua conta na EnergivIA e comece a gerenciar seus leads e propostas comerciais com máxima velocidade e previsibilidade hoje mesmo."
    />
  );
}
