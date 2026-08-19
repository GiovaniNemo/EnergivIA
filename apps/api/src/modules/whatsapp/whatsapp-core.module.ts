import { Module } from "@nestjs/common";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { WhatsappBotService } from "./whatsapp-bot.service";
import { WhatsappPairingService } from "./whatsapp-pairing.service";
import { WhatsappWebhookController } from "./whatsapp-webhook.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappCloudService, WhatsappBotService, WhatsappPairingService],
  exports: [WhatsappCloudService, WhatsappBotService, WhatsappPairingService],
})
export class WhatsappCoreModule {}
