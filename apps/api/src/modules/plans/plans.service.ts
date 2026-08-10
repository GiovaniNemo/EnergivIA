import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

import { StripeService } from "../stripe/stripe.service";

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService
  ) {}

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
    // 1. Cria o produto no Stripe
    const stripeProduct = await this.stripeService.createProduct(data.name, data.description);

    // 2. Cria o preço no Stripe
    const stripePrice = await this.stripeService.createPrice(
      stripeProduct.id,
      Number(data.price),
      data.interval || "month"
    );

    // 3. Salva no banco com o stripeId (ID do Preço)
    return this.prisma.plan.create({
      data: {
        ...data,
        stripeId: stripePrice.id,
      },
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
