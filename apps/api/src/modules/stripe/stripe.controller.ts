import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { Request } from "express";

@Controller("stripe")
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Post("create-checkout-session")
  async createCheckoutSession(@Body() body: { planId: string; tenantId: string }) {
    if (!body.planId || !body.tenantId) {
      throw new BadRequestException("planId and tenantId are required");
    }

    try {
      const session = await this.stripeService.createCheckoutSession(body.planId, body.tenantId);
      return { url: session.url };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro interno no Stripe";
      throw new BadRequestException(errorMessage);
    }
  }

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
