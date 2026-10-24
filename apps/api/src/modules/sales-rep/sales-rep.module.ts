import { Module } from "@nestjs/common";
import { SalesRepController } from "./sales-rep.controller";
import { SalesRepService } from "./sales-rep.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SalesRepController],
  providers: [SalesRepService],
  exports: [SalesRepService],
})
export class SalesRepModule {}
