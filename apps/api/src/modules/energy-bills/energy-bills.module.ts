import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EnergyBillsController } from "./energy-bills.controller";
import { EnergyBillsService } from "./energy-bills.service";

@Module({
  imports: [ConfigModule],
  controllers: [EnergyBillsController],
  providers: [EnergyBillsService],
  exports: [EnergyBillsService],
})
export class EnergyBillsModule {}
