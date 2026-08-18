import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { StripeService } from "./stripe.service";
import { Request } from "express";

import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";

@Controller("stripe")
@SkipTrialLock()
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Post("create-checkout-session")
  async createCheckoutSession(
    @Body() body: { planId: string; tenantId: string; returnUrl?: string }
  ) {
    if (!body.planId || !body.tenantId) {
      throw new BadRequestException("planId and tenantId are required");
    }

    try {
      const session = await this.stripeService.createCheckoutSession(
        body.planId,
        body.tenantId,
        body.returnUrl
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

  @Public()
  @Post("webhook")
  async webhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    // O Stripe requer o raw body para verificar a assinatura
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException("Raw body is missing from the request");
    }

    return this.stripeService.handleWebhook(signature, rawBody);
  }
}
