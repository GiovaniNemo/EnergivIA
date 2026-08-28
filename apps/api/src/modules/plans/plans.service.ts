import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StripeService } from "../stripe/stripe.service";

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService
  ) {}

  async findAll(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { price: "asc" },
      include: {
        _count: {
          select: {
            subscriptions: {
              where: { status: "active" },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });
    if (!plan) throw new NotFoundException("Plan not found");
    return plan;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(data: any) {
    const name = data.name;
    const description = data.description;
    const price = Number(data.price);
    const interval = data.interval || "month";

    let stripePriceId: string | null = null;
    try {
      // 1. Cria o produto no Stripe
      const stripeProduct = await this.stripeService.createProduct(name, description);

      // 2. Cria o preço no Stripe
      const stripePrice = await this.stripeService.createPrice(stripeProduct.id, price, interval);
      stripePriceId = stripePrice.id;
    } catch (error) {
      this.logger.warn(`Could not create Stripe product/price during plan creation: ${error}`);
    }

    // 3. Salva no banco com o stripeId
    return this.prisma.plan.create({
      data: {
        name,
        description,
        price,
        interval,
        features: data.features || [],
        active: data.active !== undefined ? Boolean(data.active) : true,
        stripeId: stripePriceId,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: string, data: any) {
    const existingPlan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new NotFoundException("Plano não encontrado.");
    }

    let newStripeId = existingPlan.stripeId;
    const newPrice = data.price !== undefined ? Number(data.price) : undefined;
    const newInterval = data.interval || existingPlan.interval || "month";
    const newName = data.name !== undefined ? data.name : existingPlan.name;
    const newDescription =
      data.description !== undefined ? data.description : existingPlan.description;

    try {
      // If price has changed or no stripeId exists, create a new price in Stripe
      if (
        newPrice !== undefined &&
        (Number(existingPlan.price) !== newPrice || !existingPlan.stripeId)
      ) {
        let productId: string | undefined;

        if (existingPlan.stripeId) {
          try {
            const currentStripePrice = await this.stripeService.stripeClient.prices.retrieve(
              existingPlan.stripeId
            );
            productId =
              typeof currentStripePrice.product === "string"
                ? currentStripePrice.product
                : currentStripePrice.product?.id;
          } catch {
            this.logger.warn(`Could not retrieve old price ${existingPlan.stripeId} from Stripe.`);
          }
        }

        if (!productId) {
          const product = await this.stripeService.createProduct(newName, newDescription);
          productId = product.id;
        }

        const stripePrice = await this.stripeService.createPrice(
          productId,
          newPrice,
          newInterval as "month" | "year"
        );
        newStripeId = stripePrice.id;
      } else if (existingPlan.stripeId && (data.name || data.description)) {
        // Update product name/description in Stripe
        try {
          const currentPrice = await this.stripeService.stripeClient.prices.retrieve(
            existingPlan.stripeId
          );
          const productId =
            typeof currentPrice.product === "string"
              ? currentPrice.product
              : currentPrice.product?.id;
          if (productId) {
            await this.stripeService.stripeClient.products.update(productId, {
              name: newName,
              description: newDescription || undefined,
            });
          }
        } catch (err) {
          this.logger.warn(`Could not update Stripe product: ${err}`);
        }
      }
    } catch (stripeErr) {
      this.logger.error(`Error synchronizing plan update with Stripe: ${stripeErr}`);
    }

    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(newPrice !== undefined ? { price: newPrice } : {}),
        ...(data.interval !== undefined ? { interval: data.interval } : {}),
        ...(data.features !== undefined ? { features: data.features } : {}),
        ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
        ...(newStripeId ? { stripeId: newStripeId } : {}),
      },
    });
  }

  async toggleActive(id: string, active?: boolean) {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Plano não encontrado");

    const newActive = active !== undefined ? active : !existing.active;
    return this.prisma.plan.update({
      where: { id },
      data: { active: newActive },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Plano não encontrado");
    }

    if (existing._count.subscriptions > 0) {
      await this.prisma.plan.update({
        where: { id },
        data: { active: false },
      });
      return {
        message: "O plano possui assinaturas vinculadas e foi desativado/arquivado.",
        action: "deactivated" as const,
      };
    }

    await this.prisma.plan.delete({
      where: { id },
    });

    return {
      message: "Plano excluído com sucesso.",
      action: "deleted" as const,
    };
  }

  async deactivate(id: string) {
    return this.toggleActive(id, false);
  }
}
