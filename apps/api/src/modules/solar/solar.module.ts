import { Module } from "@nestjs/common";
import { SolarService } from "./solar.service";

@Module({
  providers: [SolarService],
  exports: [SolarService],
})
export class SolarModule {}
