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

export function generateKwpRateTiers({
  kwp,
  ratePerKwp,
  roofType,
  monthlyConsumption,
  cidade: _cidade,
  estado: _estado,
}: GenerateKwpRateTiersParams): KwpRateKitTier[] {
  const safeKwp = Math.max(0.5, Number(kwp) || 3.0);
  const safeRate = Math.max(500, Number(ratePerKwp) || 2800);
  const modulePowerW = 585;
  const moduleQty = Math.max(2, Math.round((safeKwp * 1000) / modulePowerW));
  const realSystemKwp = Math.round(((moduleQty * modulePowerW) / 1000) * 100) / 100;
  const estGenPerKwp = 135; // média nacional kWh/mês por kWp
  const estGeneration = Math.round(
    monthlyConsumption && monthlyConsumption > 0 ? monthlyConsumption : realSystemKwp * estGenPerKwp
  );

  const roof = normalizeRoofDescription(roofType);

  const tierConfigs = [
    {
      id: "economic" as const,
      name: "Econômico",
      badge: "Preço Mais Baixo",
      tagline: "Menor investimento inicial com ótima entrega",
      description: "Equipamentos de alta competitividade de mercado e rápido retorno.",
      priceFactor: 0.93, // -7%
      inverterBrand: "Growatt",
      inverterModel: `Inversor Solar Growatt ${Math.round(realSystemKwp)}kW Monofásico/Bifásico`,
      moduleBrand: "DAH Solar",
      moduleModel: `Módulo Fotovoltaico DAH Solar ${modulePowerW}W N-Type Bifacial`,
    },
    {
      id: "cost_benefit" as const,
      name: "Custo-Benefício",
      badge: "Mais Vendido",
      tagline: "Melhor equilíbrio entre preço, tecnologia e durabilidade",
      description: "A linha mais procurada por integradores e clientes finais no Brasil.",
      priceFactor: 1.0, // Base
      inverterBrand: "Deye",
      inverterModel: `Inversor Solar Deye ${Math.round(realSystemKwp)}kW String On-Grid`,
      moduleBrand: "Canadian Solar",
      moduleModel: `Módulo Canadian Solar ${modulePowerW}W TOPBiHiKu6 N-Type`,
    },
    {
      id: "premium" as const,
      name: "Premium",
      badge: "Alta Eficiência",
      tagline: "Tecnologia de ponta, marcas Tier 1 globais e garantia estendida",
      description: "Para clientes exigentes que buscam máxima performance e durabilidade.",
      priceFactor: 1.1, // +10%
      inverterBrand: "Huawei",
      inverterModel: `Inversor Solar Inteligente Huawei SUN2000 ${Math.round(realSystemKwp)}KTL`,
      moduleBrand: "Jinko Solar",
      moduleModel: `Módulo Fotovoltaico Jinko Solar ${modulePowerW}W Tiger Neo N-Type`,
    },
  ];

  return tierConfigs.map((cfg) => {
    const rawTotal = realSystemKwp * safeRate * cfg.priceFactor;
    const totalPrice = Math.round(rawTotal);
    const ratePerKwpEffective = Math.round(totalPrice / realSystemKwp);

    // Diluição proporcional dos produtos:
    // Módulos: 45%
    // Inversor: 35%
    // Estrutura: 8%
    // Cabos: 6% (3% preto + 3% vermelho)
    // Conectores: 6%
    const modTotal = Math.round(totalPrice * 0.45);
    const invTotal = Math.round(totalPrice * 0.35);
    const estTotal = roof.code === "none" ? 0 : Math.round(totalPrice * 0.08);
    const cabPretoTotal = Math.round(totalPrice * 0.03);
    const cabVermelhoTotal = Math.round(totalPrice * 0.03);
    // Ajuste de arredondamento nos conectores para somar 100% exato
    const conTotal = Math.max(
      0,
      totalPrice - (modTotal + invTotal + estTotal + cabPretoTotal + cabVermelhoTotal)
    );

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
        specs: { powerKw: realSystemKwp, type: "On-Grid String" },
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
