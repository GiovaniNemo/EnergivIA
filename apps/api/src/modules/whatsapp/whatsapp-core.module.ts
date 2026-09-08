import { Module } from "@nestjs/common";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { WhatsappBotService } from "./whatsapp-bot.service";
import { WhatsappPairingService } from "./whatsapp-pairing.service";
import { WhatsappWebhookController } from "./whatsapp-webhook.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { AiUsageModule } from "../ai-usage/ai-usage.module";

import { GeoIrradianceService } from "./services/geo-irradiance.service";
import { BillExtractorService } from "./services/bill-extractor.service";

@Module({
  imports: [PrismaModule, AiUsageModule],
  controllers: [WhatsappWebhookController],
  providers: [
    WhatsappCloudService,
    WhatsappBotService,
    WhatsappPairingService,
    GeoIrradianceService,
    BillExtractorService,
  ],
  exports: [
    WhatsappCloudService,
    WhatsappBotService,
    WhatsappPairingService,
    GeoIrradianceService,
    BillExtractorService,
  ],
})
export class WhatsappCoreModule {}
