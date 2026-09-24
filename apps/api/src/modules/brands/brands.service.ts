import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateBrandDto } from "./dto/create-brand.dto";
import type { UpdateBrandDto } from "./dto/update-brand.dto";
import type { Brand } from "@prisma/client";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<(Brand & { _count?: { products: number } })[]> {
    return this.prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) throw new NotFoundException("Marca não encontrada.");
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    return this.prisma.brand.create({
      data: {
        name: dto.name,
        country: dto.country ?? undefined,
        imageUrl: dto.image_url?.trim() || undefined,
        categories: dto.categories || [],
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.image_url !== undefined && { imageUrl: dto.image_url.trim() || null }),
        ...(dto.categories !== undefined && { categories: dto.categories }),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    const productCount = await this.prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir a marca, pois ela possui ${productCount} produto(s) vinculado(s).`
      );
    }
    await this.prisma.brand.delete({ where: { id } });
  }

  async getDistributorAvailable(): Promise<{ modules: string[]; inverters: string[] }> {
    const isGeneric = (name: string) => {
      const lower = name.toLowerCase().trim();
      return (
        lower === "genérico" || lower === "generico" || lower === "genérica" || lower === "generica"
      );
    };

    const isStructureBrand = (name: string) => {
      const lower = name.toLowerCase().trim();
      return ["romagnole", "solar group", "pratyc"].includes(lower);
    };

    const modulesSet = new Set<string>();
    const invertersSet = new Set<string>();

    // 1. Marcas cadastradas no Brand com categorias configuradas
    const allBrands = await this.prisma.brand.findMany({
      select: {
        name: true,
        categories: true,
      },
    });

    for (const b of allBrands) {
      const brandName = b.name?.trim();
      if (!brandName || isGeneric(brandName) || isStructureBrand(brandName)) continue;
      const cats = (b.categories || []).map((c) => c.toLowerCase().trim());
      if (cats.includes("module")) {
        modulesSet.add(brandName);
      }
      if (
        cats.includes("inverter") ||
        cats.includes("microinverter") ||
        cats.includes("hybrid_inverter")
      ) {
        invertersSet.add(brandName);
      }
    }

    // 2. Marcas com produtos de distribuidor ativos
    const distProds = await this.prisma.distributorProduct.findMany({
      where: {
        product: {
          active: true,
        },
      },
      select: {
        product: {
          select: {
            brand: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
    });

    for (const dp of distProds) {
      const brandName = dp.product?.brand?.name?.trim();
      const cat = dp.product?.category?.name?.trim().toLowerCase();
      if (!brandName || isGeneric(brandName) || isStructureBrand(brandName)) continue;

      if (cat === "module") {
        modulesSet.add(brandName);
      } else if (cat === "inverter" || cat === "microinverter" || cat === "hybrid_inverter") {
        invertersSet.add(brandName);
      }
    }

    // 3. Fallback se necessário para produtos ativos gerais
    if (modulesSet.size === 0 || invertersSet.size === 0) {
      const activeProds = await this.prisma.product.findMany({
        where: { active: true },
        select: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      });
      for (const p of activeProds) {
        const brandName = p.brand?.name?.trim();
        const cat = p.category?.name?.trim().toLowerCase();
        if (!brandName || isGeneric(brandName) || isStructureBrand(brandName)) continue;
        if (cat === "module") modulesSet.add(brandName);
        else if (cat === "inverter" || cat === "microinverter" || cat === "hybrid_inverter")
          invertersSet.add(brandName);
      }
    }

    return {
      modules: Array.from(modulesSet).sort((a, b) => a.localeCompare(b)),
      inverters: Array.from(invertersSet).sort((a, b) => a.localeCompare(b)),
    };
  }
}
