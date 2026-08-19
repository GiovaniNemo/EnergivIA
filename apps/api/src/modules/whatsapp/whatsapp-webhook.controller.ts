import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  Logger,
  HttpCode,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { WhatsappBotService } from "./whatsapp-bot.service";

@Controller(["whatsapp", "api/whatsapp"])
@SkipTrialLock()
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly botService: WhatsappBotService
  ) {}

  @Public()
  @Get("webhook")
  verifyWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") verifyToken: string,
    @Query("hub.challenge") challenge: string,
    @Res() res: Response
  ) {
    const expectedToken =
      this.config.get<string>("WHATSAPP_VERIFY_TOKEN")?.trim() ||
      this.config.get<string>("WHATSAPP_WEBHOOK_VERIFY_TOKEN")?.trim() ||
      "energivia_webhook_token_2026";

    this.logger.log(`Verificação de Webhook Meta recebida: mode=${mode}, token=${verifyToken}`);

    if (mode === "subscribe" && verifyToken === expectedToken) {
      this.logger.log("✅ WhatsApp Webhook verificado com sucesso pela Meta!");
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn(
      `❌ Falha na verificação do WhatsApp Webhook. Recebido: '${verifyToken}', Esperado: '${expectedToken}'`
    );
    return res.status(HttpStatus.FORBIDDEN).send("Verification token mismatch");
  }

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: Record<string, unknown>) {
    // Processamento assíncrono para responder imediatamente HTTP 200 à Meta
    this.botService.handleWebhookPayload(body).catch((err) => {
      this.logger.error("Erro no processamento do webhook WhatsApp:", err);
    });

    return { status: "EVENT_RECEIVED" };
  }
}
