import { Module, Global } from "@nestjs/common";
import { SpecialAccessService } from "./special-access.service";
import { SpecialAccessController } from "./special-access.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SpecialAccessController],
  providers: [SpecialAccessService],
  exports: [SpecialAccessService],
})
export class SpecialAccessModule {}
