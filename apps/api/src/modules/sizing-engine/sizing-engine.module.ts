import { Module } from "@nestjs/common";
import { SizingEngineController } from "./sizing-engine.controller";
import { SizingEngineService } from "./sizing-engine.service";

@Module({
  controllers: [SizingEngineController],
  providers: [SizingEngineService],
  exports: [SizingEngineService],
})
export class SizingEngineModule {}
