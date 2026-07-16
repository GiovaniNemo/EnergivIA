import { Module } from "@nestjs/common";
import { KitController } from "./kit.controller";
import { KitGenerationService } from "./kit-generation.service";
import { ProductRepository } from "../../repositories/product.repository";
import { SupplierProductRepository } from "../../repositories/supplier-product.repository";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [KitController],
  providers: [KitGenerationService, ProductRepository, SupplierProductRepository],
  exports: [KitGenerationService],
})
export class KitModule {}
