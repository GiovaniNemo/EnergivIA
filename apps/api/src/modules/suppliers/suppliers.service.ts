import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateSupplierDto } from "./dto/create-supplier.dto";
import type { UpdateSupplierDto } from "./dto/update-supplier.dto";
import type { CreateSupplierProductDto } from "./dto/create-supplier-product.dto";
import type { Supplier } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { supplierProducts: true } } },
    }) as Promise<Supplier[]>;
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        supplierProducts: { include: { product: { include: { brand: true, category: true } } } },
      },
    });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado.");
    return supplier as unknown as Supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        cnpj: dto.cnpj,
        city: dto.city,
        state: dto.state,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    await this.prisma.supplier.findUniqueOrThrow({ where: { id } });
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.cnpj !== undefined && { cnpj: dto.cnpj }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
      },
    });
  }

  async addSupplierProduct(dto: CreateSupplierProductDto) {
    return this.prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: { supplierId: dto.supplier_id, productId: dto.product_id },
      },
      create: {
        supplierId: dto.supplier_id,
        productId: dto.product_id,
        supplierSku: dto.supplier_sku,
        price: new Decimal(dto.price),
        stock: dto.stock ?? 0,
        leadTimeDays: dto.lead_time_days,
        minimumOrderQuantity: dto.minimum_order_quantity ?? 1,
      },
      update: {
        supplierSku: dto.supplier_sku,
        price: new Decimal(dto.price),
        stock: dto.stock ?? 0,
        leadTimeDays: dto.lead_time_days,
        minimumOrderQuantity: dto.minimum_order_quantity ?? 1,
      },
    });
  }
}
