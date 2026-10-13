export interface SectionPresetItem {
  id: string;
  category: string;
  title: string;
  preview: string;
  data: Record<string, string>;
}

export const TESTIMONIAL_PRESETS: SectionPresetItem[] = [
  {
    id: "test-res-1",
    category: "Residencial",
    title: "Família Silva (Ar-condicionado sem medo)",
    preview:
      "Redução de R$ 980 para a taxa mínima. Hoje usamos o ar-condicionado em todos os quartos sem medo da conta.",
    data: {
      name: "Família Silva",
      subtitle: "Residencial • Economia de 92%",
      text: "Redução de R$ 980 para a taxa básica. Hoje usamos o ar-condicionado em todos os quartos sem medo da conta no fim do mês. A instalação foi impecável e muito rápida.",
    },
  },
  {
    id: "test-res-2",
    category: "Residencial",
    title: "Ana Clara M. (Instalação limpa e ágil)",
    preview:
      "Processo muito ágil da homologação à instalação. Telhado limpo e equipe super educada.",
    data: {
      name: "Ana Clara M.",
      subtitle: "Residencial • Sobrado Familiar",
      text: "Processo extremamente ágil, da homologação na distribuidora até a instalação das placas. Telhado limpo, equipe educada e suporte pós-venda sempre disponível.",
    },
  },
  {
    id: "test-res-3",
    category: "Residencial",
    title: "Carlos Eduardo (Casa de Praia & Compensação)",
    preview: "Gero crédito na cidade e compenso na casa de praia. O sistema já se pagou.",
    data: {
      name: "Carlos Eduardo P.",
      subtitle: "Residencial • Autoconsumo Remoto",
      text: "Instalei na minha residência principal e o excedente abate a conta da nossa casa de veraneio. O aplicativo de monitoramento é muito fácil de acompanhar no dia a dia.",
    },
  },
  {
    id: "test-com-1",
    category: "Comércio",
    title: "Mercado & Panificadora Central (Câmaras Frias)",
    preview:
      "Câmaras frias e fornos consumiam todo nosso lucro. Reduzimos o custo fixo em mais de 90%.",
    data: {
      name: "Mercado & Panificadora Central",
      subtitle: "Comércio • Padaria & Mercearia",
      text: "Nossos motores e câmaras frias consumiam uma fatia enorme do lucro operacional. Cortamos a conta em mais de 90% e reinvestimos a economia no próprio negócio.",
    },
  },
  {
    id: "test-com-2",
    category: "Comércio",
    title: "Clínica Odontológica Integrada (Instalação Fim de Semana)",
    preview: "Instalação rápida no sábado e domingo sem atrapalhar o atendimento aos pacientes.",
    data: {
      name: "Dra. Juliana Ferreira",
      subtitle: "Comércio • Clínica Odontológica",
      text: "Equipe super profissional: fizeram toda a montagem no final de semana para não interromper os atendimentos. Economia comprovada logo na primeira fatura.",
    },
  },
  {
    id: "test-rur-1",
    category: "Rural",
    title: "Fazenda Santa Maria (Irrigação & Bomba)",
    preview:
      "Irrigação e bomba d'água funcionando o dia todo com energia do sol. Mudou a rentabilidade.",
    data: {
      name: "Marcio Rezende",
      subtitle: "Rural • Agropecuária & Grãos",
      text: "Bombas de irrigação e maquinário rodando com a força do sol. Cortou nosso custo com diesel e energia da concessionária, aumentando o rendimento de cada hectare.",
    },
  },
  {
    id: "test-rur-2",
    category: "Rural",
    title: "Sítio Recanto Verde (Resfriador de Leite)",
    preview: "Resfriadores de leite rodando 24h sem susto na conta de luz no final do mês.",
    data: {
      name: "Valdir & Família",
      subtitle: "Rural • Produtor de Leite",
      text: "Nossa maior preocupação eram os resfriadores de leite, que não podem parar nunca. O sistema supriu com folga toda a demanda do sítio.",
    },
  },
  {
    id: "test-ind-1",
    category: "Industrial",
    title: "Metalúrgica São José (Média Tensão & Motores)",
    preview:
      "Investimento estratégico para a competitividade da fábrica com redução drástica na fatura.",
    data: {
      name: "Eng. Roberto Albuquerque",
      subtitle: "Industrial • Metalúrgica",
      text: "Investimento de alto retorno e estratégico para a competitividade da indústria. Engenharia de ponta na elaboração do projeto e cumprimento rigoroso de prazos.",
    },
  },
];

