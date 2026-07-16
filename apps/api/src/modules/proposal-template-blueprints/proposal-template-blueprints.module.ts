import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ProposalTemplateBlueprintsService } from "./proposal-template-blueprints.service";
import { ProposalTemplateBlueprintsController } from "./proposal-template-blueprints.controller";
import { AdminProposalTemplateBlueprintsController } from "./admin-proposal-template-blueprints.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ProposalTemplateBlueprintsController, AdminProposalTemplateBlueprintsController],
  providers: [ProposalTemplateBlueprintsService],
  exports: [ProposalTemplateBlueprintsService],
})
export class ProposalTemplateBlueprintsModule {}
