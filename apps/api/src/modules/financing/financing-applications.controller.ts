import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { JwtPayload } from "@energivia/types";
import type { FinancingApplicationStatus } from "@prisma/client";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";

const PLATFORM_ONLY_PATCH_FIELDS: Array<
  "approvedAmount" | "approvedTerm" | "approvedRate" | "approvedCet" | "externalReference"
> = ["approvedAmount", "approvedTerm", "approvedRate", "approvedCet", "externalReference"];
import { FinancingApplicationsService } from "./financing-applications.service";
import { FinancingAuditLogService, type AuditContext } from "./financing-audit-log.service";
import {
  CreateApplicationDto,
  TransitionStatusDto,
  UpdateApplicationDto,
} from "./dto/application.dto";
import { CreateDocumentDto, UpdateDocumentDto } from "./dto/document.dto";

function buildAuditContext(req: Request & { user?: JwtPayload }, tenantId: string): AuditContext {
  const xff = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(xff) ? xff[0] : (xff as string | undefined))?.split(",")[0]?.trim() ??
    req.ip ??
    null;
  return {
    tenantId,
    userId: req.user?.sub ?? null,
    userRole: req.user?.role ?? null,
    ipAddress: ip,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

@Controller("financing/applications")
@UseGuards(UnifiedAuthGuard)
export class FinancingApplicationsController {
  constructor(
    private readonly service: FinancingApplicationsService,
    private readonly auditLog: FinancingAuditLogService
  ) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Req() req: Request & { user?: JwtPayload },
    @Body() body: CreateApplicationDto
  ) {
    return this.service.create(tenantId, req.user?.sub ?? null, body);
  }

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query("status") status?: FinancingApplicationStatus,
    @Query("assignedUserId") assignedUserId?: string,
    @Query("providerId") providerId?: string
  ) {
    return this.service.list(tenantId, { status, assignedUserId, providerId });
  }

  @Get("kanban")
  kanban(@TenantId() tenantId: string) {
    return this.service.kanban(tenantId);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Get(":id/audit-log")
  listAuditLog(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.auditLog.listByApplication(id, tenantId);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Req() req: Request & { user?: JwtPayload },
    @Body() body: UpdateApplicationDto
  ) {
    const role = req.user?.role;
    const touchesPlatformFields = PLATFORM_ONLY_PATCH_FIELDS.some((k) => body[k] !== undefined);
    if (touchesPlatformFields && role !== "PLATFORM") {
      throw new ForbiddenException(
        "Apenas Energivia (PLATFORM) pode editar dados aprovados pelo banco e referência externa."
      );
    }
    return this.service.update(tenantId, id, buildAuditContext(req, tenantId), body);
  }

  @Post(":id/transition")
  transition(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Req() req: Request & { user?: JwtPayload },
    @Body() body: TransitionStatusDto
  ) {
    return this.service.transition(tenantId, id, buildAuditContext(req, tenantId), body);
  }

  @Post(":id/documents")
  addDocument(
    @TenantId() tenantId: string,
    @Param("id") applicationId: string,
    @Req() req: Request & { user?: JwtPayload },
    @Body() body: CreateDocumentDto
  ) {
    return this.service.addDocument(tenantId, applicationId, req.user?.sub ?? null, body);
  }

  @Patch("documents/:documentId")
  updateDocument(
    @TenantId() tenantId: string,
    @Param("documentId") documentId: string,
    @Req() req: Request & { user?: JwtPayload },
    @Body() body: UpdateDocumentDto
  ) {
    return this.service.updateDocument(tenantId, documentId, req.user?.sub ?? null, body);
  }

  @Delete("documents/:documentId")
  deleteDocument(@TenantId() tenantId: string, @Param("documentId") documentId: string) {
    return this.service.deleteDocument(tenantId, documentId);
  }
}
