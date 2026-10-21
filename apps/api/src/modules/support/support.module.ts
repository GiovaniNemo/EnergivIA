import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { EmailModule } from "../../common/email/email.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [EmailModule, NotificationsModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
