import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";
import { SalesService } from "./sales.service";
import { SignatureAuditService } from "./signature-audit.service";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { QuerySalesDto } from "./dto/query-sales.dto";
import { SignCompanyDocumentDto, UpdateTenantSignatureDto } from "./dto/sign-company-document.dto";

@Controller(["sales", "api/sales"])
@UseGuards(UnifiedAuthGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly signatureAuditService: SignatureAuditService
  ) {}

  @Post("convert/:proposalId")
  convertToSale(
    @TenantId() tenantId: string,
    @Param("proposalId") proposalId: string,
    @CurrentUser() user?: JwtPayload
  ) {
    const userObj = user as (JwtPayload & { name?: string }) | undefined;
    return this.salesService.convertToSale(tenantId, proposalId, {
      name: userObj?.name,
      email: user?.email,
    });
  }

  @Get()
  listSales(@TenantId() tenantId: string, @Query() query: QuerySalesDto) {
    return this.salesService.listSales(tenantId, query);
  }

  @Get("templates/global")
  getGlobalDocumentTemplates(@TenantId() tenantId: string) {
    return this.salesService.getGlobalDocumentTemplates(tenantId);
  }

  @Put("templates/global")
  updateGlobalDocumentTemplate(
    @TenantId() tenantId: string,
    @Body() body: { documentType: import("@prisma/client").DocumentType; contentHtml: string }
  ) {
    return this.salesService.updateGlobalDocumentTemplate(
      tenantId,
      body.documentType,
      body.contentHtml
    );
  }

  @Post("templates/global/reset")
  resetGlobalDocumentTemplate(
    @TenantId() tenantId: string,
    @Body() body: { documentType: import("@prisma/client").DocumentType }
  ) {
    return this.salesService.resetGlobalDocumentTemplate(tenantId, body.documentType);
  }

  @Get("company-signature")
  getCompanySignature(@TenantId() tenantId: string) {
    return this.salesService.getTenantSignature(tenantId);
  }

  @Patch("company-signature")
  updateCompanySignature(@TenantId() tenantId: string, @Body() dto: UpdateTenantSignatureDto) {
    return this.salesService.updateTenantSignature(tenantId, dto);
  }

  @Get(":id")
  getSaleById(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.salesService.getSaleById(tenantId, id);
  }

  @Patch(":id")
  updateSale(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateSaleDto) {
    return this.salesService.updateSale(tenantId, id, dto);
  }

  @Post(":id/documents/generate")
  @Throttle({ short: { limit: 3, ttl: 10_000 }, medium: { limit: 15, ttl: 60_000 } })
  generateDocument(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { documentType: import("@prisma/client").DocumentType }
  ) {
    return this.salesService.generateSaleDocument(tenantId, id, body.documentType);
  }

  @Post(":id/documents/:docId/sign-company")
  @Throttle({ short: { limit: 2, ttl: 10_000 }, medium: { limit: 10, ttl: 60_000 } })
  signCompanyDocument(
    @TenantId() tenantId: string,
    @Param("id") saleId: string,
    @Param("docId") docId: string,
    @CurrentUser() user: JwtPayload | undefined,
    @Req() req: Request,
    @Body() dto: SignCompanyDocumentDto
  ) {
    const userObj = user as (JwtPayload & { name?: string }) | undefined;
    return this.signatureAuditService.signCompanyDocument(
      tenantId,
      saleId,
      docId,
      { id: user?.sub || "", name: userObj?.name, email: user?.email },
      req,
      dto
    );
  }

  @Get(":id/documents/:docId/editor")
  getDocumentForEditor(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Param("docId") docId: string
  ) {
    return this.salesService.getDocumentForEditor(tenantId, id, docId);
  }

  @Patch(":id/documents/:docId/content")
  updateDocumentContent(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Param("docId") docId: string,
    @Body() body: { contentHtml: string }
  ) {
    return this.salesService.updateDocumentContent(tenantId, id, docId, body.contentHtml);
  }

  @Delete(":id/documents/:docId")
  deleteSaleDocument(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Param("docId") docId: string
  ) {
    return this.salesService.deleteSaleDocument(tenantId, id, docId);
  }
}
