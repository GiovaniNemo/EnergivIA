import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DistributorsService } from "./distributors.service";
import { DistributorsController } from "./distributors.controller";
import { DistributorProductsController } from "./distributor-products.controller";
import { EdeltecService } from "./integrations/edeltec.service";

@Module({
  imports: [PrismaModule],
  controllers: [DistributorsController, DistributorProductsController],
  providers: [DistributorsService, EdeltecService],
  exports: [DistributorsService, EdeltecService],
})
export class DistributorsModule {}
