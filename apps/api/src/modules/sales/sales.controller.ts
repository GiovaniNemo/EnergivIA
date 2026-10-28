import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";
import { SalesService } from "./sales.service";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { QuerySalesDto } from "./dto/query-sales.dto";

@Controller(["sales", "api/sales"])
@UseGuards(UnifiedAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

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

  @Get(":id")
  getSaleById(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.salesService.getSaleById(tenantId, id);
  }

  @Patch(":id")
  updateSale(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateSaleDto) {
    return this.salesService.updateSale(tenantId, id, dto);
  }

  @Post(":id/documents/generate")
  generateDocument(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { documentType: import("@prisma/client").DocumentType }
  ) {
    return this.salesService.generateSaleDocument(tenantId, id, body.documentType);
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
}
