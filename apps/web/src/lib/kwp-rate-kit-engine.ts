export interface KwpRateKitItem {
  productId?: string;
  productName: string;
  brandName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
  specs?: Record<string, unknown>;
}

export interface KwpRateKitTier {
  id: "economic" | "cost_benefit" | "premium";
  name: string;
  badge: string;
  tagline: string;
  description: string;
  priceFactor: number;
  totalPrice: number;
  totalPriceFormatted: string;
  ratePerKwpEffective: number;
  systemKwp: number;
  inverterPowerKw: number;
  materialsTotal: number;
  estimatedMonthlyGenerationKwh: number;
  inverterBrand: string;
  inverterModel: string;
  moduleBrand: string;
  moduleModel: string;
  moduleQty: number;
  modulePowerW: number;
  structuredItems: KwpRateKitItem[];
  kitSummaryLines: string[];
}

export interface GenerateKwpRateTiersParams {
  kwp: number;
  ratePerKwp: number;
  roofType?: string;
  monthlyConsumption?: number;
  cidade?: string;
  estado?: string;
}

export function normalizeRoofDescription(roofType?: string): { code: string; label: string } {
  const r = (roofType || "").toLowerCase();
  if (r.includes("ceramic") || r.includes("cerâmica") || r.includes("colonial") || r === "1") {
    return { code: "ceramic", label: "Estrutura para Telhado Cerâmico (Colonial)" };
  }
  if (r.includes("fibrometal") || r === "6") {
    return { code: "fibrometal", label: "Estrutura para Fibrocimento (Terça Metálica)" };
  }
  if (
    r.includes("fibro") ||
    r.includes("fibrocimento") ||
    r.includes("fibromadeira") ||
    r === "2"
  ) {
    return { code: "fibromadeira", label: "Estrutura para Fibrocimento (Terça Madeira)" };
  }
  if (r.includes("metal") || r.includes("metálic") || r === "3") {
    return { code: "metal", label: "Estrutura para Telhado Metálico" };
  }
  if (r.includes("solo") || r.includes("ground") || r === "4") {
    return { code: "ground", label: "Estrutura Monoposte/Biposte para Solo" };
  }
  if (r.includes("laje") || r === "5") {
    return { code: "laje", label: "Estrutura com Triângulos para Laje" };
  }
  if (r.includes("sem") || r === "7" || r === "none") {
    return { code: "none", label: "Sem Estrutura de Fixação" };
  }
  return { code: "ceramic", label: "Estrutura para Telhado Cerâmico" };
}

export function getStandardInverterPower(systemKwp: number): number {
  const STANDARD_SIZES = [3, 3.6, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100];
  if (systemKwp <= 3.8) return 3;
  for (const size of STANDARD_SIZES) {
    if (size * 1.3 >= systemKwp) {
      return size;
    }
  }
  return Math.ceil(systemKwp);
}

