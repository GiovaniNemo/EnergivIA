import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import * as xlsx from "xlsx";

const KNOWN_BRANDS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Growatt", pattern: /\bgrowatt\b/i },
  { name: "Deye", pattern: /\bdeye\b/i },
  { name: "Solis", pattern: /\bsolis\b/i },
  { name: "SAJ", pattern: /\bsaj\b/i },
  { name: "Sungrow", pattern: /\bsungrow\b/i },
  { name: "Huawei", pattern: /\bhuawei\b/i },
  { name: "Hoymiles", pattern: /\bhoymiles\b/i },
  { name: "TSUN", pattern: /\btsun\b/i },
  { name: "APsystems", pattern: /\b(apsystems|aps)\b/i },
  { name: "Enphase", pattern: /\benphase\b/i },
  { name: "Fronius", pattern: /\bfronius\b/i },
  { name: "SMA", pattern: /\bsma\b/i },
  { name: "GoodWe", pattern: /\bgoodwe\b/i },
  { name: "Canadian Solar", pattern: /\b(canadian\s*solar|canadian)\b/i },
  { name: "LONGi Solar", pattern: /\b(longi\s*solar|longi)\b/i },
  { name: "Trina Solar", pattern: /\b(trina\s*solar|trina)\b/i },
  { name: "Risen Energy", pattern: /\b(risen\s*energy|risen)\b/i },
  { name: "DAH Solar", pattern: /\b(dah\s*solar|dah)\b/i },
  { name: "JA Solar", pattern: /\b(ja\s*solar|ja)\b/i },
  { name: "Jinko Solar", pattern: /\b(jinko\s*solar|jinko)\b/i },
  { name: "OSDA Solar", pattern: /\b(osda\s*solar|osda)\b/i },
  { name: "BYD", pattern: /\bbyd\b/i },
  { name: "Chint Power", pattern: /\b(chint|astronergy)\b/i },
  { name: "ABB", pattern: /\babb\b/i },
  { name: "WEG", pattern: /\bweg\b/i },
  { name: "Schneider Electric", pattern: /\bschneider\b/i },
  { name: "Stäubli", pattern: /\b(staubli|staübli|multi-contact)\b/i },
  { name: "Merz / Dehn", pattern: /\b(merz|dehn)\b/i },
  { name: "Romagnole", pattern: /\bromagnole\b/i },
  { name: "Solar Group", pattern: /\bsolar\s*group\b/i },
  { name: "Keno", pattern: /\bkeno\b/i },
  { name: "Camefix", pattern: /\bcamefix\b/i },
  { name: "2P", pattern: /\b2p\b/i },
  { name: "Clamper", pattern: /\bclamper\b/i },
  { name: "Proauto", pattern: /\bproauto\b/i },
  { name: "Embrastec", pattern: /\bembrastec\b/i },
  { name: "Komeco", pattern: /\bkomeco\b/i },
  { name: "Neo Solar", pattern: /\bneosolar\b/i },
  { name: "Livoltek", pattern: /\blivoltek\b/i },
  { name: "Must Solar", pattern: /\bmust\b/i },
  { name: "Sofar Solar", pattern: /\bsofar\b/i },
  { name: "SolaX", pattern: /\bsolax\b/i },
];

