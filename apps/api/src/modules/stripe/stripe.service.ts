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

  async createCheckoutSession(
    planId: string,
    tenantId: string,
    returnUrl?: string,
    couponCode?: string
  ) {
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

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
        couponCode: couponCode || "",
      },
    };

    // If a coupon code was provided, apply discount, otherwise enable promo code input on Stripe Checkout
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      try {
        const coupon = await this.stripe.coupons.retrieve(cleanCode);
        if (coupon && coupon.valid) {
          sessionParams.discounts = [{ coupon: coupon.id }];
        } else {
          sessionParams.allow_promotion_codes = true;
        }
      } catch (err) {
        this.logger.warn(`Could not retrieve coupon code ${cleanCode}: ${err}`);
        sessionParams.allow_promotion_codes = true;
      }
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return session;
  }

  // --- COUPON MANAGEMENT ---

  async createCoupon(params: {
    name?: string;
    code: string;
    discountType: "percent" | "amount";
    discountValue: number;
    duration?: "once" | "repeating" | "forever";
    durationInMonths?: number;
    maxRedemptions?: number;
    expiresAt?: string | Date;
  }) {
    const cleanCode = params.code.trim().toUpperCase();
    const duration = params.duration || "once";

    const couponParams: Stripe.CouponCreateParams = {
      id: cleanCode,
      name: params.name || `Cupom ${cleanCode}`,
      duration,
      currency: params.discountType === "amount" ? "brl" : undefined,
      ...(params.discountType === "percent"
        ? { percent_off: Number(params.discountValue) }
        : { amount_off: Math.round(Number(params.discountValue) * 100) }),
      ...(duration === "repeating" && params.durationInMonths
        ? { duration_in_months: Number(params.durationInMonths) }
        : {}),
      ...(params.maxRedemptions ? { max_redemptions: Number(params.maxRedemptions) } : {}),
      ...(params.expiresAt
        ? { redeem_by: Math.floor(new Date(params.expiresAt).getTime() / 1000) }
        : {}),
    };

    const coupon = await this.stripe.coupons.create(couponParams);

    return {
      id: coupon.id,
      code: coupon.id,
      couponId: coupon.id,
      name: coupon.name,
      discountType: params.discountType,
      discountValue: params.discountValue,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      maxRedemptions: coupon.max_redemptions,
      timesRedeemed: coupon.times_redeemed,
      active: coupon.valid,
      expiresAt: coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : null,
      createdAt: new Date(coupon.created * 1000),
    };
  }

  async listCoupons() {
    try {
      const coupons = await this.stripe.coupons.list({
        limit: 50,
      });

      return coupons.data.map((coupon) => {
        const discountType = coupon.percent_off ? "percent" : "amount";
        const discountValue = coupon.percent_off
          ? coupon.percent_off
          : coupon.amount_off
            ? coupon.amount_off / 100
            : 0;

        return {
          id: coupon.id,
          code: coupon.id,
          couponId: coupon.id,
          name: coupon.name,
          discountType,
          discountValue,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          maxRedemptions: coupon.max_redemptions,
          timesRedeemed: coupon.times_redeemed,
          active: coupon.valid,
          expiresAt: coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : null,
          createdAt: new Date(coupon.created * 1000),
        };
      });
    } catch (error) {
      this.logger.error(`Error listing coupons: ${error}`);
      return [];
    }
  }

  async deleteCoupon(id: string) {
    try {
      await this.stripe.coupons.del(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting coupon ${id}: ${error}`);
      throw error;
    }
  }

  async validateCouponCode(code: string) {
    if (!code || !code.trim()) {
      return { valid: false, message: "Código de cupom obrigatório." };
    }

    const cleanCode = code.trim().toUpperCase();

    try {
      const coupon = await this.stripe.coupons.retrieve(cleanCode);
      if (coupon && coupon.valid) {
        if (coupon.redeem_by && coupon.redeem_by * 1000 < Date.now()) {
          return { valid: false, message: "Este cupom já expirou." };
        }

        if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
          return { valid: false, message: "Limite de utilizações deste cupom atingido." };
        }

        const discountType = coupon.percent_off ? "percent" : "amount";
        const discountValue = coupon.percent_off
          ? coupon.percent_off
          : coupon.amount_off
            ? coupon.amount_off / 100
            : 0;

        return {
          valid: true,
          code: coupon.id,
          couponId: coupon.id,
          name: coupon.name,
          discountType,
          discountValue,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          message:
            coupon.duration === "once"
              ? discountType === "percent"
                ? `${discountValue}% OFF na 1ª parcela!`
                : `R$ ${discountValue.toFixed(2)} OFF na 1ª parcela!`
              : discountType === "percent"
                ? `${discountValue}% de desconto!`
                : `R$ ${discountValue.toFixed(2)} de desconto!`,
        };
      }

      return { valid: false, message: "Cupom inválido ou expirado." };
    } catch (err) {
      this.logger.warn(`Could not validate coupon ${cleanCode}: ${err}`);
      return { valid: false, message: "Cupom não encontrado ou inválido." };
    }
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

  // --- WEBHOOK HANDLING ---

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      this.logger.warn(
        "STRIPE_WEBHOOK_SECRET is not configured in environment variables. Webhook event accepted for health/test."
      );
      return { received: true, warning: "STRIPE_WEBHOOK_SECRET missing" };
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
    const rawPlanId = session.metadata?.["planId"];
    const stripeSubscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription as Stripe.Subscription | null)?.id;
    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id;

    if (!tenantId) {
      this.logger.warn("Missing tenantId in checkout session.");
      return;
    }

    // Resolve valid plan in database
    let plan = rawPlanId ? await this.prisma.plan.findUnique({ where: { id: rawPlanId } }) : null;

    if (!plan && rawPlanId) {
      plan = await this.prisma.plan.findFirst({
        where: {
          OR: [{ stripeId: rawPlanId }, { name: rawPlanId }],
        },
      });
    }

    if (!plan) {
      plan = await this.prisma.plan.findFirst({
        where: { active: true },
        orderBy: { price: "asc" },
      });
    }

    if (!plan) {
      this.logger.error("No valid plan found to link subscription to.");
      return;
    }

    let status = "active";
    let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (stripeSubscriptionId) {
      try {
        const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (stripeSub?.status) {
          status = stripeSub.status;
        }
        const rawEnd = (stripeSub as unknown as Record<string, unknown>)?.["current_period_end"];
        if (typeof rawEnd === "number" && !isNaN(rawEnd) && rawEnd > 0) {
          currentPeriodEnd = new Date(rawEnd * 1000);
        }
      } catch (err) {
        this.logger.warn(`Could not retrieve Stripe subscription ${stripeSubscriptionId}: ${err}`);
      }
    }

    await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        stripeCustomerId: stripeCustomerId || undefined,
        status,
        currentPeriodEnd,
      },
      create: {
        tenantId,
        planId: plan.id,
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        status,
        currentPeriodEnd,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionPlan: plan.id },
    });

    this.logger.log(
      `Subscription activated successfully for tenant ${tenantId}, plan ${plan.name} (${plan.id})`
    );
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as Stripe.Customer | null)?.id;

    const dbSubscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscription.id },
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
        ],
      },
    });

    if (!dbSubscription) {
      this.logger.warn(`Subscription not found for customer ${stripeCustomerId}`);
      return;
    }

    let currentPeriodEnd = dbSubscription.currentPeriodEnd;
    const rawEnd = (subscription as unknown as Record<string, unknown>)?.["current_period_end"];
    if (typeof rawEnd === "number" && !isNaN(rawEnd) && rawEnd > 0) {
      currentPeriodEnd = new Date(rawEnd * 1000);
    }

    await this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as Stripe.Customer | null)?.id;

    const dbSubscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscription.id },
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
        ],
      },
    });

    if (!dbSubscription) return;

    await this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: "canceled",
      },
    });

    await this.prisma.tenant.update({
      where: { id: dbSubscription.tenantId },
      data: {
        subscriptionPlan: null,
      },
    });
  }
}
