import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DistributorsService } from "./distributors.service";
import { DistributorsController } from "./distributors.controller";
import { DistributorProductsController } from "./distributor-products.controller";
import { EdeltecService } from "./integrations/edeltec.service";
import { SpreadsheetImportService } from "./spreadsheet-import.service";

@Module({
  imports: [PrismaModule],
  controllers: [DistributorsController, DistributorProductsController],
  providers: [DistributorsService, EdeltecService, SpreadsheetImportService],
  exports: [DistributorsService, EdeltecService, SpreadsheetImportService],
})
export class DistributorsModule {}