function normalizeHeaderStr(str: unknown): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parsePrice(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).replace(/R\$/gi, "").replace(/\s+/g, "").trim();
  if (s.includes(",") && s.includes(".")) {
    if (s.indexOf(".") < s.indexOf(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseStock(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : Math.max(0, Math.floor(val));
  if (!val) return 0;
  const s = String(val)
    .replace(/[^\d-]/g, "")
    .trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

function extractBrand(rowBrand: string | undefined, productName: string): string {
  if (rowBrand && rowBrand.trim() && !/^\d+$/.test(rowBrand.trim())) {
    const b = rowBrand.trim();
    if (b.toLowerCase() !== "undefined" && b.toLowerCase() !== "null") {
      return b;
    }
  }

  for (const b of KNOWN_BRANDS) {
    if (b.pattern.test(productName)) {
      return b.name;
    }
  }

  const words = productName.trim().split(/\s+/);
  if (words.length >= 2) {
    if (
      /^(microinversor|inversor|modulo|módulo|painel|estrutura|cabo|conector|string\s*box)$/i.test(
        words[0]!
      )
    ) {
      if (
        words[1] &&
        words[1].length > 1 &&
        !/^(solar|cc|ca|fotovoltaico|mono|bi|p\/|para|\d+)/i.test(words[1])
      ) {
        return words[1].toUpperCase();
      }
    }
  }

  return "Genérica";
}

function normalizeProductForMatching(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(EX|EX-TARIFARIO|EXTARIFARIO|EX-TAR|EXTAR)\b/gi, "")
    .replace(/\b(SOLAR|ON\s*GRID|OFF\s*GRID|FOTOVOLTAICO|MONITORAMENTO|WIFI|NEW|AFCI)\b/gi, "")
    .replace(/[^a-zA-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractModelCode(name: string): string | null {
  const norm = name
    .toUpperCase()
    .replace(/\b(EX|SOLAR|ON\s*GRID|MONITORAMENTO|WIFI|AFCI|NEW)\b/g, "")
    .trim();
  const m = norm.match(/\b([A-Z0-9]{3,}-[A-Z0-9.-]+|[A-Z]{2,}\d+[A-Z0-9.-]*)\b/);
  if (
    m &&
    m[1] &&
    m[1].length >= 4 &&
    !/^(SOLAR|MONOFASICO|TRIFASICO|BIFASICO|INVERSOR|MICROINVERSOR|MODULO|ESTRUTURA|PAINEL)/i.test(
      m[1]
    )
  ) {
    return m[1];
  }
  return null;
}

function extractCategory(productName: string, bannerSection: string = ""): string {
  const pNorm = productName.toLowerCase();

  // 1. O nome do produto tem PRECEDÊNCIA MÁXIMA sobre o cabeçalho de seção
  if (/cabo|cabo\s+solar|flexivel\s+\d+mm|bobina\s+\d+k|rolo\s+\d+\s*metros/i.test(pNorm)) {
    return "dc_cable";
  }
  if (/conector|mc4/i.test(pNorm)) {
    return "connector";
  }
  if (
    /estrutura|trilho|perfil|minitrilho|telha|solo\s+terrestre|fixador|suporte|gancho|parafuso|triangulo|triângulo|grampo/i.test(
      pNorm
    )
  ) {
    return "structure_kit";
  }
  if (/microinversor|micro-inversor|micro\s+inversor|\bmicro\b/i.test(pNorm)) {
    return "microinverter";
  }
  if (/inversor|\binv\b/i.test(pNorm)) {
    return "inverter";
  }
  if (/string\s*box|stringbox|quadro/i.test(pNorm)) {
    return "string_box";
  }
  if (/bateria|acumulador|litio|lítio/i.test(pNorm)) {
    return "battery";
  }
  if (/otimizador|optimizer/i.test(pNorm)) {
    return "optimizer";
  }
  if (/modulo|módulo|painel|placa/i.test(pNorm)) {
    return "module";
  }

  // 2. Fallback para bannerSection caso o nome não declare categorização explícita
  const bNorm = bannerSection.toLowerCase();
  if (/microinversor|micro-inversor|micro\s+inversor|\bmicro\b/i.test(bNorm)) {
    return "microinverter";
  }
  if (/inversor|\binv\b/i.test(bNorm)) {
    return "inverter";
  }
  if (/cabo|cabo\s+solar/i.test(bNorm)) {
    return "dc_cable";
  }
  if (/conector|mc4/i.test(bNorm)) {
    return "connector";
  }
  if (/estrutura|trilho|perfil|telha|solo/i.test(bNorm)) {
    return "structure_kit";
  }
  if (/modulo|módulo|painel|placa/i.test(bNorm)) {
    return "module";
  }

  return "other";
}

interface ProductSpecs {
  power_w?: number;
  nominal_power_w?: number;
  max_power_w?: number;
  voltage_v?: number;
  phase?: string;
  mppt_count?: number;
  max_modules?: number;
  roof_type?: string;
  section_mm2?: number;
  type?: string;
  is_tier_1?: boolean;
}

function extractSpecs(productName: string, category: string, brandName?: string): ProductSpecs {
  const specs: ProductSpecs = {};
  const norm = productName.toUpperCase();

  if (category === "module") {
    const m = norm.match(/(\d{2,4})\s*W\b/);
    if (m && m[1]) {
      specs.power_w = parseInt(m[1], 10);
    }
    // Auto-detecta Tier 1 para marcas de topo da BloombergNEF ou mencao explicita no produto
    const combined = `${productName} ${brandName || ""}`.toLowerCase();
    const isTier1Brand =
      /canadian|longi|jinko|ja solar|trina|risen|astronergy|chint|byd|dah solar|osda/i.test(
        combined
      );
    const hasTier1Text = /tier\s*1/i.test(combined);
    if (isTier1Brand || hasTier1Text) {
      specs.is_tier_1 = true;
    }
  } else if (category === "inverter" || category === "microinverter") {
    const kwMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*KW\b/);
    const wMatch = norm.match(/(\d{3,6})\s*W\b/);

    let powerW = 0;
    if (kwMatch && kwMatch[1]) {
      const kw = parseFloat(kwMatch[1].replace(",", "."));
      powerW = kw * 1000;
    } else if (wMatch && wMatch[1]) {
      powerW = parseInt(wMatch[1], 10);
    }

    if (powerW > 0) {
      specs.nominal_power_w = powerW;
      specs.max_power_w = Math.round(powerW * 1.2);
    }

    if (norm.includes("220V")) specs.voltage_v = 220;
    else if (norm.includes("380V")) specs.voltage_v = 380;
    else if (norm.includes("127V")) specs.voltage_v = 127;

    if (norm.includes("MONOFASICO") || norm.includes("MONO")) specs.phase = "monophasic";
    else if (norm.includes("TRIFASICO") || norm.includes("TRI")) specs.phase = "triphasic";
    else if (norm.includes("BIFASICO") || norm.includes("BI")) specs.phase = "biphasic";

    const mpptMatch = norm.match(/(\d+)\s*MPPT/);
    if (mpptMatch && mpptMatch[1]) {
      specs.mppt_count = parseInt(mpptMatch[1], 10);
    }

    if (category === "microinverter") {
      specs.type = "MICRO_INVERTER";
      if (specs.mppt_count) {
        specs.max_modules = specs.mppt_count;
      }
    } else {
      specs.type = "STRING_INVERTER";
    }
  } else if (category === "structure_kit") {
    const modMatch = norm.match(/(\d+)\s*(?:PAINEIS|PAINÉIS|MODULOS|MÓDULOS|PLACAS)/);
    if (modMatch && modMatch[1]) {
      specs.max_modules = parseInt(modMatch[1], 10);
    }
    if (norm.includes("FIBROMADEIRA") || (norm.includes("FIBRO") && norm.includes("MADEIRA"))) {
      specs.roof_type = "fibromadeira";
    } else if (norm.includes("FIBROMETAL") || (norm.includes("FIBRO") && norm.includes("METAL"))) {
      specs.roof_type = "fibrometal";
    } else if (
      norm.includes("TELHA METALICA") ||
      norm.includes("METÁLICA") ||
      norm.includes("MINI TRILHO") ||
      norm.includes("MINITRILHO") ||
      norm.includes("ZINCO")
    ) {
      specs.roof_type = "metal";
    } else if (norm.includes("SOLO") || norm.includes("TERRESTRE")) {
      specs.roof_type = "ground";
    } else if (norm.includes("LAJE") || norm.includes("TRIANGULO") || norm.includes("TRIÂNGULO")) {
      specs.roof_type = "laje";
    } else if (
      norm.includes("COLONIAL") ||
      norm.includes("CERAMIC") ||
      norm.includes("CERÂMIC") ||
      norm.includes("GANCHO")
    ) {
      specs.roof_type = "ceramic";
    }
  } else if (category === "dc_cable") {
    const mmMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*MM/);
    if (mmMatch && mmMatch[1]) {
      specs.section_mm2 = parseFloat(mmMatch[1].replace(",", "."));
    }
  }

  return specs;
}

@Injectable()
export class SpreadsheetImportService {
  private readonly logger = new Logger(SpreadsheetImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importSpreadsheet(distributorId: string, fileBuffer: Buffer, fileName?: string) {
    this.logger.log(`Iniciando importação de planilha para distribuidor: ${distributorId}`);

    const existingOffers = await this.prisma.distributorProduct.findMany({
      where: { distributorId },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
    });

    const seenProductIds = new Set<string>();
    const priceChanges: Array<{
      productId: string;
      productName: string;
      sku: string | null;
      brand: string;
      category: string;
      oldPrice: number;
      newPrice: number;
      diff: number;
      diffPercent: number;
    }> = [];

    const outOfStockItems: Array<{
      productId: string;
      productName: string;
      sku: string | null;
      brand: string;
      category: string;
      oldStock: number;
      newStock: number;
      reason: "zero_stock" | "removed_from_sheet";
    }> = [];

    const brandReviewItems: Array<{
      productId: string;
      productName: string;
      sku: string | null;
      currentBrand: string;
      category: string;
      price: number;
      isNew: boolean;
    }> = [];

    const missingSpecsItems: Array<{
      productId: string;
      productName: string;
      sku: string | null;
      brand: string;
      category: string;
      missingFields: string[];
      isCritical: boolean;
    }> = [];

    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Nenhuma aba encontrada na planilha.");
    }

    // Selecionar a aba de produtos / preços
    let targetSheetName = workbook.SheetNames[0]!;
    const candidate = workbook.SheetNames.find((s) =>
      /preço|preco|unit|produto|item|tabela|estoque|geral|catalogo/i.test(s)
    );
    if (candidate) {
      targetSheetName = candidate;
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      throw new Error("Aba não encontrada ou inválida na planilha.");
    }

    // Converter aba para JSON (array de arrays)
    const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (rows.length < 2) {
      throw new Error("Planilha vazia ou sem dados válidos.");
    }

    // Procurar linha de cabeçalho nas primeiras 30 linhas
    let headerRowIndex = -1;
    let codIndex = -1,
      produtoIndex = -1,
      marcaIndex = -1,
      precoIndex = -1,
      estoqueIndex = -1;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r] as unknown[];
      if (!row || !Array.isArray(row)) continue;

      let tempCod = -1,
        tempProd = -1,
        tempMarca = -1,
        tempPreco = -1,
        tempEstoque = -1;

      for (let i = 0; i < row.length; i++) {
        const h = normalizeHeaderStr(row[i]);
        if (!h) continue;

        if (/^(cod|codigo|cod\.|sku|part\s*number|item)$/i.test(h) || h.startsWith("cod")) {
          tempCod = i;
        }
        if (
          h.includes("produto") ||
          h.includes("descri") ||
          h.includes("modelo") ||
          h.includes("equipamento") ||
          h.includes("material") ||
          h === "nome"
        ) {
          tempProd = i;
        }
        if (h.includes("marca") || h.includes("fabricante") || h === "brand") {
          tempMarca = i;
        }
        if (
          h.includes("preco") ||
          h.includes("valor") ||
          h.includes("unit") ||
          h.includes("venda") ||
          h.includes("custo") ||
          h === "r$"
        ) {
          tempPreco = i;
        }
        if (
          h.includes("estoque") ||
          h.includes("saldo") ||
          h.includes("qtd") ||
          h.includes("quantidade") ||
          h.includes("stock") ||
          h.includes("disp")
        ) {
          tempEstoque = i;
        }
      }

      if (tempProd !== -1 || (tempCod !== -1 && tempPreco !== -1)) {
        headerRowIndex = r;
        codIndex = tempCod;
        produtoIndex = tempProd;
        marcaIndex = tempMarca;
        precoIndex = tempPreco;
        estoqueIndex = tempEstoque;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      produtoIndex = 1;
      codIndex = 0;
      precoIndex = 2;
    }

    if (produtoIndex === -1 && codIndex === 0) produtoIndex = 1;
    if (codIndex === -1 && produtoIndex === 1) codIndex = 0;
    if (precoIndex === -1 && produtoIndex !== 2) precoIndex = 2;

    let itemsProcessed = 0;
    let itemsUpdated = 0;
    let itemsCreated = 0;
    let skippedReason = "";
    let currentBannerSection = "";

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] as unknown[];
      if (!row || !Array.isArray(row)) continue;

      const rawProduto = produtoIndex !== -1 ? row[produtoIndex] : undefined;
      const produtoStr = rawProduto != null ? String(rawProduto).trim() : "";

      if (!produtoStr) continue;

      // Detectar se é linha de cabeçalho de seção (ex: "ESTRUTURA SOLO P/ 4 Módulos")
      const codRaw = codIndex !== -1 && row[codIndex] != null ? String(row[codIndex]).trim() : "";
      let precoRaw = precoIndex !== -1 ? row[precoIndex] : undefined;

      // Busca dinâmica pelo preço se a coluna de preço estiver vazia
      if (precoRaw == null || (typeof precoRaw !== "number" && !parsePrice(precoRaw))) {
        for (let i = row.length - 1; i >= 0; i--) {
          if (i === codIndex || i === produtoIndex || i === marcaIndex || i === estoqueIndex)
            continue;
          const val = row[i];
          if (typeof val === "number" && val > 0) {
            precoRaw = val;
            break;
          }
          if (typeof val === "string" && parsePrice(val) > 0) {
            precoRaw = val;
            break;
          }
        }
      }

      const price = parsePrice(precoRaw);

      // Se não tem preço ou preço é 0, pode ser cabeçalho de seção
      if (price <= 0) {
        if (!codRaw || codRaw.length < 2) {
          currentBannerSection = produtoStr;
        } else if (!skippedReason) {
          skippedReason = `Linha ${r + 1} (${produtoStr}): Preço inválido (${precoRaw}).`;
        }
        continue;
      }

      const codStr = codRaw || undefined;
      const marcaStr =
        marcaIndex !== -1 && row[marcaIndex] != null ? String(row[marcaIndex]).trim() : undefined;
      const resolvedBrand = extractBrand(marcaStr, produtoStr);

      const resolvedStock =
        estoqueIndex !== -1 && row[estoqueIndex] != null ? parseStock(row[estoqueIndex]) : 999;

      const catName = extractCategory(produtoStr, currentBannerSection);
      const specs = extractSpecs(produtoStr, catName, resolvedBrand);

      // --- Operações no Banco de Dados ---

      // 1. Marca
      let brand = await this.prisma.brand.findFirst({
        where: { name: { equals: resolvedBrand, mode: "insensitive" } },
      });
      if (!brand) {
        brand = await this.prisma.brand.create({ data: { name: resolvedBrand } });
      }

      // 2. Categoria
      let category = await this.prisma.category.findFirst({
        where: { name: { equals: catName, mode: "insensitive" } },
      });
      if (!category) {
        category = await this.prisma.category.create({ data: { name: catName } });
      }

      // 3. Buscar Produto existente com deduplicação inteligente (SKU -> Nome exato -> Normalizado -> Sem "EX" -> Modelo/Código)
      let product = null;

      // 3.1 Busca por SKU do distribuidor
      if (codStr) {
        const existingOfferBySku = await this.prisma.distributorProduct.findFirst({
          where: {
            distributorId,
            distributorSku: codStr,
          },
          include: { product: true },
        });
        if (existingOfferBySku?.product) {
          product = existingOfferBySku.product;
        }
      }

      // 3.2 Busca por Nome exato
      if (!product) {
        product = await this.prisma.product.findFirst({
          where: { name: { equals: produtoStr, mode: "insensitive" } },
        });
      }

      // 3.3 Busca por Nome limpo (espaçamento normalizado)
      if (!product) {
        const normalizedName = produtoStr.replace(/\s+/g, " ").trim();
        product = await this.prisma.product.findFirst({
          where: { name: { equals: normalizedName, mode: "insensitive" } },
        });
      }

      // 3.4 Busca desconsiderando "EX" (Ex-tarifário) e termos acessórios ("ON GRID", "SOLAR", "MONITORAMENTO")
      if (!product) {
        const cleanedQuery = normalizeProductForMatching(produtoStr);
        if (cleanedQuery.length >= 6) {
          const candidates = await this.prisma.product.findMany({
            where: {
              OR: [{ brandId: brand.id }, { categoryId: category.id }],
            },
          });

          for (const cand of candidates) {
            const candCleaned = normalizeProductForMatching(cand.name);
            if (candCleaned === cleanedQuery) {
              product = cand;
              break;
            }
          }
        }
      }

      // 3.5 Busca por Código de Modelo + Marca (ex: MIC3000TL-X2, GW5K-DNS-G40, CS6W-585T, SUN-4K-G05P1-EU-AM2)
      if (!product) {
        const modelCode = extractModelCode(produtoStr);
        if (modelCode && modelCode.length >= 4) {
          const candByModel = await this.prisma.product.findFirst({
            where: {
              brandId: brand.id,
              name: { contains: modelCode, mode: "insensitive" },
            },
          });
          if (candByModel) {
            product = candByModel;
          }
        }
      }

      if (!product) {
        product = await this.prisma.product.create({
          data: {
            name: produtoStr,
            brandId: brand.id,
            categoryId: category.id,
            specs: Object.keys(specs).length > 0 ? (specs as Prisma.InputJsonValue) : {},
          },
        });
      } else if (Object.keys(specs).length > 0) {
        // Atualizar specs mesclando caso produto existente não tenha ou esteja incompleto
        const currentSpecs = (product.specs as Record<string, unknown>) || {};
        const merged = { ...specs, ...currentSpecs };
        // Se as specs atuais estavam vazias ou ganharam novos campos úteis
        if (
          Object.keys(currentSpecs).length === 0 ||
          Object.keys(merged).length > Object.keys(currentSpecs).length
        ) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { specs: merged as Prisma.InputJsonValue },
          });
        }
      }

      seenProductIds.add(product.id);

      // 4. Upsert DistributorProduct (atualiza preço e quantidade se já existir)
      const existingOffer = await this.prisma.distributorProduct.findUnique({
        where: {
          distributorId_productId: {
            distributorId,
            productId: product.id,
          },
        },
      });

      if (existingOffer) {
        const oldPrice = Number(existingOffer.price);
        const oldStock = existingOffer.stockQuantity;

        if (Math.abs(price - oldPrice) >= 0.01) {
          const diff = Number((price - oldPrice).toFixed(2));
          const diffPercent = oldPrice > 0 ? Number(((diff / oldPrice) * 100).toFixed(1)) : 0;
          priceChanges.push({
            productId: product.id,
            productName: produtoStr,
            sku: codStr || existingOffer.distributorSku || null,
            brand: brand.name,
            category: catName,
            oldPrice,
            newPrice: price,
            diff,
            diffPercent,
          });
        }

        if (resolvedStock === 0 && oldStock > 0) {
          outOfStockItems.push({
            productId: product.id,
            productName: produtoStr,
            sku: codStr || existingOffer.distributorSku || null,
            brand: brand.name,
            category: catName,
            oldStock,
            newStock: 0,
            reason: "zero_stock",
          });
        }

        await this.prisma.distributorProduct.update({
          where: { id: existingOffer.id },
          data: {
            price,
            stockQuantity: resolvedStock,
            distributorSku: codStr || existingOffer.distributorSku,
            lastPriceUpdate: new Date(),
          },
        });
        itemsUpdated++;
      } else {
        await this.prisma.distributorProduct.create({
          data: {
            distributorId,
            productId: product.id,
            price,
            stockQuantity: resolvedStock,
            distributorSku: codStr,
            lastPriceUpdate: new Date(),
          },
        });
        itemsCreated++;
      }

      // 5. Rastreamento de Marca Genérica (para ajuste pelo usuário)
      const isGenericBrand =
        brand.name.toLowerCase().includes("genéric") ||
        brand.name.toLowerCase() === "generico" ||
        brand.name.toLowerCase() === "generica";

      if (isGenericBrand) {
        brandReviewItems.push({
          productId: product.id,
          productName: produtoStr,
          sku: codStr || null,
          currentBrand: brand.name,
          category: catName,
          price,
          isNew: !existingOffer,
        });
      }

      // 6. Rastreamento de Ficha Técnica (para dimensionamento correto)
      const currentSpecs = (product.specs as Record<string, unknown>) || {};
      const mergedSpecs: Record<string, unknown> = { ...currentSpecs, ...specs };
      const missingFields: string[] = [];
      let isCritical = false;

      if (catName === "module") {
        if (!mergedSpecs["power_w"]) {
          missingFields.push("Potência do Módulo (Wp)");
          isCritical = true;
        }
      } else if (
        catName === "inverter" ||
        catName === "microinverter" ||
        catName === "hybrid_inverter" ||
        catName === "off_grid_inverter"
      ) {
        if (!mergedSpecs["nominal_power_w"] && !mergedSpecs["max_module_power"]) {
          missingFields.push("Potência Nominal (kW/W)");
          isCritical = true;
        }
      } else if (catName === "structure_kit") {
        if (!mergedSpecs["roof_type"]) {
          missingFields.push("Tipo de Telhado/Fixação");
          isCritical = true;
        }
        if (!mergedSpecs["max_modules"]) {
          missingFields.push("Qtd. Máx. Módulos");
        }
      } else if (catName === "dc_cable") {
        if (!mergedSpecs["section_mm2"]) {
          missingFields.push("Bitola do Cabo (mm²)");
        }
      } else if (catName === "battery") {
        if (!mergedSpecs["capacity_kwh"]) {
          missingFields.push("Capacidade da Bateria (kWh)");
          isCritical = true;
        }
      }

      if (missingFields.length > 0) {
        missingSpecsItems.push({
          productId: product.id,
          productName: produtoStr,
          sku: codStr || null,
          brand: brand.name,
          category: catName,
          missingFields,
          isCritical,
        });
      }

      itemsProcessed++;
    }

    // 7. Rastrear itens ausentes da nova planilha (produtos que esgotaram/saíram de linha)
    for (const oldOffer of existingOffers) {
      if (!seenProductIds.has(oldOffer.productId)) {
        if (oldOffer.stockQuantity > 0) {
          await this.prisma.distributorProduct.update({
            where: { id: oldOffer.id },
            data: { stockQuantity: 0, lastPriceUpdate: new Date() },
          });
        }
        outOfStockItems.push({
          productId: oldOffer.productId,
          productName: oldOffer.product.name,
          sku: oldOffer.distributorSku || null,
          brand: oldOffer.product.brand?.name ?? "—",
          category: oldOffer.product.category?.name ?? "other",
          oldStock: oldOffer.stockQuantity,
          newStock: 0,
          reason: "removed_from_sheet",
        });
      }
    }

    // Processamento opcional da aba de frete (ex: "Frete por UF")
    let freightImportCount = 0;
    const freightSheetName = workbook.SheetNames.find((s) => /frete/i.test(s));
    if (freightSheetName && freightSheetName !== targetSheetName) {
      const freightSheet = workbook.Sheets[freightSheetName];
      if (freightSheet) {
        const fRows = xlsx.utils.sheet_to_json<unknown[]>(freightSheet, {
          header: 1,
          defval: "",
        });
        const UF_LIST = [
          "AC",
          "AL",
          "AP",
          "AM",
          "BA",
          "CE",
          "DF",
          "ES",
          "GO",
          "MA",
          "MT",
          "MS",
          "MG",
          "PA",
          "PB",
          "PR",
          "PE",
          "PI",
          "RJ",
          "RN",
          "RS",
          "RO",
          "RR",
          "SC",
          "SP",
          "SE",
          "TO",
        ];

        for (const fRow of fRows) {
          if (!Array.isArray(fRow)) continue;
          for (let i = 0; i < fRow.length; i++) {
            const cell = String(fRow[i]).trim().toUpperCase();
            if (UF_LIST.includes(cell)) {
              for (let j = 0; j < fRow.length; j++) {
                if (j === i) continue;
                const p = parsePrice(fRow[j]);
                if (p > 0) {
                  await this.prisma.freightRule.upsert({
                    where: { distributorId_state: { distributorId, state: cell } },
                    update: { value: p },
                    create: { distributorId, state: cell, value: p },
                  });
                  freightImportCount++;
                  break;
                }
              }
            }
          }
        }
      }
    }

    const summary = {
      totalProcessed: itemsProcessed,
      itemsCreated,
      itemsUpdated,
      priceChangesCount: priceChanges.length,
      outOfStockCount: outOfStockItems.length,
      brandReviewCount: brandReviewItems.length,
      missingSpecsCount: missingSpecsItems.length,
      criticalSpecsCount: missingSpecsItems.filter((m) => m.isCritical).length,
      freightImportCount,
    };

    const details = {
      priceChanges,
      outOfStockItems,
      brandReviewItems,
      missingSpecsItems,
      dismissedGenericIds: [] as string[],
    };

    const importLog = await this.prisma.distributorImportLog.create({
      data: {
        distributorId,
        fileName: fileName || null,
        summary: summary as unknown as Prisma.InputJsonValue,
        details: details as unknown as Prisma.InputJsonValue,
      },
    });

    const freightMsg =
      freightImportCount > 0 ? ` + ${freightImportCount} regras de frete atualizadas.` : "";

    return {
      success: true,
      message: `Planilha importada com sucesso: ${itemsProcessed} itens processados (${itemsCreated} novos produtos, ${itemsUpdated} ofertas atualizadas)${freightMsg}.${
        itemsProcessed === 0 && skippedReason ? " Motivo do primeiro erro: " + skippedReason : ""
      }`,
      logId: importLog.id,
      summary,
      details,
    };
  }

  async getLatestImportLog(distributorId: string) {
    const log = await this.prisma.distributorImportLog.findFirst({
      where: { distributorId },
      orderBy: { createdAt: "desc" },
    });
    if (!log) return null;

    const details = (log.details as Record<string, unknown>) || {};
    const missingSpecsRaw =
      (details["missingSpecsItems"] as Array<{
        productId: string;
        productName: string;
        sku: string | null;
        brand: string;
        category: string;
        missingFields: string[];
        isCritical: boolean;
      }>) || [];

    const brandReviewRaw =
      (details["brandReviewItems"] as Array<{
        productId: string;
        productName: string;
        sku: string | null;
        currentBrand: string;
        category: string;
        price: number;
        isNew: boolean;
      }>) || [];

    // Revalidação dinâmica contra o banco de dados em tempo real
    const allProductIds = Array.from(
      new Set([
        ...missingSpecsRaw.map((m) => m.productId),
        ...brandReviewRaw.map((b) => b.productId),
      ])
    );

    if (allProductIds.length > 0) {
      const liveProducts = await this.prisma.product.findMany({
        where: { id: { in: allProductIds } },
        include: { brand: true, category: true },
      });
      const liveMap = new Map(liveProducts.map((p) => [p.id, p]));

      const revalidatedMissing: typeof missingSpecsRaw = [];
      for (const item of missingSpecsRaw) {
        const live = liveMap.get(item.productId);
        // Se o produto foi deletado/mesclado, não exibe
        if (!live) continue;

        const liveCat = live.category?.name ?? item.category;
        const liveSpecs = (live.specs as Record<string, unknown>) || {};
        const missingFields: string[] = [];
        let isCritical = false;

        if (liveCat === "module") {
          if (!liveSpecs["power_w"]) {
            missingFields.push("Potência do Módulo (Wp)");
            isCritical = true;
          }
        } else if (
          liveCat === "inverter" ||
          liveCat === "microinverter" ||
          liveCat === "hybrid_inverter" ||
          liveCat === "off_grid_inverter"
        ) {
          if (!liveSpecs["nominal_power_w"] && !liveSpecs["max_module_power"]) {
            missingFields.push("Potência Nominal (kW/W)");
            isCritical = true;
          }
        } else if (liveCat === "structure_kit") {
          if (!liveSpecs["roof_type"]) {
            missingFields.push("Tipo de Telhado/Fixação");
            isCritical = true;
          }
          if (!liveSpecs["max_modules"]) {
            missingFields.push("Qtd. Máx. Módulos");
          }
        } else if (liveCat === "dc_cable") {
          if (!liveSpecs["section_mm2"]) {
            missingFields.push("Bitola do Cabo (mm²)");
          }
        } else if (liveCat === "battery") {
          if (!liveSpecs["capacity_kwh"]) {
            missingFields.push("Capacidade da Bateria (kWh)");
            isCritical = true;
          }
        }

        if (missingFields.length > 0) {
          revalidatedMissing.push({
            ...item,
            productName: live.name,
            brand: live.brand?.name ?? item.brand,
            category: liveCat,
            missingFields,
            isCritical,
          });
        }
      }

      const revalidatedBrandReview: typeof brandReviewRaw = [];
      for (const item of brandReviewRaw) {
        const live = liveMap.get(item.productId);
        if (!live) continue;
        const brandName = live.brand?.name ?? item.currentBrand;
        const isGeneric =
          brandName.toLowerCase().includes("genéric") ||
          brandName.toLowerCase() === "generico" ||
          brandName.toLowerCase() === "generica";
        if (isGeneric) {
          revalidatedBrandReview.push({
            ...item,
            productName: live.name,
            currentBrand: brandName,
            category: live.category?.name ?? item.category,
          });
        }
      }

      const summary = (log.summary as Record<string, unknown>) || {};
      const updatedSummary = {
        ...summary,
        missingSpecsCount: revalidatedMissing.length,
        criticalSpecsCount: revalidatedMissing.filter((m) => m.isCritical).length,
        brandReviewCount: revalidatedBrandReview.length,
      };

      const updatedDetails = {
        ...details,
        missingSpecsItems: revalidatedMissing,
        brandReviewItems: revalidatedBrandReview,
      };

      return {
        ...log,
        summary: updatedSummary,
        details: updatedDetails,
      };
    }

    return log;
  }

  async dismissGenericInLog(logId: string, productId: string) {
    const log = await this.prisma.distributorImportLog.findUnique({
      where: { id: logId },
    });
    if (!log) {
      throw new NotFoundException(`Registro de auditoria (${logId}) não encontrado.`);
    }
    const details = (log.details as Record<string, unknown>) || {};
    const dismissed = Array.isArray(details["dismissedGenericIds"])
      ? (details["dismissedGenericIds"] as string[])
      : [];
    if (!dismissed.includes(productId)) {
      dismissed.push(productId);
    }
    return this.prisma.distributorImportLog.update({
      where: { id: logId },
      data: {
        details: {
          ...details,
          dismissedGenericIds: dismissed,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updateProductBrand(productId: string, brandId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { brandId },
      include: { brand: true, category: true },
    });
  }
}
