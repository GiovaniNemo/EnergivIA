import { Injectable, Logger } from "@nestjs/common";
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

function extractCategory(productName: string, bannerSection: string = ""): string {
  const combined = `${bannerSection} ${productName}`.toLowerCase();

  if (/microinversor|micro-inversor|micro\s+inversor|\bmicro\b/i.test(combined)) {
    return "microinverter";
  }
  if (/inversor|\binv\b/i.test(combined)) {
    return "inverter";
  }
  if (/modulo|módulo|painel|placa|fotovoltaic/i.test(combined)) {
    return "module";
  }
  if (/cabo|cabo\s+solar|flexivel\s+\d+mm/i.test(combined)) {
    return "dc_cable";
  }
  if (/conector|mc4/i.test(combined)) {
    return "connector";
  }
  if (
    /estrutura|trilho|perfil|telha|solo\s+terrestre|fixador|suporte|gancho|parafuso/i.test(combined)
  ) {
    return "structure_kit";
  }
  if (/string\s*box|stringbox|quadro/i.test(combined)) {
    return "string_box";
  }
  if (/bateria|acumulador|litio|lítio/i.test(combined)) {
    return "battery";
  }
  if (/otimizador|optimizer/i.test(combined)) {
    return "optimizer";
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
  type?: string;
}

function extractSpecs(productName: string, category: string): ProductSpecs {
  const specs: ProductSpecs = {};
  const norm = productName.toUpperCase();

  if (category === "module") {
    const m = norm.match(/(\d{2,4})\s*W\b/);
    if (m && m[1]) {
      specs.power_w = parseInt(m[1], 10);
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
  }

  return specs;
}

@Injectable()
export class SpreadsheetImportService {
  private readonly logger = new Logger(SpreadsheetImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importSpreadsheet(distributorId: string, fileBuffer: Buffer) {
    this.logger.log(`Iniciando importação de planilha para distribuidor: ${distributorId}`);

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
      const specs = extractSpecs(produtoStr, catName);

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

      // 3. Buscar Produto existente (1º por SKU do distribuidor, 2º por Nome exato/normalizado)
      let product = null;

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

      if (!product) {
        product = await this.prisma.product.findFirst({
          where: { name: { equals: produtoStr, mode: "insensitive" } },
        });
      }

      if (!product) {
        const normalizedName = produtoStr.replace(/\s+/g, " ").trim();
        product = await this.prisma.product.findFirst({
          where: { name: { equals: normalizedName, mode: "insensitive" } },
        });
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
        // Atualizar specs caso produto existente não as tenha
        const currentSpecs = (product.specs as Record<string, unknown>) || {};
        if (Object.keys(currentSpecs).length === 0) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { specs: specs as Prisma.InputJsonValue },
          });
        }
      }

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

      itemsProcessed++;
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

    const freightMsg =
      freightImportCount > 0 ? ` + ${freightImportCount} regras de frete atualizadas.` : "";

    return {
      success: true,
      message: `Planilha importada com sucesso: ${itemsProcessed} itens processados (${itemsCreated} novos produtos, ${itemsUpdated} ofertas atualizadas)${freightMsg}.${
        itemsProcessed === 0 && skippedReason ? " Motivo do primeiro erro: " + skippedReason : ""
      }`,
    };
  }
}
