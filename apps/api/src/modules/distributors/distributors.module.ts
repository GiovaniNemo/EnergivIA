import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DistributorsService } from "./distributors.service";
import { DistributorsController } from "./distributors.controller";
import { DistributorProductsController } from "./distributor-products.controller";

@Module({
  imports: [PrismaModule],
  controllers: [DistributorsController, DistributorProductsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
