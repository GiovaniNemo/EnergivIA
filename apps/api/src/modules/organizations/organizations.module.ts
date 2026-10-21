import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailModule } from "../../common/email/email.module";
import { WhatsappCoreModule } from "../whatsapp/whatsapp-core.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, EmailModule, WhatsappCoreModule, NotificationsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
