import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailModule } from "../../common/email/email.module";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
