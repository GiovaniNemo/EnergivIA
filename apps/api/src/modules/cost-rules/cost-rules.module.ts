import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CostRulesController } from "./cost-rules.controller";
import { CostRulesService } from "./cost-rules.service";

@Module({
  imports: [PrismaModule],
  controllers: [CostRulesController],
  providers: [CostRulesService],
})
export class CostRulesModule {}
