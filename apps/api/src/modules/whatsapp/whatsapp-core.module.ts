import { Module, forwardRef } from "@nestjs/common";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { WhatsappBotService } from "./whatsapp-bot.service";
import { WhatsappPairingService } from "./whatsapp-pairing.service";
import { WhatsappWebhookController } from "./whatsapp-webhook.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { AiUsageModule } from "../ai-usage/ai-usage.module";

import { GeoIrradianceService } from "./services/geo-irradiance.service";
import { BillExtractorService } from "./services/bill-extractor.service";
import { KitModule } from "../kit/kit.module";
import { ProposalsModule } from "../proposals/proposals.module";

@Module({
  imports: [PrismaModule, AiUsageModule, KitModule, forwardRef(() => ProposalsModule)],
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
