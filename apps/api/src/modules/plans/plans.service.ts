import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });
    if (!plan) throw new NotFoundException("Plan not found");
    return plan;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(data: any) {
    return this.prisma.plan.create({
      data,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: string, data: any) {
    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    return this.prisma.plan.update({
      where: { id },
      data: { active: false },
    });
  }
}
