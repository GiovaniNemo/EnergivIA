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
    let brandId: string | undefined;
    if (item.marca) {
      const brandName = item.marca.trim();
      let brand = await this.prisma.brand.findFirst({
        where: { name: { equals: brandName, mode: "insensitive" } },
      });
      if (!brand) {
        brand = await this.prisma.brand.create({
          data: { name: brandName },
        });
      }
      brandId = brand.id;
    }

    // Resolve Category
    let categoryId: string | undefined;
    if (item.grupoDeProduto?.descricao) {
      const catName = item.grupoDeProduto.descricao.trim();
      let category = await this.prisma.category.findFirst({
        where: { name: { equals: catName, mode: "insensitive" } },
      });
      if (!category) {
        category = await this.prisma.category.create({
          data: { name: catName },
        });
      }
      categoryId = category.id;
    }

    // Upsert Product
    const skuStr = String(item.codProd);
    let product = await this.prisma.product.findFirst({
      where: {
        name: { equals: item.titulo, mode: "insensitive" },
      },
    });

    if (!product) {
      if (!brandId || !categoryId) {
        return; // Pula se faltar dados obrigatórios de marca/categoria para criar um produto novo
      }
      product = await this.prisma.product.create({
        data: {
          name: item.titulo,
          brandId,
          categoryId,
          specs: {},
        },
      });
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
