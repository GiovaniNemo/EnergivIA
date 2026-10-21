import { Module } from "@nestjs/common";
import { FeedbacksController } from "./feedbacks.controller";
import { FeedbacksService } from "./feedbacks.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FeedbacksController],
  providers: [FeedbacksService],
  exports: [FeedbacksService],
})
export class FeedbacksModule {}
