import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailModule } from "../../common/email/email.module";
import { ProposalsModule } from "../proposals/proposals.module";
import { SalesService } from "./sales.service";
import { SalesController } from "./sales.controller";
import { DocumentTemplateService } from "./document-template.service";
import { SignatureAuditService } from "./signature-audit.service";
import { PublicSignatureController } from "./public-signature.controller";

@Module({
  imports: [PrismaModule, EmailModule, ProposalsModule],
  controllers: [SalesController, PublicSignatureController],
  providers: [SalesService, DocumentTemplateService, SignatureAuditService],
  exports: [SalesService, DocumentTemplateService, SignatureAuditService],
})
export class SalesModule {}
