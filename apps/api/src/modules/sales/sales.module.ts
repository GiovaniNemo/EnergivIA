import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailModule } from "../../common/email/email.module";
import { ProposalsModule } from "../proposals/proposals.module";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";
import { DocumentTemplateService } from "./document-template.service";

@Module({
  imports: [PrismaModule, EmailModule, ProposalsModule],
  controllers: [SalesController],
  providers: [SalesService, DocumentTemplateService],
  exports: [SalesService, DocumentTemplateService],
})
export class SalesModule {}
