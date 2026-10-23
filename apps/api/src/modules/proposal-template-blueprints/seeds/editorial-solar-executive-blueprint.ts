import { ProposalEditorDocument } from "@energivia/shared-types";

export const EDITORIAL_SOLAR_EXECUTIVE_METADATA = {
  slug: "editorial-solar-executive",
  name: "Template Oficial Editorial Solar Executive",
  description:
    "Modelo completo de alta conversão comercial com 16 seções ativas, fotos reais de alta definição de instalações solares e acabamento editorial nobre.",
  thumbnailUrl:
    "https://meu-projeto-energivia-uploads.s3.sa-east-1.amazonaws.com/proposal-templates/real-estate-s-most-trusted-energy-partner-a37bfa54-30e6-48de-8417-9b48833503b1.jpg",
  published: true,
  sortOrder: 0,
};

export const EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT: ProposalEditorDocument = {
  styles: {
    branding: {
      logoUrl: "",
      primaryColor: "#059669",
      secondaryColor: "#10B981",
      backgroundColor: "#FAFFFC",
      textColor: "#0F172A",
    },
    typography: {
      fontFamily: "Inter",
      titleSize: 30,
      subtitleSize: 20,
      bodySize: 14,
      preset: "medium",
    },
    layout: {
      pageWidth: "medium",
      spacing: "normal",
      borderRadius: 16,
      shadowIntensity: 3,
    },
    cover: {
      imageUrl:
        "https://meu-projeto-energivia-uploads.s3.sa-east-1.amazonaws.com/proposal-templates/real-estate-s-most-trusted-energy-partner-a37bfa54-30e6-48de-8417-9b48833503b1.jpg",
      overlayColor: "#000000",
      overlayOpacity: 0.28,
      titleText: "Projeto de Solução Fotovoltaica para {{nome_cliente}}",
      showLogo: true,
    },
    footer: {
      companyName: "EnergivIA Solar",
      contactInfo: "contato@solarenergia.com.br | Atendimento Técnico Nacional",
      showPageNumbers: true,
    },
  },
  variables: {
    nome_cliente: "Cliente Parceiro",
    nome_empresa: "EnergivIA Solar",
    data_proposta: "20/10/2026",
    tamanho_sistema_kw: "8.40",
    potencia_sistema_kwp: "8.40",
    geracao_mensal_kwh: "1050",
    cobertura_consumo_pct: "95",
    equivalente_arvores_ano: "48",
  },
  sections: [
    {
      id: "sec-cover",
      type: "cover",
      variant: "hero-cinematic",
      order: 0,
      title: "Capa do Estudo",
      visible: true,
      content: {
        raw: "<p>Estudo de engenharia e viabilidade financeira preparado exclusivamente para {{nome_cliente}}.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        backgroundImage:
          "https://meu-projeto-energivia-uploads.s3.sa-east-1.amazonaws.com/proposal-templates/real-estate-s-most-trusted-energy-partner-a37bfa54-30e6-48de-8417-9b48833503b1.jpg",
        highlight: "Estudo Fotovoltaico Personalizado",
        title: "Projeto de Solução Fotovoltaica para {{nome_cliente}}",
        subtitle:
          "<p>Elaborado em <strong>{{data_proposta}}</strong> com dimensionamento de alta precisão e engenharia dedicada.</p>",
        companyName: "{{nome_empresa}}",
        showCompanyName: true,
        companyNameAlign: "center",
        companyNamePlacement: "bottom",
        logo: "",
        showLogo: true,
        logoAlign: "center",
        logoPlacement: "top",
        logoSize: "medium",
        overlayColor: "#000000",
        overlayOpacity: 0.28,
        coverHeight: "full",
        alignment: "center",
        showSectionDivider: false,
      },
    },
    {
      id: "sec-intro",
      type: "introduction",
      variant: "carta",
      order: 1,
      title: "Apresentação do Projeto",
      visible: true,
      content: {
        raw: "<p>Apresentamos a você o estudo detalhado para a conquista da sua independência energética com máxima confiabilidade e suporte técnico especializado.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Apresentação do Projeto",
        greeting: "Prezado(a) {{nome_cliente}},",
        text: "<p>É com grande satisfação que apresentamos este estudo de viabilidade técnica e financeira para a implantação de um sistema de energia solar fotovoltaica conectado à rede (on-grid). Nossa proposta foi elaborada sob medida para o seu perfil de consumo, priorizando máxima geração, conformidade normativa e menor tempo de retorno do investimento.</p><p>Nas próximas páginas, você encontrará a análise do seu diagnóstico energético, os equipamentos de primeira linha selecionados para o seu imóvel, a estimativa detalhada de economia e as garantias que asseguram a tranquilidade do seu investimento por mais de 25 anos.</p>",
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-about",
      type: "about_company",
      variant: "split-proof",
      order: 2,
      title: "Sobre a {{nome_empresa}}",
      visible: true,
      content: {
        raw: "<p>Somos especialistas em soluções integradas de energia solar fotovoltaica, combinando engenharia rigorosa, equipamentos de fabricantes globais Tier 1 e instalação certificada de alta performance.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Sobre a {{nome_empresa}}",
        eyebrow: "Engenharia & Confiança",
        tag_top: "Excelência Solar",
        text: "<p>Com atuação consolidada no setor fotovoltaico, cuidamos de todas as etapas: desde a análise de viabilidade, homologação integral junto à concessionária de energia, fornecimento de equipamentos certificados, até a montagem técnica e ativação do sistema. Nosso compromisso é entregar economia real com segurança estrutural e elétrica intransigente.</p>",
        image:
          "https://meu-projeto-energivia-uploads.s3.sa-east-1.amazonaws.com/proposal-templates/imagem-2026-09-01-213523300-02dd5c03-ba8a-4841-bc62-1d4d46eab7b5.png",
        quote: "Energia limpa, duradoura e com engenharia dedicada para o seu patrimônio.",
        signature: "Diretoria Técnica & Operações",
        stats: [
          { label: "Projetos Concluídos", value: "+500" },
          { label: "Potência Instalada", value: "+3.5 MWp" },
          { label: "Economia Gerada", value: "R$ 4.2M+" },
          { label: "Satisfação de Clientes", value: "99.4%" },
        ],
        features: [
          {
            icon: "shield-check",
            text: "Projetos em total conformidade com ABNT NBR 16690 e normas de segurança NR-10/NR-35",
          },
          {
            icon: "award",
            text: "Engenharia própria com emissão de ART (Anotação de Responsabilidade Técnica)",
          },
          {
            icon: "cpu",
            text: "Monitoramento em tempo real da geração com suporte pós-venda dedicado",
          },
        ],
        meta_label: "Homologação",
        meta_value: "100% Garantida",
        badge_label: "Padrão de Qualidade",
        badge_value: "Engenharia Certificada",
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-diag",
      type: "diagnostic_energy",
      variant: "cards",
      order: 3,
      title: "Diagnóstico Energético Atual",
      visible: true,
      content: {
        raw: "<p>Avaliamos o histórico de consumo elétrico da sua unidade consumidora para identificar perdas financeiras decorrentes da dependência da rede tradicional.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Diagnóstico Energético Atual",
        highlightText:
          "A transição para a energia solar transforma um gasto fixo incontrolável em um ativo altamente rentável.",
        highlightIcon: "zap",
        highlightIconColor: "#059669",
        painPoints: [
          {
            icon: "trending-up",
            text: "Tarifas de energia com reajustes anuais historicamente acima da inflação oficial.",
          },
          {
            icon: "alert-triangle",
            text: "Impacto direto de bandeiras tarifárias amarela e vermelha que encarecem a fatura mensal.",
          },
          {
            icon: "dollar-sign",
            text: "Custo contínuo a fundo perdido sem qualquer agregação de patrimônio.",
          },
        ],
        impact: [
          {
            icon: "shield",
            text: "Blindagem contra futuros aumentos de tarifas das concessionárias de energia.",
          },
          {
            icon: "sun",
            text: "Geração própria no local de consumo com previsibilidade orçamentária total.",
          },
          {
            icon: "check-circle",
            text: "Recuperação do capital investido através da própria economia obtida.",
          },
        ],
        painIconColor: "#EF4444",
        impactIconColor: "#059669",
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-solution",
      type: "solution",
      variant: "cards",
      order: 4,
      title: "Solução Fotovoltaica Dimensionada",
      visible: true,
      content: {
        raw: "<p>Desenvolvemos uma usina solar dimensionada especificamente para cobrir a sua demanda energética, gerando excedente de créditos e reduzindo sua fatura ao custo de disponibilidade.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Solução Fotovoltaica Dimensionada",
        solutionName: "Gerador Solar On-Grid de Alta Performance",
        howItWorks:
          "Os módulos fotovoltaicos captam a radiação solar e produzem eletricidade em corrente contínua. O inversor inteligente converte essa eletricidade em corrente alternada para alimentar todos os aparelhos do imóvel. O excedente não consumido é injetado na rede da concessionária, gerando créditos válidos por até 60 meses.",
        benefits: [
          {
            id: "sol-b1",
            icon: "badge-percent",
            text: "Redução de até 90% do custo mensal com energia elétrica",
          },
          {
            id: "sol-b2",
            icon: "home",
            text: "Valorização imediata do imóvel no mercado imobiliário",
          },
          {
            id: "sol-b3",
            icon: "smartphone",
            text: "Acompanhamento em tempo real da geração através de aplicativo móvel",
          },
          {
            id: "sol-b4",
            icon: "leaf",
            text: "Geração 100% limpa e renovável sem emissão de gases de efeito estufa",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-generation",
      type: "generation_consumption",
      variant: "modern",
      order: 5,
      title: "Balanço Energético: Geração vs Consumo",
      visible: true,
      content: {
        raw: "<p>Simulação técnica considerando a irradiância solar média da sua região, as características de orientação do telhado e o consumo histórico.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Balanço Energético: Geração vs Consumo",
        sectionSubtitle:
          "Comparativo mês a mês demonstrando a autossuficiência do sistema proposto ao longo do ano.",
        geracaoMensal: 1050,
        consumoMensal: [680, 670, 640, 620, 600, 590, 610, 630, 650, 670, 690, 710],
        producaoMensal: [780, 750, 730, 690, 650, 620, 660, 710, 740, 770, 790, 810],
        meses: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-equipment",
      type: "proposal_equipment",
      variant: "cards",
      order: 6,
      title: "Equipamentos Selecionados para o Projeto",
      visible: true,
      content: {
        raw: "<p>Trabalhamos exclusivamente com fabricantes globais listados no BloombergNEF Tier 1, assegurando máxima eficiência, robustez mecânica e certificação INMETRO.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Equipamentos Selecionados para o Projeto",
        sectionSubtitle:
          "Componentes industriais de ponta projetados para suportar intempéries severas com máxima geração.",
        equipmentLines: [
          {
            categoria: "Módulos Fotovoltaicos",
            descricao:
              "Módulos Monocristalinos N-Type / Half-Cell de alta eficiência com vidro temperado antirreflexo e moldura em alumínio anodizado.",
            quantidade: "{{quantidade_modulos}} unidades",
            potencia: "{{potencia_modulo_w}} W",
            garantia: "25 anos de desempenho linear",
          },
          {
            categoria: "Inversor Inteligente",
            descricao:
              "Inversor Solar On-Grid com rastreador MPPT duplo, eficiência superior a 98%, sistema de refrigeração inteligente e conectividade Wi-Fi integrada.",
            quantidade: "{{quantidade_inversores}} unidade(s)",
            potencia: "{{potencia_inversor_kw}} kW",
            garantia: "10 a 12 anos de fábrica",
          },
          {
            categoria: "Estruturas de Fixação",
            descricao:
              "Perfilados e grampos em alumínio estrutural 6063-T6 com parafusos em aço inox AISI 304, projetados para suportar ventos de até 140 km/h.",
            quantidade: "Kit Completo",
            potencia: "Conforme telhado",
            garantia: "10 anos contra corrosão",
          },
          {
            categoria: "Proteções Elétricas (String Box)",
            descricao:
              "Quadro de proteção com Dispositivos Protetores contra Surtos (DPS classe II), fusíveis e disjuntores específicos para corrente contínua e alternada.",
            quantidade: "Kit Completo",
            potencia: "Norma NBR 16690",
            garantia: "5 anos de conformidade",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-gallery",
      type: "gallery",
      variant: "grid_uniform",
      order: 7,
      title: "Galeria de Obras e Instalações Realizadas",
      visible: true,
      content: {
        raw: "<p>Conheça alguns dos projetos executados por nossa equipe técnica. Rigor no alinhamento das placas, segurança e acabamento impecável em cada detalhe.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Galeria de Obras e Instalações Realizadas",
        eyebrow: "Portfólio de Engenharia",
        countLabel: "Instalações Selecionadas",
        items: [
          {
            id: "gal-1",
            photo: "/cover-segments/residencial/1.png",
            title: "Residencial de Alto Padrão",
            description:
              "Sistema de 9,8 kWp com integração estética ao telhado cerâmico e cabeamento oculto.",
          },
          {
            id: "gal-2",
            photo: "/cover-segments/comercial/1.png",
            title: "Comércio & Distribuidora",
            description:
              "Usinas em cobertura metálica de 45 kWp atendendo câmaras frias e maquinário pesado.",
          },
          {
            id: "gal-3",
            photo: "/cover-segments/industrial/1.png",
            title: "Parque Industrial Metalúrgico",
            description:
              "Instalação de média tensão de 120 kWp com monitoramento individual por string.",
          },
          {
            id: "gal-4",
            photo: "/cover-segments/rural/1.png",
            title: "Agronegócio & Irrigação",
            description:
              "Sistema de solo de 30 kWp para bombas d'água e resfriadores de leite sem interrupções.",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-economy",
      type: "economy_purchases",
      variant: "split",
      order: 8,
      title: "Poder de Compra da Sua Economia Solar",
      visible: true,
      content: {
        raw: "<p>A energia solar não é apenas uma despesa reduzida; é um patrimônio financeiro acumulado que volta para os seus projetos pessoais e empresariais.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Poder de Compra da Sua Economia Solar",
        eyebrow: "Rentabilidade & Conquistas",
        listTitle: "O que a sua economia representa em 25 anos:",
        amountLabel: "Economia Projetada em 25 Anos",
        anchorLabel: "R$ 480.000,00+",
        description:
          "Ao deixar de pagar valores crescentes à concessionária, todo o capital economizado pode ser direcionado para investimentos reais e conquistas duradouras.",
        dividerLabel: "Equivalências Práticas de Mercado",
        horizonYears: 25,
        purchaseItems: [
          { item: "Viagens internacionais para toda a família a cada 3 anos", icon: "plane" },
          {
            item: "Quitação de veículo novo ou renovação de frota sem endividamento",
            icon: "car",
          },
          { item: "Formação universitária completa dos filhos garantida", icon: "graduation-cap" },
          { item: "Aporte sólido em previdência privada ou fundo imobiliário", icon: "piggy-bank" },
        ],
        narrativeQuote:
          "Investir em energia solar é comprar energia futura a um preço congelado no presente.",
        narrativeAction: "Começar a economizar agora",
        narrativeFooter:
          "Cálculo baseado em vida útil média de 25 anos e reajustes moderados de energia.",
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-pricing",
      type: "pricing",
      variant: "table",
      order: 9,
      title: "Investimento Total e Condições Comerciais",
      visible: true,
      content: {
        raw: "<p>Contratação na modalidade Turn-Key: cuidamos de 100% dos processos técnicos, burocráticos e construtivos para que você receba o sistema pronto gerando energia.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Investimento Total e Condições Comerciais",
        showDiscountRow: true,
        paymentConditions: [
          {
            item: "Engenharia Técnica & Visita de Vistoria",
            detalhes: "Levantamento estrutural, medições in loco e projeto executivo",
            status: "Incluso",
          },
          {
            item: "Homologação na Concessionária",
            detalhes: "Protocolo, parecer de acesso, vistorias e aprovação documental",
            status: "Incluso",
          },
          {
            item: "Equipamentos Completos (Módulos + Inversor)",
            detalhes: "Módulos Tier 1, Inversor homologado, cabeamento solar e string box",
            status: "Incluso",
          },
          {
            item: "Instalação & Ativação de Sistema",
            detalhes: "Mão de obra técnica especializada com seguro de responsabilidade civil",
            status: "Incluso",
          },
          {
            item: "Monitoramento e Suporte Pós-Venda",
            detalhes: "Configuração do aplicativo e acompanhamento da primeira fatura",
            status: "Incluso",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-financing",
      type: "financing",
      variant: "default",
      order: 10,
      title: "Formas de Pagamento & Financiamento Solar",
      visible: true,
      content: {
        raw: "<p>Oferecemos condições personalizadas para que o seu sistema se pague sozinho com a própria economia mensal na conta de energia.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Formas de Pagamento & Financiamento Solar",
        text: "<p><strong>Opção 1 — À Vista com Bonificação:</strong> Condição comercial exclusiva com desconto especial para pagamento dividido entre sinal e entrega dos materiais.</p><p><strong>Opção 2 — Cartão de Crédito:</strong> Parcelamento facilitado em até 18x ou 21x na maquininha, sem comprometer linhas de crédito bancárias.</p><p><strong>Opção 3 — Financiamento Solar Bancário (BV, Santander, Sicredi, Sicoob):</strong> Financiamento em até 84 parcelas com carência de até 120 dias para o primeiro pagamento. A parcela mensal é frequentemente menor ou equivalente ao valor que você já gasta hoje na conta de luz.</p>",
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-guarantees",
      type: "guarantees",
      variant: "cards",
      order: 11,
      title: "Garantias Técnicas e Segurança Contratual",
      visible: true,
      content: {
        raw: "<p>Seu investimento é respaldado pelas maiores garantias da indústria mundial e pelo acompanhamento contínuo da nossa equipe de engenharia.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Garantias Técnicas e Segurança Contratual",
        items: [
          {
            title: "25 Anos — Desempenho dos Módulos",
            description:
              "Garantia de que os painéis fotovoltaicos manterão ao menos 84% a 87% de sua capacidade nominal de geração ao fim de 25 anos de operação.",
            icon: "sun",
          },
          {
            title: "10 a 12 Anos — Inversores Fotovoltaicos",
            description:
              "Garantia de fábrica direta para substituição ou reparo rápido com rede de assistência autorizada no Brasil.",
            icon: "cpu",
          },
          {
            title: "10 Anos — Estrutura e Fixação",
            description:
              "Garantia mecânica das fixações e perfis de alumínio contra corrosão prematura e descolamento estrutural.",
            icon: "shield",
          },
          {
            title: "Seguro de Instalação e Homologação",
            description:
              "Responsabilidade integral pela homologação na concessionária local e seguro de montagem durante a execução da obra.",
            icon: "award",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-process",
      type: "process_steps",
      variant: "vertical",
      order: 12,
      title: "Próximos Passos: Como Funciona da Assinatura à Geração",
      visible: true,
      content: {
        raw: "<p>Processo transparente e sem surpresas. Cuidamos de toda a burocracia para que você aproveite sua nova fonte de energia limpa.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Próximos Passos: Como Funciona da Assinatura à Geração",
        items: [
          {
            title: "1. Formalização do Contrato",
            description:
              "Assinatura digital simplificada do contrato de prestação de serviços e alinhamento dos dados cadastrais.",
            estimatedTime: "1 dia útil",
          },
          {
            title: "2. Vistoria Técnica e Projeto na Concessionária",
            description:
              "Engenheiro realiza a vistoria física do padrão de entrada e protocola o projeto técnico junto à distribuidora de energia.",
            estimatedTime: "3 a 7 dias úteis",
          },
          {
            title: "3. Entrega de Equipamentos e Montagem",
            description:
              "Chegada dos materiais segurados e instalação dos módulos, inversores e proteções elétricas por equipe credenciada.",
            estimatedTime: "2 a 4 dias de obra",
          },
          {
            title: "4. Vistoria da Concessionária e Ativação",
            description:
              "A distribuidora substitui o medidor convencional pelo relógio bidirecional e ativa o sistema para geração oficial de créditos.",
            estimatedTime: "5 a 10 dias úteis",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-testimonials",
      type: "testimonials",
      variant: "overlap",
      order: 13,
      title: "O que Nossos Clientes Dizem",
      visible: true,
      content: {
        raw: "<p>A confiança de quem já conquistou independência energética com a nossa engenharia.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "O que Nossos Clientes Dizem",
        sectionEyebrow: "Prova Social de Satisfação",
        items: [
          {
            name: "Família Silva",
            subtitle: "Residencial • Economia de 92%",
            text: "Redução de R$ 980 para a taxa básica. Hoje usamos o ar-condicionado em todos os quartos sem medo da conta no fim do mês. A instalação foi impecável e muito rápida.",
            photo: "",
          },
          {
            name: "Dr. Marcelo Guimarães",
            subtitle: "Comércio • Clínica Médica",
            text: "Nossa despesa com climatização de consultórios era expressiva. Cortamos o custo fixo de forma imediata e a equipe realizou todo o trabalho sem interromper nossos atendimentos.",
            photo: "",
          },
          {
            name: "Carlos Eduardo P.",
            subtitle: "Residencial • Autoconsumo Remoto",
            text: "Instalei na minha residência principal e o excedente abate a conta da nossa casa de veraneio. O aplicativo de monitoramento é muito fácil de acompanhar no dia a dia.",
            photo: "",
          },
          {
            name: "Eng. Roberto Albuquerque",
            subtitle: "Industrial • Metalúrgica",
            text: "Investimento de alto retorno e estratégico para a competitividade da indústria. Engenharia de ponta na elaboração do projeto e cumprimento rigoroso de prazos.",
            photo: "",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-faq",
      type: "faq",
      variant: "two_column",
      order: 14,
      title: "Perguntas Frequentes sobre Energia Solar",
      visible: true,
      content: {
        raw: "<p>Tire suas dúvidas técnicas e comerciais com respostas diretas e transparentes de nossos especialistas.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Perguntas Frequentes sobre Energia Solar",
        items: [
          {
            pergunta: "O que acontece em dias nublados ou chuvosos?",
            resposta:
              "O sistema continua gerando energia através da radiação difusa, mesmo com céu encoberto ou chuva fraca. A geração varia conforme a luminosidade, e nos momentos de baixa geração o imóvel consome energia da concessionária normalmente.",
          },
          {
            pergunta: "E se a rede pública da concessionária faltar luz?",
            resposta:
              "Por exigência das normas de segurança brasileiras (função anti-ilhamento), o inversor on-grid desliga automaticamente para proteger os operadores que realizam reparos na rede pública da rua.",
          },
          {
            pergunta: "Qual é a validade dos créditos de energia gerados?",
            resposta:
              "Toda energia gerada e não consumida instantaneamente é injetada na rede e convertida em créditos energéticos, com validade legal de 60 meses (5 anos) para abatimento nas próximas faturas.",
          },
          {
            pergunta: "A instalação exige reformas pesadas no telhado?",
            resposta:
              "Não. Nossas estruturas de fixação são projetadas para se adaptar ao tipo exato da sua telha (cerâmica, fibrocimento, metálica ou laje) com vedação impermeável, sem quebras e sem comprometer a estrutura do imóvel.",
          },
          {
            pergunta: "Como funciona a manutenção periódica do sistema?",
            resposta:
              "A manutenção é mínima. A própria água da chuva realiza a maior parte da limpeza das placas. Recomenda-se apenas uma inspeção visual e lavagem manual simples 1 a 2 vezes ao ano caso haja acúmulo de poeira ou fuligem.",
          },
          {
            pergunta: "Qual a durabilidade esperada do sistema?",
            resposta:
              "Os módulos fotovoltaicos possuem vida útil superior a 30 anos, com garantia de rendimento linear de 25 anos. O inversor tem vida útil média de 10 a 15 anos e componentes passivos duram décadas.",
          },
        ],
        alignment: "left",
        showSectionDivider: true,
      },
    },
    {
      id: "sec-signature",
      type: "signature",
      variant: "default",
      order: 15,
      title: "Aceite & Formalização da Proposta",
      visible: true,
      content: {
        raw: "<p>Ao assinar este documento, você dá o primeiro passo rumo à autossuficiência energética e economia sustentável para as próximas décadas.</p>",
      },
      style: {},
      // @ts-expect-error campos específicos da seção
      fields: {
        title: "Aceite & Formalização da Proposta",
        sectionEyebrow: "Fechamento Comercial",
        showLegalText: true,
        legalNote:
          "Esta proposta comercial possui validade de 10 dias corridos a partir da data de apresentação, podendo sofrer atualizações caso ocorram alterações tributárias ou cambiais nos equipamentos homologados.",
        companySignerName: "Eng. Responsável Técnico",
        companySignerRole: "Diretoria de Engenharia Fotovoltaica",
        companySignerDocument: "CREA / CFT Ativo",
        clientSignerName: "{{nome_cliente}}",
        clientSignerRole: "Contratante / Titular da Conta",
        clientSignerDocument: "CPF / CNPJ do Titular",
        showDigitalAudit: true,
        alignment: "center",
        showSectionDivider: false,
      },
    },
  ],
};
