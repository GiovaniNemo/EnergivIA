import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

interface EdeltecCredentials {
  apiKey: string;
  secret: string;
}

interface EdeltecProduct {
  id: string;
  codProd: number;
  titulo: string;
  marca: string;
  tipoDeProduto: string;
  precoDoIntegrador: number;
  disponivelEmEstoque: boolean;
  grupoDeProduto?: {
    descricao: string;
  };
  ehGerador?: boolean;
  potenciaGerador?: number;
  potenciaInversor?: number;
  potenciaModulo?: number;
  tensaoSaida?: number;
  fase?: string;
  potencia?: number;
}

@Injectable()
export class EdeltecService {
  private readonly logger = new Logger(EdeltecService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getAuthToken(credentials: EdeltecCredentials): Promise<string> {
    const response = await fetch("https://api.edeltecsolar.com.br/api-access/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`Falha ao autenticar na Edeltec: ${response.statusText}`);
    }

    const token = await response.text();
    // Sometimes Edeltec might return token enclosed in quotes or as json depending on docs,
    // assuming raw text from docs "eyJ..." or JSON. If text:
    return token.trim();
  }

  async syncCatalog(distributorId: string): Promise<{ success: boolean; message: string }> {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor || !distributor.apiCredentials) {
      throw new Error("Distribuidor não encontrado ou sem credenciais configuradas.");
    }

    const creds = distributor.apiCredentials as unknown as EdeltecCredentials;
    if (!creds.apiKey || !creds.secret) {
      throw new Error("Credenciais inválidas para a Edeltec.");
    }

    try {
      const token = await this.getAuthToken(creds);
      this.logger.log(`Autenticado com sucesso na Edeltec para distribuidor ${distributorId}`);

      let currentPage = 1;
      let totalPages = 1;
      let itemsProcessed = 0;

      do {
        const response = await fetch(
          `https://api.edeltecsolar.com.br/produtos/integration?limit=100&page=${currentPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          throw new Error(`Falha ao buscar produtos na Edeltec na página ${currentPage}`);
        }

        const data = (await response.json()) as {
          items?: EdeltecProduct[];
          meta?: { totalPages?: number };
        };
        const items: EdeltecProduct[] = data.items || [];
        totalPages = data.meta?.totalPages || 1;

        for (const item of items) {
          await this.processItem(distributorId, item);
          itemsProcessed++;
        }

        currentPage++;
      } while (currentPage <= totalPages);

      return {
        success: true,
        message: `Catálogo sincronizado. ${itemsProcessed} produtos processados.`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Desconhecido";
      this.logger.error(`Erro ao sincronizar Edeltec: ${msg}`);
      throw new Error(`Erro na sincronização Edeltec: ${msg}`);
    }
  }

  private async processItem(distributorId: string, item: EdeltecProduct) {
    if (!item.titulo || item.precoDoIntegrador == null) return;

    // Resolve Brand
    const brandName = item.marca?.trim() || "Genérica";
    let brand = await this.prisma.brand.findFirst({
      where: { name: { equals: brandName, mode: "insensitive" } },
    });
    if (!brand) {
      brand = await this.prisma.brand.create({
        data: { name: brandName },
      });
    }
    const brandId = brand.id;

    // Resolve Category
    let catName = item.grupoDeProduto?.descricao?.trim() || item.tipoDeProduto?.trim() || "Outros";
    if (!item.ehGerador) {
      if (/modulo|placa|painel/i.test(catName) || /modulo|placa|painel/i.test(item.titulo)) {
        catName = "module";
      } else if (/inversor/i.test(catName) || /inversor/i.test(item.titulo)) {
        if (/micro/i.test(item.titulo)) {
          catName = "microinverter";
        } else {
          catName = "inverter";
        }
      } else if (/cabo/i.test(catName) || /cabo/i.test(item.titulo)) {
        catName = "dc_cable";
      } else if (
        /conector/i.test(catName) ||
        /conector/i.test(item.titulo) ||
        /mc4/i.test(item.titulo)
      ) {
        catName = "connector";
      } else if (/estrutura/i.test(catName) || /estrutura/i.test(item.titulo)) {
        catName = "structure_kit";
      }
    }

    let category = await this.prisma.category.findFirst({
      where: { name: { equals: catName, mode: "insensitive" } },
    });
    if (!category) {
      category = await this.prisma.category.create({
        data: { name: catName },
      });
    }
    const categoryId = category.id;

    // Extract Specs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let specs: any = {};
    if (!item.ehGerador) {
      if (catName === "module") {
        const powerMatches = item.titulo.match(/(\d{3,4})w/i);
        const power =
          item.potenciaModulo ||
          item.potencia ||
          (powerMatches ? parseInt(powerMatches[1]!, 10) : 0);
        if (power > 0) specs = { power_w: power };
      } else if (catName === "inverter") {
        const powerMatches = item.titulo.match(/(\d+([.,]\d+)?)k/i);
        let powerKW = item.potenciaInversor || item.potencia || 0;
        if (!powerKW && powerMatches) {
          powerKW = parseFloat(powerMatches[1]!.replace(",", "."));
        }
        const powerW = powerKW < 100 ? powerKW * 1000 : powerKW;
        const voltage = item.tensaoSaida || (item.titulo.includes("220") ? 220 : 380);
        if (powerW > 0) {
          specs = {
            nominal_power_w: powerW,
            max_power_w: powerW * 1.2,
            voltage_v: voltage,
            type: "STRING_INVERTER",
            phase: item.fase || (item.titulo.match(/monof/i) ? "monophasic" : "triphasic"),
          };
        }
      } else if (catName === "microinverter") {
        const powerMatches = item.titulo.match(/(\d{3,4})w/i);
        const power =
          item.potenciaInversor ||
          item.potencia ||
          (powerMatches ? parseInt(powerMatches[1]!, 10) : 0);
        const voltage = item.tensaoSaida || (item.titulo.includes("220") ? 220 : 380);
        if (power > 0) {
          specs = {
            nominal_power_w: power,
            voltage_v: voltage,
            max_modules: 4,
            type: "MICROINVERTER",
          };
        }
      }
    }

    // Upsert Product
    const skuStr = String(item.codProd);
    let product = await this.prisma.product.findFirst({
      where: {
        name: { equals: item.titulo, mode: "insensitive" },
      },
    });

    if (!product) {
      product = await this.prisma.product.create({
        data: {
          name: item.titulo,
          brandId,
          categoryId,
          specs,
        },
      });
    } else {
      // Optional: Update specs of existing products if they are empty
      if (!product.specs || Object.keys(product.specs).length === 0) {
        if (Object.keys(specs).length > 0) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { specs },
          });
        }
      }
    }

    // Upsert DistributorProduct
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
          price: item.precoDoIntegrador,
          stockQuantity: item.disponivelEmEstoque ? 999 : 0, // A Edeltec só retorna boolean
          distributorSku: skuStr,
          lastPriceUpdate: new Date(),
        },
      });
    } else {
      await this.prisma.distributorProduct.create({
        data: {
          distributorId,
          productId: product.id,
          price: item.precoDoIntegrador,
          stockQuantity: item.disponivelEmEstoque ? 999 : 0,
          distributorSku: skuStr,
          lastPriceUpdate: new Date(),
        },
      });
    }
  }
}