export const FAQ_PRESETS: SectionPresetItem[] = [
  {
    id: "faq-fun-1",
    category: "Funcionamento & Rede",
    title: "O que acontece em dias nublados ou chuvosos?",
    preview:
      "O sistema continua gerando energia através da radiação difusa, mesmo com céu encoberto.",
    data: {
      question: "O sistema gera energia em dias nublados ou com chuva?",
      answer:
        "Sim! O sistema fotovoltaico funciona através da luz solar (irradiação) e não do calor. Em dias nublados ou de chuva fraca, os módulos continuam produzindo energia aproveitando a radiação difusa, garantindo abastecimento contínuo.",
    },
  },
  {
    id: "faq-fun-2",
    category: "Funcionamento & Rede",
    title: "E se faltar luz na rede pública da concessionária?",
    preview:
      "O inversor on-grid desliga por segurança (anti-ilhamento) para proteger operadores da rede.",
    data: {
      question: "Se faltar energia na concessionária da rua, continuo com luz?",
      answer:
        "Em sistemas conectados à rede (on-grid padrão), o inversor se desliga automaticamente por exigência normativa de segurança (proteção anti-ilhamento), impedindo choques nos técnicos que estiverem reparando a rede pública.",
    },
  },
  {
    id: "faq-fun-3",
    category: "Funcionamento & Rede",
    title: "Como funciona a compensação de créditos de energia?",
    preview: "Excedente vira créditos em kWh válidos por até 60 meses na mesma distribuidora.",
    data: {
      question: "Como funciona a compensação de créditos com a distribuidora?",
      answer:
        "Toda energia gerada e não consumida no momento é injetada na rede da distribuidora e convertida em créditos energéticos (kWh). Esses créditos têm validade de 60 meses e podem abater o consumo noturno ou de outras contas com o mesmo CPF/CNPJ.",
    },
  },
  {
    id: "faq-gar-1",
    category: "Garantias & Manutenção",
    title: "Qual é a vida útil e garantias dos módulos e inversores?",
    preview: "Painéis com 25 a 30 anos de garantia de geração e vida útil superior a 35 anos.",
    data: {
      question: "Qual é a vida útil dos equipamentos e o tempo de garantia?",
      answer:
        "Os módulos solares possuem garantia linear de geração de 25 a 30 anos (com vida útil que ultrapassa 35 anos). Os inversores contam com garantias de fábrica de 10 a 15 anos. É um patrimônio de longuíssimo prazo para seu imóvel.",
    },
  },
  {
    id: "faq-gar-2",
    category: "Garantias & Manutenção",
    title: "O sistema exige muita manutenção ou limpeza?",
    preview: "Manutenção baixíssima. A própria chuva realiza grande parte da limpeza.",
    data: {
      question: "O sistema solar exige manutenção constante?",
      answer:
        "A manutenção é muito baixa. Os módulos não possuem partes móveis e o próprio ângulo de inclinação aliado à água da chuva realiza a maior parte da limpeza. Recomendamos apenas uma lavagem simples e vistoria preventiva de 1 a 2 vezes ao ano.",
    },
  },
  {
    id: "faq-eco-1",
    category: "Economia & Imóvel",
    title: "A energia solar valoriza o imóvel no mercado?",
    preview: "Estudos imobiliários apontam valorização média de 6% a 10% no valor do imóvel.",
    data: {
      question: "A instalação de energia solar valoriza o imóvel?",
      answer:
        "Com certeza. Pesquisas do setor imobiliário mostram que imóveis com usina solar própria valorizam entre 6% e 10% e são vendidos ou alugados muito mais rápido, já que o novo morador fica livre da conta de luz.",
    },
  },
  {
    id: "faq-eco-2",
    category: "Economia & Imóvel",
    title: "Em quanto tempo recupero o investimento (payback)?",
    preview: "O retorno médio ocorre entre 2,5 e 4 anos, gerando mais de 20 anos de lucro líquido.",
    data: {
      question: "Qual é o tempo médio de retorno do investimento (payback)?",
      answer:
        "No Brasil, o payback médio de um sistema solar gira entre 2,5 e 4 anos. Considerando que os módulos duram mais de 30 anos, você terá mais de duas décadas de energia praticamente livre de custos após quitar o equipamento.",
    },
  },
];

export const SECTION_PRESETS: Record<"testimonials" | "faq", SectionPresetItem[]> = {
  testimonials: TESTIMONIAL_PRESETS,
  faq: FAQ_PRESETS,
};

export function getSectionPresets(sectionType: "testimonials" | "faq"): SectionPresetItem[] {
  return SECTION_PRESETS[sectionType] ?? [];
}

export function getSectionPresetCategories(sectionType: "testimonials" | "faq"): string[] {
  const presets = getSectionPresets(sectionType);
  const categories = Array.from(new Set(presets.map((p) => p.category)));
  return categories;
}
