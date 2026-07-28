import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(): Promise<{ id: string; name: string }[]> {
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
