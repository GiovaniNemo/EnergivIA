import { Injectable, NotFoundException } from "@nestjs/common";
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
      },
    });
  }
}
