import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ id: string; name: string }[]> {
    const existing = await this.prisma.category.findFirst({ where: { name: "structure_kit" } });
    if (!existing) {
      const old = await this.prisma.category.findFirst({ where: { name: "Estrutura" } });
      if (old) {
        await this.prisma.category.update({
          where: { id: old.id },
          data: { name: "structure_kit" },
        });
      } else {
        await this.prisma.category.create({ data: { name: "structure_kit" } });
      }
    }

    return this.prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async seed() {
    const cats = [
      "Módulo",
      "Inversor",
      "Microinversor",
      "Inversor Híbrido",
      "Inversor Off-Grid",
      "Bateria",
      "Estrutura",
      "Cabo",
      "Conector",
      "String Box",
    ];

    for (const name of cats) {
      const exists = await this.prisma.category.findFirst({ where: { name } });
      if (!exists) {
        await this.prisma.category.create({ data: { name } });
      }
    }
    return { success: true };
  }
}