export function generateKwpRateTiers({
  kwp,
  ratePerKwp,
  roofType,
  monthlyConsumption: _monthlyConsumption,
  cidade: _cidade,
  estado: _estado,
}: GenerateKwpRateTiersParams): KwpRateKitTier[] {
  const safeKwp = Math.max(0.5, Number(kwp) || 3.0);
  const safeRate = Math.max(500, Number(ratePerKwp) || 2800);
  const modulePowerW = 585;
  // Regra fundamental: mínimo de 4 módulos para qualquer cotação
  const moduleQty = Math.max(4, Math.round((safeKwp * 1000) / modulePowerW));
  const realSystemKwp = Math.round(((moduleQty * modulePowerW) / 1000) * 100) / 100;
  const estGenPerKwp = 130; // média nacional kWh/mês por kWp
  const estGeneration = Math.round(realSystemKwp * estGenPerKwp);

  const roof = normalizeRoofDescription(roofType);
  const invPower = getStandardInverterPower(realSystemKwp);

  const tierConfigs = [
    {
      id: "economic" as const,
      name: "Econômico",
      badge: "Preço Mais Baixo",
      tagline: "Menor investimento em equipamentos com boa performance",
      description:
        "Equipamentos de entrada com ótimo custo-benefício para quem busca retorno rápido.",
      priceFactor: 1.0,
      materialCostFactor: 0.88, // materiais ~12% mais econômicos
      inverterBrand: "Growatt",
      inverterPowerKw: invPower,
      inverterModel: `Inversor Solar Growatt ${invPower}kW Monofásico/Bifásico`,
      moduleBrand: "DAH Solar",
      moduleModel: `Módulo Fotovoltaico DAH Solar ${modulePowerW}W N-Type Bifacial`,
    },
    {
      id: "cost_benefit" as const,
      name: "Custo-Benefício",
      badge: "Mais Vendido",
      tagline: "Melhor equilíbrio entre preço, tecnologia e durabilidade",
      description: "A linha mais procurada por integradores e clientes finais no Brasil.",
      priceFactor: 1.0,
      materialCostFactor: 1.0, // padrão de mercado
      inverterBrand: "Deye",
      inverterPowerKw: invPower,
      inverterModel: `Inversor Solar Deye ${invPower}kW String On-Grid`,
      moduleBrand: "Canadian Solar",
      moduleModel: `Módulo Canadian Solar ${modulePowerW}W TOPBiHiKu6 N-Type`,
    },
    {
      id: "premium" as const,
      name: "Premium",
      badge: "Alta Eficiência",
      tagline: "Tecnologia de ponta, marcas Tier 1 globais e garantia estendida",
      description: "Para clientes exigentes que buscam máxima performance e durabilidade.",
      priceFactor: 1.0,
      materialCostFactor: 1.15, // materiais Tier 1 (~15% maior valor agregado)
      inverterBrand: "Huawei",
      inverterPowerKw: invPower,
      inverterModel: `Inversor Solar Inteligente Huawei SUN2000-${invPower}KTL`,
      moduleBrand: "Jinko Solar",
      moduleModel: `Módulo Fotovoltaico Jinko Solar ${modulePowerW}W Tiger Neo N-Type`,
    },
  ];

  return tierConfigs.map((cfg) => {
    // Nas 3 opções, o valor do projeto respeita a taxa de R$/kWp informada pelo integrador
    const totalPrice = Math.round(realSystemKwp * safeRate);
    const ratePerKwpEffective = safeRate;

    // O que varia entre as opções é a composição e custo dos materiais:
    // Base de equipamentos representa cerca de 55% do valor total do projeto:
    const baseEquipmentBudget = totalPrice * 0.55 * cfg.materialCostFactor;

    const modTotal = Math.round(baseEquipmentBudget * 0.5);
    const invTotal = Math.round(baseEquipmentBudget * 0.36);
    const estTotal = roof.code === "none" ? 0 : Math.round(baseEquipmentBudget * 0.08);
    const cabPretoTotal = Math.round(baseEquipmentBudget * 0.02);
    const cabVermelhoTotal = Math.round(baseEquipmentBudget * 0.02);
    const conTotal = Math.round(baseEquipmentBudget * 0.02);

    const modUnitPrice = Math.round((modTotal / moduleQty) * 100) / 100;
    const structuredItems: KwpRateKitItem[] = [
      {
        productId: `kwp-mod-${cfg.id}`,
        productName: cfg.moduleModel,
        brandName: cfg.moduleBrand,
        categoryName: "module",
        quantity: moduleQty,
        unitPrice: modUnitPrice,
        lineTotal: modTotal,
        specs: { power: `${modulePowerW}W`, technology: "N-Type Monocristalino Bifacial" },
      },
      {
        productId: `kwp-inv-${cfg.id}`,
        productName: cfg.inverterModel,
        brandName: cfg.inverterBrand,
        categoryName: "inverter",
        quantity: 1,
        unitPrice: invTotal,
        lineTotal: invTotal,
        specs: { powerKw: invPower, type: "On-Grid String" },
      },
    ];

    if (roof.code !== "none") {
      structuredItems.push({
        productId: `kwp-est-${cfg.id}`,
        productName: `${roof.label} (Kit completo de perfis, grampos e fixadores para ${moduleQty} placas)`,
        brandName: "Alumínio Solar",
        categoryName: "structure_kit",
        quantity: 1,
        unitPrice: estTotal,
        lineTotal: estTotal,
        specs: { roofType: roof.code, moduleQty },
      });
    }

    const cableMeters = Math.max(25, moduleQty * 4);
    structuredItems.push(
      {
        productId: `kwp-cab-p-${cfg.id}`,
        productName: `Cabo Solar Fotovoltaico 6mm² 1,8kV Preto (${cableMeters} metros)`,
        brandName: "Cobrecom / Nexans",
        categoryName: "dc_cable",
        quantity: cableMeters,
        unitPrice: Math.round((cabPretoTotal / cableMeters) * 100) / 100,
        lineTotal: cabPretoTotal,
        specs: { section: "6mm²", color: "Preto", lengthMeters: cableMeters },
      },
      {
        productId: `kwp-cab-v-${cfg.id}`,
        productName: `Cabo Solar Fotovoltaico 6mm² 1,8kV Vermelho (${cableMeters} metros)`,
        brandName: "Cobrecom / Nexans",
        categoryName: "dc_cable",
        quantity: cableMeters,
        unitPrice: Math.round((cabVermelhoTotal / cableMeters) * 100) / 100,
        lineTotal: cabVermelhoTotal,
        specs: { section: "6mm²", color: "Vermelho", lengthMeters: cableMeters },
      },
      {
        productId: `kwp-con-${cfg.id}`,
        productName: "Par de Conectores MC4 Original com Proteção UV (IP68)",
        brandName: "Stäubli",
        categoryName: "connector",
        quantity: 4,
        unitPrice: Math.round((conTotal / 4) * 100) / 100,
        lineTotal: conTotal,
        specs: { standard: "MC4", protection: "IP68" },
      }
    );

    const materialsTotal = structuredItems.reduce((acc, it) => acc + it.lineTotal, 0);

    const kitSummaryLines = [
      `• Inversor: ${cfg.inverterModel}`,
      `• Módulos: ${moduleQty}x ${cfg.moduleModel}`,
      roof.code !== "none" ? `• Estrutura: ${roof.label}` : null,
      `• Cabos: ${cableMeters}m Preto + ${cableMeters}m Vermelho 6mm²`,
      `• Conectores: 4x Pares MC4 IP68`,
    ].filter(Boolean) as string[];

    return {
      id: cfg.id,
      name: cfg.name,
      badge: cfg.badge,
      tagline: cfg.tagline,
      description: cfg.description,
      priceFactor: cfg.priceFactor,
      totalPrice,
      totalPriceFormatted:
        typeof totalPrice === "number" && Number.isFinite(totalPrice)
          ? totalPrice.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "R$ 0,00",
      ratePerKwpEffective,
      systemKwp: realSystemKwp,
      inverterPowerKw: invPower,
      materialsTotal,
      estimatedMonthlyGenerationKwh: estGeneration,
      inverterBrand: cfg.inverterBrand,
      inverterModel: cfg.inverterModel,
      moduleBrand: cfg.moduleBrand,
      moduleModel: cfg.moduleModel,
      moduleQty,
      modulePowerW,
      structuredItems,
      kitSummaryLines,
    };
  });
}
