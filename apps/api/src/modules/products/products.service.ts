import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import type { QueryProductsDto } from "./dto/query-products.dto";
import type { Product, Prisma } from "@prisma/client";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto): Promise<{
    data: Array<
      Product & {
        brand: { id: string; name: string; imageUrl: string | null };
        category: { id: string; name: string };
      }
    >;
    total: number;
  }> {
    const where: Prisma.ProductWhereInput = {};
    if (query.category) {
      where.category = { name: query.category };
    }
    if (query.brand) {
      where.brand = { name: { equals: query.brand, mode: "insensitive" } };
    }
    if (query.search) {
      where.name = { contains: query.search, mode: "insensitive" };
    }
    if (query.active !== undefined) {
      where.active = query.active;
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
        include: {
          brand: { select: { id: true, name: true, imageUrl: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<
    Product & {
      brand: { id: string; name: string; imageUrl: string | null };
      category: { id: string; name: string };
    }
  > {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true, imageUrl: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundException("Produto não encontrado.");
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        brandId: dto.brand_id,
        categoryId: dto.category_id,
        active: dto.active ?? true,
        specs: dto.specs as object,
        imageUrl: dto.image_url?.trim() || undefined,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.brand_id !== undefined) data.brand = { connect: { id: dto.brand_id } };
    if (dto.category_id !== undefined) data.category = { connect: { id: dto.category_id } };
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.specs !== undefined) data.specs = dto.specs as object;
    if (dto.image_url !== undefined) data.imageUrl = dto.image_url.trim() || null;
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }
}
