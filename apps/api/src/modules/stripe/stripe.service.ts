import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      this.logger.warn("STRIPE_SECRET_KEY is not defined. Stripe integration will not work.");
    }
    this.stripe = new Stripe(secretKey || "sk_test_mock", {
      apiVersion: "2026-07-29.dahlia",
    });
  }

  public get stripeClient() {
    return this.stripe;
  }

  async createProduct(name: string, description?: string) {
    try {
      return await this.stripe.products.create({
        name,
        description: description || undefined,
      });
    } catch (error) {
      this.logger.error(`Error creating product on Stripe: ${error}`);
      throw error;
    }
  }

  async createPrice(productId: string, amountInBrl: number, interval: "month" | "year" = "month") {
    try {
      return await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amountInBrl * 100), // Em centavos
        currency: "brl",
        recurring: {
          interval,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating price on Stripe: ${error}`);
      throw error;
    }
  }

  async createCheckoutSession(planId: string, tenantId: string, returnUrl?: string) {
    let plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      if (planId === "plan_1" || planId === "plan_2") {
        const name = planId === "plan_1" ? "Básico" : "Profissional";
        const price = planId === "plan_1" ? 99.9 : 199.9;

        const product = await this.createProduct(`Plano ${name} EnergivIA`);
        const stripePrice = await this.createPrice(product.id, price, "month");

        plan = await this.prisma.plan.create({
          data: {
            id: planId,
            name: name,
            price: price,
            interval: "month",
            stripeId: stripePrice.id,
          },
        });
      } else {
        throw new Error("Plan not found or not synced with Stripe.");
      }
    }

    if (!plan.stripeId) {
      throw new Error("Plan not synced with Stripe.");
    }

    // Procura ou cria o customer no Stripe
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) throw new Error("Tenant not found.");

      const customer = await this.stripe.customers.create({
        name: tenant.name,
        metadata: {
          tenantId: tenant.id,
        },
      });
      stripeCustomerId = customer.id;

      // Ensure we have a subscription record if there isn't one yet
      if (!subscription) {
        subscription = await this.prisma.subscription.create({
          data: {
            tenantId,
            planId,
            stripeCustomerId,
            status: "incomplete",
            currentPeriodEnd: new Date(),
          },
        });
      } else {
        await this.prisma.subscription.update({
          where: { tenantId },
          data: { stripeCustomerId },
        });
      }
    }

    // Use environment variable for the web URL, or use passed returnUrl / origin
    const webUrl =
      returnUrl || this.configService.get<string>("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripeId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${webUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/gestao/meus-planos`,
      client_reference_id: tenantId,
      metadata: {
        tenantId,
        planId,
      },
    });

    return session;
  }

  async verifySession(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" || session.status === "complete") {
        await this.handleCheckoutSessionCompleted(session);
        const tenantId = session.client_reference_id || session.metadata?.["tenantId"];
        const subscription = tenantId
          ? await this.prisma.subscription.findUnique({
              where: { tenantId },
              include: { plan: true },
            })
          : null;
        return { success: true, session, subscription };
      }
      return { success: false, status: session.status, paymentStatus: session.payment_status };
    } catch (error) {
      this.logger.error(`Error verifying checkout session ${sessionId}: ${error}`);
      throw error;
    }
  }

  async getSubscriptionByTenant(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    return subscription;
  }

  async createPortalSession(tenantId: string, returnUrl?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error("Cliente Stripe não encontrado para esta organização.");
    }

    const defaultReturnUrl =
      returnUrl || this.configService.get<string>("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${defaultReturnUrl}/gestao/meus-planos`,
    });

    return { url: portalSession.url };
  }

  async cancelSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    if (subscription.stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (stripeErr) {
        this.logger.warn(`Stripe cancel error (might already be cancelled): ${stripeErr}`);
      }
    }

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "canceled",
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: null,
      },
    });

    return { success: true, subscription: updated };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      this.logger.warn("STRIPE_WEBHOOK_SECRET is not defined.");
      throw new Error("Stripe webhook secret not configured.");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw err;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutSessionCompleted(session);
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdated(subscription);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subscription);
          break;
        }
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event ${event.type}: ${error}`);
      throw error;
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.client_reference_id || session.metadata?.["tenantId"];
    const planId = session.metadata?.["planId"];
    const stripeSubscriptionId = session.subscription as string;

    if (!tenantId || !planId || !stripeSubscriptionId) {
      this.logger.warn("Missing required metadata in checkout session.");
      return;
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId,
        stripeSubscriptionId,
        status: stripeSubscription.status,
        // @ts-expect-error property does exist on Subscription in runtime
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
      create: {
        tenantId,
        planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId,
        status: stripeSubscription.status,
        // @ts-expect-error property does exist on Subscription in runtime
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });

    // Option: also update the Tenant record to reflect active plan
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionPlan: planId },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;

    // Find the subscription by customer ID
    const dbSubscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId },
    });

    if (!dbSubscription) {
      this.logger.warn(`Subscription not found for customer ${stripeCustomerId}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        // @ts-expect-error property does exist on Subscription in runtime
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;

    const dbSubscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId },
    });

    if (!dbSubscription) return;

    await this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: "canceled",
      },
    });
  }
}
