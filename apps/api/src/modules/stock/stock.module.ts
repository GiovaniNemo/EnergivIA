import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";
import { StockReservationService } from "./stock-reservation.service";

@Module({
  imports: [PrismaModule],
  controllers: [StockController],
  providers: [StockService, StockReservationService],
  exports: [StockService, StockReservationService],
})
export class StockModule {}
