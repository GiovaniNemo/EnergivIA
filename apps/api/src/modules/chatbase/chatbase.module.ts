import { Module } from "@nestjs/common";
import { ChatbaseController } from "./chatbase.controller";
import { ChatbaseService } from "./chatbase.service";

@Module({
  controllers: [ChatbaseController],
  providers: [ChatbaseService],
})
export class ChatbaseModule {}
