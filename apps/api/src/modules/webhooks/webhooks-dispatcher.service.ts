import { Injectable, Logger } from "@nestjs/common";
import { createHmac, randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

export type WebhookEventType =
  | "proposal.created"
  | "proposal.sent"
  | "proposal.accepted"
  | "proposal.rejected"
  | "lead.created"
  | "lead.updated"
  | "deal.stage_changed";

export interface WebhookEnvelope<T = Record<string, unknown>> {
  id: string;
  event: WebhookEventType;
  tenantId: string;
  timestamp: string;
  data: T;
}

export function signWebhookPayload(payloadString: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadString, "utf8").digest("hex");
}

@Injectable()
export class WebhooksDispatcherService {
  private readonly logger = new Logger(WebhooksDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Dispara um evento assíncrono para os endpoints de webhook cadastrados.
   * Não lança exceção para não interromper os fluxos principais de negócio.
   */
  async dispatch<T extends Record<string, unknown>>(
    tenantId: string,
    event: WebhookEventType,
    data: T
  ): Promise<{ delivered: boolean; deliveryId: string }> {
    const deliveryId = randomUUID();
    const timestamp = new Date().toISOString();

    const envelope: WebhookEnvelope<T> = {
      id: deliveryId,
      event,
      tenantId,
      timestamp,
      data,
    };

    const globalWebhookUrl = this.configService.get<string>("ENTERPRISE_WEBHOOK_URL");
    const globalWebhookSecret =
      this.configService.get<string>("ENTERPRISE_WEBHOOK_SECRET") ||
      "energivia-webhook-default-secret";

    // Se houver webhook global ou corporativo configurado
    if (!globalWebhookUrl) {
      this.logger.debug(
        `Webhook ${event} gerado (${deliveryId}) para tenant ${tenantId}, mas nenhuma URL global configurada.`
      );
      return { delivered: false, deliveryId };
    }

    const payloadString = JSON.stringify(envelope);
    const signature = signWebhookPayload(payloadString, globalWebhookSecret);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(globalWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Energivia-Delivery-Id": deliveryId,
          "X-Energivia-Event": event,
          "X-Energivia-Timestamp": timestamp,
          "X-Energivia-Signature": `sha256=${signature}`,
          "User-Agent": "EnergivIA-Webhook-Dispatcher/1.0",
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(
          `Webhook ${event} (${deliveryId}) respondeu com status ${response.status} ${response.statusText}`
        );
        return { delivered: false, deliveryId };
      }

      this.logger.log(`Webhook ${event} entregue com sucesso (${deliveryId})`);
      return { delivered: true, deliveryId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha no envio do webhook ${event} (${deliveryId}): ${message}`);
      return { delivered: false, deliveryId };
    }
  }
}
