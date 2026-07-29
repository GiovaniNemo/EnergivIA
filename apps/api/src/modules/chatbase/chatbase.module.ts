import { Module } from "@nestjs/common";
import { ChatbaseController } from "./chatbase.controller";
import { ChatbaseService } from "./chatbase.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ChatbaseController],
  providers: [ChatbaseService],
})
export class ChatbaseModule {}
