import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SupplierProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPriceBySupplier(productId: string, supplierId: string): Promise<number | null> {
    const sp = await this.prisma.supplierProduct.findUnique({
      where: {
        supplierId_productId: { supplierId, productId },
      },
      select: { price: true },
    });
    return sp ? Number(sp.price) : null;
  }

  async getCheapestOffer(productId: string): Promise<{ supplierId: string; price: number } | null> {
    const sp = await this.prisma.supplierProduct.findFirst({
      where: { productId },
      orderBy: { price: "asc" },
      select: { supplierId: true, price: true },
    });
    return sp ? { supplierId: sp.supplierId, price: Number(sp.price) } : null;
  }

  async getOffersBySupplier(
    supplierId: string,
    productIds: string[]
  ): Promise<
    Map<
      string,
      { price: number; stock: number; leadTimeDays: number | null; minimumOrderQuantity: number }
    >
  > {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.supplierProduct.findMany({
      where: { supplierId, productId: { in: productIds } },
      select: {
        productId: true,
        price: true,
        stock: true,
        leadTimeDays: true,
        minimumOrderQuantity: true,
      },
    });
    const map = new Map<
      string,
      { price: number; stock: number; leadTimeDays: number | null; minimumOrderQuantity: number }
    >();
    for (const r of rows) {
      map.set(r.productId, {
        price: Number(r.price),
        stock: r.stock,
        leadTimeDays: r.leadTimeDays,
        minimumOrderQuantity: r.minimumOrderQuantity,
      });
    }
    return map;
  }

  async getProductIdsBySupplier(supplierId: string): Promise<string[]> {
    const rows = await this.prisma.supplierProduct.findMany({
      where: { supplierId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }
}
