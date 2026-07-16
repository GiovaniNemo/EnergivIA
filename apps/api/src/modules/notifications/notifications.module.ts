import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LeadActivityLogModule } from "../lead-activity-log/lead-activity-log.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationJobsService } from "./notification-jobs.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, ConfigModule, LeadActivityLogModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationJobsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
