import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { StripeService } from "./stripe.service";
import { Request } from "express";

import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";

@Controller(["stripe", "api/stripe"])
@SkipTrialLock()
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Post("create-checkout-session")
  async createCheckoutSession(
    @Body() body: { planId: string; tenantId: string; returnUrl?: string; couponCode?: string }
  ) {
    if (!body.planId || !body.tenantId) {
      throw new BadRequestException("planId and tenantId are required");
    }

    try {
      const session = await this.stripeService.createCheckoutSession(
        body.planId,
        body.tenantId,
        body.returnUrl,
        body.couponCode
      );
      return { url: session.url };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro interno no Stripe";
      throw new BadRequestException(errorMessage);
    }
  }

  @Post("verify-session")
  async verifySessionPost(@Body() body: { sessionId: string }) {
    if (!body.sessionId) {
      throw new BadRequestException("sessionId is required");
    }
    return this.stripeService.verifySession(body.sessionId);
  }

  @Get("verify-session")
  async verifySessionGet(@Query("sessionId") sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException("sessionId is required");
    }
    return this.stripeService.verifySession(sessionId);
  }

  @Get("subscription/:tenantId")
  async getSubscription(@Param("tenantId") tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException("tenantId is required");
    }
    return this.stripeService.getSubscriptionByTenant(tenantId);
  }

  @Post("create-portal-session")
  async createPortalSession(@Body() body: { tenantId: string; returnUrl?: string }) {
    if (!body.tenantId) {
      throw new BadRequestException("tenantId is required");
    }
    try {
      return await this.stripeService.createPortalSession(body.tenantId, body.returnUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao abrir portal Stripe";
      throw new BadRequestException(errorMessage);
    }
  }

  @Post("cancel-subscription")
  async cancelSubscription(@Body() body: { tenantId: string }) {
    if (!body.tenantId) {
      throw new BadRequestException("tenantId is required");
    }
    try {
      return await this.stripeService.cancelSubscription(body.tenantId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao cancelar assinatura";
      throw new BadRequestException(errorMessage);
    }
  }

  // --- COUPON ENDPOINTS ---

  @Get("coupons")
  async listCoupons() {
    return this.stripeService.listCoupons();
  }

  @Post("coupons")
  async createCoupon(
    @Body()
    body: {
      name?: string;
      code: string;
      discountType: "percent" | "amount";
      discountValue: number;
      duration?: "once" | "repeating" | "forever";
      durationInMonths?: number;
      maxRedemptions?: number;
      expiresAt?: string;
    }
  ) {
    if (!body.code || !body.discountValue || !body.discountType) {
      throw new BadRequestException("Código, tipo de desconto e valor são obrigatórios.");
    }
    try {
      return await this.stripeService.createCoupon(body);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao criar cupom no Stripe";
      throw new BadRequestException(errorMessage);
    }
  }

  @Delete("coupons/:id")
  async deleteCoupon(@Param("id") id: string) {
    if (!id) {
      throw new BadRequestException("Coupon ID is required");
    }
    return this.stripeService.deleteCoupon(id);
  }

  @Post("validate-coupon")
  @HttpCode(HttpStatus.OK)
  async validateCoupon(@Body() body: { code: string }) {
    if (!body.code) {
      throw new BadRequestException("Código de cupom obrigatório.");
    }
    return this.stripeService.validateCouponCode(body.code);
  }

  // --- WEBHOOK ENDPOINT ---

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    let rawBody = req.rawBody;
    if (!rawBody && req.body) {
      rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    }

    if (!rawBody) {
      throw new BadRequestException("Raw body is missing from the request");
    }

    return this.stripeService.handleWebhook(signature, rawBody);
  }
}
