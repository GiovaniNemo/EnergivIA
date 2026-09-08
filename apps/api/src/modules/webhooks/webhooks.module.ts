import { Global, Module } from "@nestjs/common";
import { WebhooksDispatcherService } from "./webhooks-dispatcher.service";

@Global()
@Module({
  providers: [WebhooksDispatcherService],
  exports: [WebhooksDispatcherService],
})
export class WebhooksModule {}
