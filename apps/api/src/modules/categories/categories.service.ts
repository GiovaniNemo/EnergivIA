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

    const standardSlugs = [
      "module",
      "inverter",
      "microinverter",
      "hybrid_inverter",
      "off_grid_inverter",
      "battery",
      "bms",
      "structure_kit",
      "dc_cable",
      "connector",
      "profile",
      "string_box",
    ];

    for (const slug of standardSlugs) {
      const exists = await this.prisma.category.findUnique({ where: { name: slug } });
      if (!exists) {
        await this.prisma.category.create({ data: { name: slug } });
      }
    }

    return this.prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async seed() {
    const cats = [
      "module",
      "inverter",
      "microinverter",
      "hybrid_inverter",
      "off_grid_inverter",
      "battery",
      "bms",
      "structure_kit",
      "dc_cable",
      "connector",
      "profile",
      "string_box",
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
