import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

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

  getStatus() {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY") || "";
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET") || "";
    const isConfigured = Boolean(secretKey && secretKey !== "sk_test_mock");
    const isLive = secretKey.startsWith("sk_live_");
    const hasWebhook = Boolean(webhookSecret && webhookSecret !== "whsec_mock");

    return {
      configured: isConfigured,
      mode: isLive ? "live" : isConfigured ? "test" : "unconfigured",
      isLive,
      hasWebhook,
    };
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

  /**
   * Identifica se um plano é o Plano PLUS (ou similar de nível superior).
   */
  isPlusPlan(plan: { name?: string | null } | null | undefined): boolean {
    if (!plan?.name) return false;
    const nameLower = plan.name.toLowerCase();
    return nameLower.includes("plus");
  }

  /**
   * Valida se um cupom pode ser aplicado a um determinado plano.
   * Cupons de 60 e 90 dias com descontos de R$ 100 e R$ 200 criados para o Plano PLUS
   * NÃO podem ser utilizados em planos menores (como Essencial R$ 99,99 ou Pro R$ 199,99),
   * pois a assinatura sairia de graça ou zerada.
   */
  checkCouponAllowedForPlan(
    coupon: Stripe.Coupon,
    plan: { id?: string; name: string; price: number | Prisma.Decimal | string },
    codeOrName?: string
  ): { allowed: boolean; reason?: string } {
    const isPlus = this.isPlusPlan(plan);
    const planPrice = Number(plan.price) || 0;

    const discountAmountInBrl = coupon.amount_off ? coupon.amount_off / 100 : 0;
    const discountPercent = coupon.percent_off ? coupon.percent_off : 0;

    const cleanCode = (codeOrName || coupon.id || "").toUpperCase();
    const couponName = (coupon.name || "").toUpperCase();
    const metadataTarget = (
      coupon.metadata?.["targetPlan"] ||
      coupon.metadata?.["plan"] ||
      ""
    ).toLowerCase();

    // Identifica se o cupom é classificado como exclusivo do Plano PLUS:
    const isPlusExclusive =
      metadataTarget === "plus" ||
      coupon.metadata?.["onlyPlus"] === "true" ||
      discountAmountInBrl >= 100 || // Cupons de R$ 100 e R$ 200
      (coupon.duration === "repeating" &&
        (coupon.duration_in_months === 2 || coupon.duration_in_months === 3)) || // 60 dias (2 meses) e 90 dias (3 meses)
      cleanCode.includes("PLUS") ||
      cleanCode.includes("60") ||
      cleanCode.includes("90") ||
      couponName.includes("PLUS") ||
      couponName.includes("60") ||
      couponName.includes("90");

    // 1. Se for classificado como exclusivo do Plus e o plano selecionado não for Plus:
    if (isPlusExclusive && !isPlus) {
      return {
        allowed: false,
        reason:
          "Este cupom promocional (desconto exclusivo para o Plano PLUS) não pode ser utilizado no plano selecionado. Faça upgrade para o Plano PLUS para utilizar este cupom!",
      };
    }

    // 2. Proteção contra valor zerado ou negativo:
    // Se o desconto em reais for maior ou igual ao preço do plano selecionado e não for o plano Plus:
    if (!isPlus && discountAmountInBrl > 0 && discountAmountInBrl >= planPrice) {
      return {
        allowed: false,
        reason: `Este cupom de R$ ${discountAmountInBrl.toFixed(2)} não pode ser aplicado a este plano, pois o desconto excede o valor da mensalidade (R$ ${planPrice.toFixed(2)}).`,
      };
    }

    // 3. Se for desconto percentual de 100% que não seja o cupom de admin vitalício:
    if (
      !isPlus &&
      discountPercent >= 100 &&
      cleanCode !== "V1T4L1C10" &&
      cleanCode !== "VITALICIOADMINS"
    ) {
      return {
        allowed: false,
        reason: "Cupons de gratuidade total não são permitidos para este plano.",
      };
    }

    return { allowed: true };
  }

  async createCheckoutSession(
    planId: string,
    tenantId: string,
    returnUrl?: string,
    couponCode?: string
  ) {
    const upperCoupon = couponCode?.trim().toUpperCase();
    if (upperCoupon === "V1T4L1C10" || upperCoupon === "VITALICIOADMINS") {
      await this.redeemCoupon(upperCoupon, tenantId);
      const appUrl =
        returnUrl ||
        this.configService.get<string>("NEXT_PUBLIC_APP_URL") ||
        "http://localhost:3000";
      return {
        url: `${appUrl.replace(/\/+$/, "")}/gestao/meus-planos?session_id=admin_lifetime_success`,
      } as unknown as Stripe.Checkout.Session;
    }

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

    // Valida se o preço existe no ambiente ativo do Stripe (Test vs Live)
    let validStripePriceId = plan.stripeId;
    if (validStripePriceId) {
      try {
        await this.stripe.prices.retrieve(validStripePriceId);
      } catch (err) {
        this.logger.warn(
          `Preço ${validStripePriceId} não encontrado no ambiente Stripe ativo (${err}). Recriando produto e preço no Stripe...`
        );
        validStripePriceId = null;
      }
    }

    if (!validStripePriceId) {
      const product = await this.createProduct(
        `Plano ${plan.name} - EnergivIA`,
        plan.description || undefined
      );
      const stripePrice = await this.createPrice(
        product.id,
        Number(plan.price),
        (plan.interval as "month" | "year") || "month"
      );
      validStripePriceId = stripePrice.id;

      plan = await this.prisma.plan.update({
        where: { id: plan.id },
        data: { stripeId: validStripePriceId },
      });
    }

    // Procura ou cria o customer no Stripe
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    let stripeCustomerId = subscription?.stripeCustomerId;

    // Se já existia um customer gravado, verifica se ele é válido no ambiente ativo do Stripe
    if (stripeCustomerId) {
      try {
        const existingCustomer = await this.stripe.customers.retrieve(stripeCustomerId);
        if (existingCustomer.deleted) {
          stripeCustomerId = undefined;
        }
      } catch {
        this.logger.warn(
          `Customer ${stripeCustomerId} não encontrado no ambiente atual do Stripe. Criando novo customer...`
        );
        stripeCustomerId = undefined;
      }
    }

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
          price: validStripePriceId,
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

    const isPlanPlus = this.isPlusPlan(plan);

    // If a coupon code was provided, apply discount after validating plan eligibility
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      let coupon: Stripe.Coupon | null = null;
      let promoCodeId: string | null = null;

      try {
        coupon = await this.stripe.coupons.retrieve(cleanCode);
      } catch {
        // Tenta buscar por promotion code cadastrado no Stripe
        const promoList = await this.stripe.promotionCodes.list({
          code: cleanCode,
          active: true,
          limit: 1,
        });
        const firstPromo = promoList.data[0];
        if (firstPromo) {
          promoCodeId = firstPromo.id;
          if (typeof firstPromo.promotion.coupon === "string") {
            try {
              coupon = await this.stripe.coupons.retrieve(firstPromo.promotion.coupon);
            } catch {
              coupon = null;
            }
          } else {
            coupon = firstPromo.promotion.coupon as Stripe.Coupon;
          }
        }
      }

      if (coupon && coupon.valid) {
        // Valida se o cupom é permitido para o plano selecionado
        const check = this.checkCouponAllowedForPlan(coupon, plan, cleanCode);
        if (!check.allowed) {
          throw new BadRequestException(
            check.reason ||
              "Este cupom promocional é de uso exclusivo para a assinatura do Plano PLUS e não pode ser aplicado ao plano selecionado."
          );
        }

        if (promoCodeId) {
          sessionParams.discounts = [{ promotion_code: promoCodeId }];
        } else {
          sessionParams.discounts = [{ coupon: coupon.id }];
        }
      } else {
        throw new BadRequestException("Cupom de desconto inválido ou expirado.");
      }
    } else {
      // Sem cupom pré-aplicado:
      // Só habilita o campo de cupom no Stripe se for o Plano PLUS!
      // Para outros planos (Essencial, Pro), desativa allow_promotion_codes para impedir que digitem cupons do Plus no checkout do Stripe e saia de graça!
      if (isPlanPlus) {
        sessionParams.allow_promotion_codes = true;
      }
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
    targetPlan?: "all" | "plus";
  }) {
    const cleanCode = params.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      throw new Error(
        "O código do cupom deve conter apenas letras, números, hífens (-) ou underlines (_). Caracteres como % não são permitidos."
      );
    }
    const duration = params.duration || "once";

    let redeemBy: number | undefined = undefined;
    if (params.expiresAt) {
      const parsedTime = new Date(params.expiresAt).getTime();
      if (!isNaN(parsedTime) && parsedTime > Date.now()) {
        redeemBy = Math.floor(parsedTime / 1000);
      }
    }

    const isPlusOnly =
      params.targetPlan === "plus" ||
      (params.discountType === "amount" && Number(params.discountValue) >= 100) ||
      (duration === "repeating" &&
        (params.durationInMonths === 2 || params.durationInMonths === 3)) ||
      cleanCode.includes("PLUS");

    const metadata: Record<string, string> = {
      targetPlan: isPlusOnly ? "plus" : params.targetPlan || "all",
      onlyPlus: isPlusOnly ? "true" : "false",
    };

    const couponParams: Stripe.CouponCreateParams = {
      id: cleanCode,
      name: params.name?.trim() || `Cupom ${cleanCode}`,
      duration,
      currency: params.discountType === "amount" ? "brl" : undefined,
      metadata,
      ...(params.discountType === "percent"
        ? { percent_off: Number(params.discountValue) }
        : { amount_off: Math.round(Number(params.discountValue) * 100) }),
      ...(duration === "repeating" && params.durationInMonths
        ? { duration_in_months: Number(params.durationInMonths) }
        : {}),
      ...(params.maxRedemptions ? { max_redemptions: Number(params.maxRedemptions) } : {}),
      ...(redeemBy ? { redeem_by: redeemBy } : {}),
    };

    const coupon = await this.stripe.coupons.create(couponParams);

    // Também cria o PromotionCode correspondente no Stripe para que possa ser digitado diretamente no checkout do Stripe
    try {
      await this.stripe.promotionCodes.create({
        promotion: {
          type: "coupon",
          coupon: coupon.id,
        },
        code: cleanCode,
        metadata,
        ...(params.maxRedemptions ? { max_redemptions: Number(params.maxRedemptions) } : {}),
        ...(redeemBy ? { expires_at: redeemBy } : {}),
      });
    } catch (promoErr) {
      this.logger.warn(`Could not create matching promotion code for ${cleanCode}: ${promoErr}`);
    }

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
      targetPlan: isPlusOnly ? "plus" : "all",
      isPlusOnly,
    };
  }

  async listCoupons() {
    let result: Array<{
      id: string;
      code: string;
      couponId: string;
      name: string | null;
      discountType: "percent" | "amount";
      discountValue: number;
      duration: string;
      durationInMonths?: number | null;
      maxRedemptions?: number | null;
      timesRedeemed: number;
      active: boolean;
      expiresAt?: Date | null;
      createdAt: Date;
      isLifetimeAdmin?: boolean;
      targetPlan?: "all" | "plus";
      isPlusOnly?: boolean;
    }> = [];

    let lifetimeRedemptionsCount = 0;
    try {
      lifetimeRedemptionsCount = await this.prisma.subscription.count({
        where: {
          stripeSubscriptionId: "sub_lifetime_admin_v1t4l1c10",
        },
      });
    } catch (e) {
      this.logger.warn(`Could not count lifetime redemptions: ${e}`);
    }

    try {
      const coupons = await this.stripe.coupons.list({
        limit: 50,
      });

      result = coupons.data.map((coupon) => {
        const isLifetime =
          coupon.id.toUpperCase() === "V1T4L1C10" ||
          coupon.id.toUpperCase() === "VITALICIOADMINS" ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("VITALICIO"));

        const discountType = coupon.percent_off ? "percent" : "amount";
        const discountValue = coupon.percent_off
          ? coupon.percent_off
          : coupon.amount_off
            ? coupon.amount_off / 100
            : 0;

        const timesRedeemed = isLifetime
          ? Math.max(coupon.times_redeemed || 0, lifetimeRedemptionsCount)
          : coupon.times_redeemed || 0;

        const metaTarget = (
          coupon.metadata?.["targetPlan"] ||
          coupon.metadata?.["plan"] ||
          ""
        ).toLowerCase();
        const isPlusOnly =
          metaTarget === "plus" ||
          coupon.metadata?.["onlyPlus"] === "true" ||
          discountValue >= 100 ||
          (coupon.duration === "repeating" &&
            (coupon.duration_in_months === 2 || coupon.duration_in_months === 3)) ||
          coupon.id.toUpperCase().includes("PLUS") ||
          coupon.id.toUpperCase().includes("60") ||
          coupon.id.toUpperCase().includes("90") ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("PLUS")) ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("60")) ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("90"));

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
          timesRedeemed,
          active: coupon.valid,
          expiresAt: coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : null,
          createdAt: new Date(coupon.created * 1000),
          isLifetimeAdmin: isLifetime,
          targetPlan: isPlusOnly ? "plus" : "all",
          isPlusOnly,
        };
      });
    } catch (error) {
      this.logger.error(`Error listing coupons: ${error}`);
    }

    // Garante que o cupom master de admin V1T4L1C10 apareça listado mesmo se ainda não foi criado no Stripe
    const alreadyListed = result.some(
      (c) => c.code.toUpperCase() === "V1T4L1C10" || c.code.toUpperCase() === "VITALICIOADMINS"
    );
    if (!alreadyListed) {
      result.unshift({
        id: "V1T4L1C10",
        code: "V1T4L1C10",
        couponId: "V1T4L1C10",
        name: "Cupom Master Admin (Acesso Vitalício Total)",
        discountType: "percent",
        discountValue: 100,
        duration: "forever",
        durationInMonths: null,
        maxRedemptions: 1,
        timesRedeemed: lifetimeRedemptionsCount,
        active: true,
        expiresAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        isLifetimeAdmin: true,
      });
    }

    return result;
  }

  async updateCoupon(
    id: string,
    params: {
      name?: string;
      code?: string;
      discountType?: "percent" | "amount";
      discountValue?: number;
      duration?: "once" | "repeating" | "forever";
      durationInMonths?: number;
      maxRedemptions?: number;
      expiresAt?: string;
      targetPlan?: "all" | "plus";
    }
  ) {
    if (!id || !id.trim()) {
      throw new Error("ID do cupom é obrigatório.");
    }

    const cleanId = id.trim().toUpperCase();
    if (cleanId === "V1T4L1C10" || cleanId === "VITALICIOADMINS") {
      return {
        id: cleanId,
        code: cleanId,
        name: params.name || "Cupom Master Admin (Acesso Vitalício Total)",
        isLifetimeAdmin: true,
      };
    }

    let existingCoupon: Stripe.Coupon | null = null;
    try {
      existingCoupon = await this.stripe.coupons.retrieve(cleanId);
    } catch (err) {
      this.logger.warn(`Could not retrieve coupon ${cleanId} for update: ${err}`);
    }

    const targetCode = (params.code || cleanId).trim().toUpperCase();

    // Se o cupom não tem utilizações no Stripe, deleta e recria para atualizar regras financeiras e gerar promotionCode
    if (!existingCoupon || existingCoupon.times_redeemed === 0) {
      if (existingCoupon) {
        try {
          await this.stripe.coupons.del(cleanId);
        } catch (delErr) {
          this.logger.warn(`Could not delete old coupon ${cleanId} during update: ${delErr}`);
        }
      }

      return await this.createCoupon({
        name: params.name,
        code: targetCode,
        discountType: params.discountType || (existingCoupon?.percent_off ? "percent" : "amount"),
        discountValue:
          params.discountValue !== undefined
            ? Number(params.discountValue)
            : existingCoupon?.percent_off ||
              (existingCoupon?.amount_off ? existingCoupon.amount_off / 100 : 0),
        duration:
          params.duration ||
          (existingCoupon?.duration as "once" | "repeating" | "forever") ||
          "once",
        durationInMonths:
          params.durationInMonths ?? (existingCoupon?.duration_in_months || undefined),
        maxRedemptions:
          params.maxRedemptions !== undefined
            ? Number(params.maxRedemptions)
            : existingCoupon?.max_redemptions || undefined,
        expiresAt: params.expiresAt,
        targetPlan: params.targetPlan,
      });
    }

    // Se já teve utilizações no Stripe, atualiza o nome e metadados
    if (params.name || params.targetPlan) {
      const isPlusOnly =
        params.targetPlan === "plus" ||
        Boolean(existingCoupon?.amount_off && existingCoupon.amount_off >= 10000);
      await this.stripe.coupons.update(cleanId, {
        ...(params.name ? { name: params.name.trim() } : {}),
        metadata: {
          targetPlan: isPlusOnly ? "plus" : params.targetPlan || "all",
          onlyPlus: isPlusOnly ? "true" : "false",
        },
      });
    }

    // Garante que o PromotionCode correspondente exista e esteja ativo
    try {
      const promoList = await this.stripe.promotionCodes.list({
        code: targetCode,
        limit: 1,
      });
      if (promoList.data.length === 0) {
        await this.stripe.promotionCodes.create({
          promotion: {
            type: "coupon",
            coupon: cleanId,
          },
          code: targetCode,
          ...(params.maxRedemptions ? { max_redemptions: Number(params.maxRedemptions) } : {}),
        });
      }
    } catch (promoErr) {
      this.logger.warn(`Could not sync promotion code during coupon update: ${promoErr}`);
    }

    return {
      id: cleanId,
      code: targetCode,
      name: params.name || existingCoupon.name,
      updated: true,
    };
  }

  async deleteCoupon(id: string) {
    const cleanId = id.toUpperCase();
    if (cleanId === "V1T4L1C10" || cleanId === "VITALICIOADMINS") {
      throw new Error("O cupom master de administradores não pode ser removido.");
    }
    try {
      await this.stripe.coupons.del(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting coupon ${id}: ${error}`);
      throw error;
    }
  }

  async validateCouponCode(code: string, planId?: string) {
    if (!code || !code.trim()) {
      return { valid: false, message: "Código de cupom obrigatório." };
    }

    const cleanCode = code.trim().toUpperCase();

    // Cupom especial de Administradores: Acesso Vitalício Total sem Stripe / Cartão
    if (cleanCode === "V1T4L1C10" || cleanCode === "VITALICIOADMINS") {
      return {
        valid: true,
        code: cleanCode,
        couponId: cleanCode,
        name: "Cupom Master Admin (Vitalício)",
        discountType: "percent" as const,
        discountValue: 100,
        duration: "forever",
        isLifetimeAdmin: true,
        message:
          "Cupom de Administrador reconhecido. Libera acesso total vitalício sem precisar de cartão.",
      };
    }

    try {
      let coupon: Stripe.Coupon | null = null;
      let promoCodeObj: Stripe.PromotionCode | null = null;

      try {
        coupon = await this.stripe.coupons.retrieve(cleanCode);
      } catch {
        // Tenta buscar por promotion code
        const promoList = await this.stripe.promotionCodes.list({
          code: cleanCode,
          active: true,
          limit: 1,
        });
        const firstPromo = promoList.data[0];
        if (firstPromo) {
          promoCodeObj = firstPromo;
          if (firstPromo.promotion?.coupon) {
            const promoCoupon = firstPromo.promotion.coupon;
            if (typeof promoCoupon === "string") {
              coupon = await this.stripe.coupons.retrieve(promoCoupon);
            } else {
              coupon = promoCoupon as Stripe.Coupon;
            }
          }
        }
      }

      if (coupon && coupon.valid) {
        if (coupon.redeem_by && coupon.redeem_by * 1000 < Date.now()) {
          return { valid: false, message: "Este cupom já expirou." };
        }

        if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
          return { valid: false, message: "Limite de utilizações deste cupom atingido." };
        }

        // Se planId foi fornecido, busca o plano e valida regras de elegibilidade
        if (planId) {
          let targetPlan = await this.prisma.plan.findUnique({
            where: { id: planId },
          });
          if (!targetPlan) {
            targetPlan = await this.prisma.plan.findFirst({
              where: {
                OR: [{ id: planId }, { name: { equals: planId, mode: "insensitive" } }],
              },
            });
          }

          if (targetPlan) {
            const check = this.checkCouponAllowedForPlan(coupon, targetPlan, cleanCode);
            if (!check.allowed) {
              return {
                valid: false,
                message:
                  check.reason ||
                  "Este cupom promocional é de uso exclusivo para a assinatura do Plano PLUS e não pode ser aplicado ao plano selecionado.",
              };
            }
          }
        }

        const discountType = coupon.percent_off ? "percent" : "amount";
        const discountValue = coupon.percent_off
          ? coupon.percent_off
          : coupon.amount_off
            ? coupon.amount_off / 100
            : 0;

        const metaTarget = (
          coupon.metadata?.["targetPlan"] ||
          coupon.metadata?.["plan"] ||
          ""
        ).toLowerCase();
        const isPlusOnly =
          metaTarget === "plus" ||
          coupon.metadata?.["onlyPlus"] === "true" ||
          discountValue >= 100 ||
          (coupon.duration === "repeating" &&
            (coupon.duration_in_months === 2 || coupon.duration_in_months === 3)) ||
          cleanCode.includes("PLUS") ||
          cleanCode.includes("60") ||
          cleanCode.includes("90") ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("PLUS")) ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("60")) ||
          Boolean(coupon.name && coupon.name.toUpperCase().includes("90"));

        return {
          valid: true,
          code: promoCodeObj ? promoCodeObj.code : coupon.id,
          couponId: coupon.id,
          name: coupon.name,
          discountType,
          discountValue,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          isLifetimeAdmin: false,
          isPlusExclusive: isPlusOnly,
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

  async redeemCoupon(code: string, tenantId: string) {
    if (!code || !code.trim()) {
      throw new Error("Código do cupom é obrigatório.");
    }
    if (!tenantId) {
      throw new Error("Identificador da organização é obrigatório.");
    }

    const cleanCode = code.trim().toUpperCase();

    // Apenas o cupom especial de administradores libera acesso direto sem cartão
    if (cleanCode !== "V1T4L1C10" && cleanCode !== "VITALICIOADMINS") {
      throw new Error(
        "Apenas cupons de liberação administrativa podem ser ativados diretamente. Cupons de desconto convencionais devem ser aplicados no checkout do Stripe."
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("Organização não encontrada.");
    }

    // Busca o plano com maior capacidade / nível (preferencialmente Plus, ou maior preço ativo)
    let plan = await this.prisma.plan.findFirst({
      where: {
        active: true,
        name: { contains: "Plus", mode: "insensitive" },
      },
    });

    if (!plan) {
      plan = await this.prisma.plan.findFirst({
        where: { active: true },
        orderBy: { price: "desc" },
      });
    }

    if (!plan) {
      plan = await this.prisma.plan.findFirst({
        orderBy: { price: "desc" },
      });
    }

    if (!plan) {
      throw new Error("Nenhum plano cadastrado no sistema para vinculação.");
    }

    const existingSub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    const isAlreadyLifetime =
      existingSub?.stripeSubscriptionId === "sub_lifetime_admin_v1t4l1c10" ||
      (existingSub?.currentPeriodEnd &&
        new Date(existingSub.currentPeriodEnd).getFullYear() >= 2090);

    // Validade vitalícia até 2099
    const lifetimeEnd = new Date("2099-12-31T23:59:59.999Z");

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        status: "active",
        stripeSubscriptionId: "sub_lifetime_admin_v1t4l1c10",
        currentPeriodEnd: lifetimeEnd,
      },
      create: {
        tenantId,
        planId: plan.id,
        status: "active",
        stripeSubscriptionId: "sub_lifetime_admin_v1t4l1c10",
        currentPeriodEnd: lifetimeEnd,
      },
      include: {
        plan: true,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan.id,
      },
    });

    this.logger.log(
      `Cupom master ${cleanCode} ativado com sucesso para tenant ${tenantId}. Plano vinculado: ${plan.name} (${plan.id})`
    );

    return {
      success: true,
      isLifetimeAdmin: true,
      alreadyActive: isAlreadyLifetime,
      message: isAlreadyLifetime
        ? `Acesso vitalício já está 100% ativo na sua organização! O plano ${plan.name} está permanente.`
        : `Cupom ${cleanCode} ativado com sucesso! Acesso vitalício liberado ao plano ${plan.name}.`,
      subscription,
    };
  }

  async verifySession(sessionId: string) {
    if (sessionId === "admin_lifetime_success") {
      return { success: true, isLifetimeAdmin: true };
    }

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
