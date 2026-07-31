import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { DistributorsModule } from "../distributors/distributors.module";
import { AiExtractionController } from "./ai-extraction.controller";
import { AiExtractionService } from "./ai-extraction.service";

@Module({
  imports: [PrismaModule, DistributorsModule],
  controllers: [ProductsController, AiExtractionController],
  providers: [ProductsService, AiExtractionService],
  exports: [ProductsService],
})
export class ProductsModule {}
