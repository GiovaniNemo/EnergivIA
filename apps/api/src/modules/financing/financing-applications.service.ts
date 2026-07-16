import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  FinancingApplicationStatus,
  FinancingDocumentStatus,
  FinancingTimelineEventType,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { ConfigService } from "@nestjs/config";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsappCloudService } from "../whatsapp/whatsapp-cloud.service";
import { AdapterRegistry } from "./adapters/adapter.registry";
import { FinancingAuditLogService, type AuditContext } from "./financing-audit-log.service";
import { FinancingCommissionsService } from "./financing-commissions.service";
import type {
  CreateApplicationDto,
  TransitionStatusDto,
  UpdateApplicationDto,
} from "./dto/application.dto";
import type { CreateDocumentDto, UpdateDocumentDto } from "./dto/document.dto";
import { canTransition, STATUS_TIMESTAMP_MAP } from "./state-machine";

interface AppendTimelineInput {
  applicationId: string;
  type: FinancingTimelineEventType;
  description: string;
  userId?: string | null;
  meta?: Prisma.InputJsonValue;
}

@Injectable()
export class FinancingApplicationsService {
  private readonly logger = new Logger(FinancingApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: AdapterRegistry,
    private readonly leadActivityLog: LeadActivityLogService,
    private readonly commissions: FinancingCommissionsService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: FinancingAuditLogService,
    private readonly whatsapp: WhatsappCloudService,
    private readonly config: ConfigService
  ) {}

  async create(tenantId: string, userId: string | null, dto: CreateApplicationDto) {
    const offer = await this.prisma.financingOffer.findUnique({
      where: { id: dto.selectedOfferId },
      include: {
        simulation: true,
        provider: true,
      },
    });
    if (!offer) throw new NotFoundException("Oferta não encontrada.");
    if (offer.simulation.tenantId !== tenantId) {
      throw new NotFoundException("Oferta não encontrada para este tenant.");
    }

    const initialStatus: FinancingApplicationStatus = offer.provider.docsRequired
      ? "AWAITING_DOCUMENTS"
      : "CREATED";

    const application = await this.prisma.financingApplication.create({
      data: {
        tenantId,
        simulationId: offer.simulationId,
        selectedOfferId: offer.id,
        providerId: offer.providerId,
        assignedUserId: userId,
        status: initialStatus,
        notes: dto.notes,
      },
    });

    const requiredDocs = this.extractRequiredDocs(
      offer.provider.docsRequired,
      offer.simulation.personType
    );
    if (requiredDocs.length > 0) {
      await this.prisma.financingDocument.createMany({
        data: requiredDocs.map((type) => ({
          applicationId: application.id,
          name: this.humanizeDocType(type),
          type,
          status: "REQUIRED" as FinancingDocumentStatus,
        })),
      });
    }

    await this.appendTimeline({
      applicationId: application.id,
      type: "APPLICATION_CREATED",
      description: `Solicitação criada para ${offer.provider.name} — parcela ${formatBRL(Number(offer.installmentValue))}/${offer.term}x.`,
      userId,
      meta: { offerId: offer.id, providerId: offer.providerId },
    });

    await this.leadActivityLog.append({
      tenantId,
      leadId: offer.simulation.leadId,
      kind: "NOTE_ADDED",
      label: `Financiamento solicitado em ${offer.provider.name}`,
      meta: {
        applicationId: application.id,
        simulationId: offer.simulationId,
        providerId: offer.providerId,
        kind: "financing_application",
      },
    });

    return this.findOne(tenantId, application.id);
  }

  async findOne(tenantId: string, id: string) {
    const application = await this.prisma.financingApplication.findFirst({
      where: { id, tenantId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            mode: true,
            docsRequired: true,
          },
        },
        selectedOffer: true,
        simulation: {
          select: {
            id: true,
            leadId: true,
            dealId: true,
            customerName: true,
            cpfCnpj: true,
            email: true,
            phone: true,
            personType: true,
            projectAmount: true,
            downPayment: true,
            financedAmount: true,
            requestedTerm: true,
            status: true,
          },
        },
        documents: { orderBy: { createdAt: "asc" } },
        timelineEvents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!application) throw new NotFoundException("Solicitação não encontrada.");
    return application;
  }

  async list(
    tenantId: string,
    params: { status?: FinancingApplicationStatus; assignedUserId?: string; providerId?: string }
  ) {
    const rows = await this.prisma.financingApplication.findMany({
      where: {
        tenantId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.assignedUserId ? { assignedUserId: params.assignedUserId } : {}),
        ...(params.providerId ? { providerId: params.providerId } : {}),
      },
      include: {
        provider: { select: { id: true, name: true, slug: true, logoUrl: true, mode: true } },
        selectedOffer: {
          select: {
            installmentValue: true,
            term: true,
            financedAmount: true,
            monthlyRate: true,
            cet: true,
          },
        },
        simulation: {
          select: {
            customerName: true,
            cpfCnpj: true,
            personType: true,
            leadId: true,
          },
        },
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return rows;
  }

  async kanban(tenantId: string) {
    const all = await this.list(tenantId, {});
    const groups: Record<FinancingApplicationStatus, typeof all> = {
      CREATED: [],
      AWAITING_DOCUMENTS: [],
      DOCUMENTS_RECEIVED: [],
      SUBMITTED_TO_BANK: [],
      UNDER_REVIEW: [],
      PENDING: [],
      APPROVED: [],
      REJECTED: [],
      CONTRACT_SIGNED: [],
      CREDIT_RELEASED: [],
      COMPLETED: [],
    };
    for (const a of all) groups[a.status].push(a);
    return groups;
  }

  async update(tenantId: string, id: string, ctx: AuditContext, dto: UpdateApplicationDto) {
    const app = await this.prisma.financingApplication.findFirst({
      where: { id, tenantId },
    });
    if (!app) throw new NotFoundException("Solicitação não encontrada.");

    if (dto.expectedVersion !== undefined && app.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Solicitação foi modificada por outro usuário (versão ${app.version}, esperada ${dto.expectedVersion}). Recarregue e tente de novo.`
      );
    }

    const before: Record<string, unknown> = {};
    if (dto.assignedUserId !== undefined) before["assignedUserId"] = app.assignedUserId;
    if (dto.notes !== undefined) before["notes"] = app.notes;
    if (dto.externalReference !== undefined) before["externalReference"] = app.externalReference;
    if (dto.approvedAmount !== undefined)
      before["approvedAmount"] = app.approvedAmount?.toString() ?? null;
    if (dto.approvedTerm !== undefined) before["approvedTerm"] = app.approvedTerm;
    if (dto.approvedRate !== undefined)
      before["approvedRate"] = app.approvedRate?.toString() ?? null;
    if (dto.approvedCet !== undefined) before["approvedCet"] = app.approvedCet?.toString() ?? null;

    const changes: Partial<Record<keyof typeof dto, unknown>> = {};
    const data: Prisma.FinancingApplicationUpdateInput = {};
    const userId = ctx.userId;

    if (dto.assignedUserId !== undefined) {
      data.assignedUserId = dto.assignedUserId ?? null;
      changes.assignedUserId = dto.assignedUserId;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
      changes.notes = dto.notes;
    }
    if (dto.externalReference !== undefined) {
      data.externalReference = dto.externalReference;
      changes.externalReference = dto.externalReference;
    }
    if (dto.approvedAmount !== undefined) {
      data.approvedAmount = new Decimal(dto.approvedAmount);
      changes.approvedAmount = dto.approvedAmount;
    }
    if (dto.approvedTerm !== undefined) {
      data.approvedTerm = dto.approvedTerm;
      changes.approvedTerm = dto.approvedTerm;
    }
    if (dto.approvedRate !== undefined) {
      data.approvedRate = new Decimal(dto.approvedRate);
      changes.approvedRate = dto.approvedRate;
    }
    if (dto.approvedCet !== undefined) {
      data.approvedCet = new Decimal(dto.approvedCet);
      changes.approvedCet = dto.approvedCet;
    }

    if (Object.keys(data).length > 0) {
      data.version = { increment: 1 };
    }

    const updated = await this.prisma.financingApplication.update({
      where: { id },
      data,
    });

    if (Object.keys(changes).length > 0) {
      await this.appendTimeline({
        applicationId: id,
        type: "STATUS_CHANGED",
        description: this.summarizeAdminUpdate(changes),
        userId,
        meta: changes as Prisma.InputJsonValue,
      });

      await this.auditLog.record(ctx, {
        eventType: "APPLICATION_UPDATED",
        applicationId: id,
        description: this.summarizeAdminUpdate(changes),
        before,
        after: changes as Record<string, unknown>,
      });
    }

    if (dto.approvedAmount !== undefined) {
      try {
        const delta = await this.commissions.recalculateForApplication(id);
        if (delta) {
          await this.auditLog.record(ctx, {
            eventType: "COMMISSION_UPDATED",
            applicationId: id,
            description: `Comissão recalculada após edição de approvedAmount: ${formatBRL(delta.before.grossCommissionBrl)} → ${formatBRL(delta.after.grossCommissionBrl)}`,
            before: delta.before as unknown as Record<string, unknown>,
            after: delta.after as unknown as Record<string, unknown>,
          });
        }
      } catch (e) {
        this.logger.warn(
          `recalculateCommission failed application=${id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return updated;
  }

  async transition(tenantId: string, id: string, ctx: AuditContext, dto: TransitionStatusDto) {
    const app = await this.prisma.financingApplication.findFirst({
      where: { id, tenantId },
    });
    if (!app) throw new NotFoundException("Solicitação não encontrada.");
    const userId = ctx.userId;

    if (dto.expectedVersion !== undefined && app.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Solicitação foi modificada por outro usuário (versão ${app.version}, esperada ${dto.expectedVersion}). Recarregue e tente de novo.`
      );
    }

    if (!canTransition(app.status, dto.to)) {
      throw new BadRequestException(`Transição inválida: ${app.status} → ${dto.to}.`);
    }

    const timestampField = STATUS_TIMESTAMP_MAP[dto.to];
    const data: Prisma.FinancingApplicationUpdateInput = {
      status: dto.to,
      version: { increment: 1 },
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    };

    const updated = await this.prisma.financingApplication.update({
      where: { id },
      data,
    });

    if (dto.to === "APPROVED") {
      await this.commissions.ensureCommissionForApprovedApplication(id);
    }
    await this.commissions.syncCommissionToApplicationStatus(id, dto.to);

    const timelineType = this.timelineTypeFor(dto.to);
    await this.appendTimeline({
      applicationId: id,
      type: timelineType,
      description: dto.reason
        ? `Status alterado: ${app.status} → ${dto.to}. ${dto.reason}`
        : `Status alterado: ${app.status} → ${dto.to}.`,
      userId,
      meta: { from: app.status, to: dto.to },
    });

    await this.auditLog.record(ctx, {
      eventType: "STATUS_TRANSITIONED",
      applicationId: id,
      description: `${app.status} → ${dto.to}${dto.reason ? ` (${dto.reason})` : ""}`,
      before: { status: app.status },
      after: { status: dto.to, reason: dto.reason ?? null },
    });

    if (
      dto.to === "APPROVED" ||
      dto.to === "REJECTED" ||
      dto.to === "CONTRACT_SIGNED" ||
      dto.to === "CREDIT_RELEASED" ||
      dto.to === "PENDING"
    ) {
      const full = await this.prisma.financingApplication.findUnique({
        where: { id },
        include: {
          provider: { select: { name: true } },
          simulation: { select: { customerName: true, leadId: true, dealId: true } },
        },
      });
      if (full) {
        try {
          await this.notifications.notifyFinancingStatusChange({
            tenantId: full.tenantId,
            applicationId: full.id,
            leadId: full.simulation.leadId,
            dealId: full.simulation.dealId,
            customerName: full.simulation.customerName,
            providerName: full.provider.name,
            status: dto.to,
            assignedUserId: full.assignedUserId,
            reason: dto.reason ?? null,
          });
        } catch (e) {
          this.logger.warn(
            `notifyFinancingStatusChange failed application=${id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }

        if (dto.to === "APPROVED" || dto.to === "CONTRACT_SIGNED" || dto.to === "CREDIT_RELEASED") {
          const offer = await this.prisma.financingOffer.findUnique({
            where: { id: full.selectedOfferId },
            select: { installmentValue: true, term: true },
          });
          await this.notifyCustomerViaWhatsapp({
            leadId: full.simulation.leadId,
            customerName: full.simulation.customerName,
            providerName: full.provider.name,
            status: dto.to,
            approvedAmount: full.approvedAmount ? Number(full.approvedAmount) : null,
            installmentValue: offer ? Number(offer.installmentValue) : null,
            term: offer?.term ?? null,
          });
        }
      }
    }

    return updated;
  }

  async addDocument(
    tenantId: string,
    applicationId: string,
    userId: string | null,
    dto: CreateDocumentDto
  ) {
    const app = await this.prisma.financingApplication.findFirst({
      where: { id: applicationId, tenantId },
      select: { id: true },
    });
    if (!app) throw new NotFoundException("Solicitação não encontrada.");

    const doc = await this.prisma.financingDocument.create({
      data: {
        applicationId,
        name: dto.name,
        type: dto.type,
        fileUrl: dto.fileUrl ?? null,
        status: dto.fileUrl ? "UPLOADED" : "REQUIRED",
        uploadedAt: dto.fileUrl ? new Date() : null,
      },
    });

    if (dto.fileUrl) {
      await this.appendTimeline({
        applicationId,
        type: "DOCUMENT_UPLOADED",
        description: `Documento adicionado: ${dto.name}.`,
        userId,
        meta: { documentId: doc.id, type: dto.type },
      });
    }

    return doc;
  }

  async updateDocument(
    tenantId: string,
    documentId: string,
    userId: string | null,
    dto: UpdateDocumentDto
  ) {
    const doc = await this.prisma.financingDocument.findUnique({
      where: { id: documentId },
      include: { application: { select: { tenantId: true, id: true } } },
    });
    if (!doc || doc.application.tenantId !== tenantId) {
      throw new NotFoundException("Documento não encontrado.");
    }

    const data: Prisma.FinancingDocumentUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.fileUrl !== undefined) {
      data.fileUrl = dto.fileUrl;
      data.uploadedAt = new Date();
      if (!dto.status) data.status = "UPLOADED";
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === "APPROVED" || dto.status === "REJECTED") {
        data.reviewedAt = new Date();
      }
    }
    if (dto.reviewerNotes !== undefined) data.reviewerNotes = dto.reviewerNotes;

    const updated = await this.prisma.financingDocument.update({
      where: { id: documentId },
      data,
    });

    let timelineType: FinancingTimelineEventType | null = null;
    let description = "";
    if (dto.fileUrl) {
      timelineType = "DOCUMENT_UPLOADED";
      description = `Documento enviado: ${updated.name}.`;
    } else if (dto.status === "APPROVED") {
      timelineType = "DOCUMENT_APPROVED";
      description = `Documento aprovado: ${updated.name}.`;
    } else if (dto.status === "REJECTED") {
      timelineType = "DOCUMENT_REJECTED";
      description = `Documento rejeitado: ${updated.name}.${
        dto.reviewerNotes ? ` Motivo: ${dto.reviewerNotes}` : ""
      }`;
    }
    if (timelineType) {
      await this.appendTimeline({
        applicationId: doc.application.id,
        type: timelineType,
        description,
        userId,
        meta: { documentId, type: updated.type },
      });
    }

    return updated;
  }

  async deleteDocument(tenantId: string, documentId: string) {
    const doc = await this.prisma.financingDocument.findUnique({
      where: { id: documentId },
      include: { application: { select: { tenantId: true } } },
    });
    if (!doc || doc.application.tenantId !== tenantId) {
      throw new NotFoundException("Documento não encontrado.");
    }
    await this.prisma.financingDocument.delete({ where: { id: documentId } });
  }

  private async appendTimeline(input: AppendTimelineInput): Promise<void> {
    await this.prisma.financingTimelineEvent.create({
      data: {
        applicationId: input.applicationId,
        type: input.type,
        description: input.description,
        userId: input.userId ?? null,
        meta: input.meta,
      },
    });
  }

  private extractRequiredDocs(
    docsRequired: Prisma.JsonValue | null,
    personType: "PF" | "PJ"
  ): string[] {
    if (!docsRequired || typeof docsRequired !== "object" || Array.isArray(docsRequired)) {
      return [];
    }
    const map = docsRequired as Record<string, unknown>;
    const list = map[personType];
    if (!Array.isArray(list)) return [];
    return list.filter((s): s is string => typeof s === "string");
  }

  private humanizeDocType(type: string): string {
    const map: Record<string, string> = {
      RG: "RG",
      CPF: "CPF",
      COMPROVANTE_RESIDENCIA: "Comprovante de residência",
      COMPROVANTE_RENDA: "Comprovante de renda",
      CONTRATO_SOCIAL: "Contrato social",
      CNPJ: "CNPJ",
      BALANCO: "Balanço",
      DOCUMENTOS_SOCIOS: "Documentos dos sócios",
    };
    return map[type] ?? type.replace(/_/g, " ").toLowerCase();
  }

  private timelineTypeFor(status: FinancingApplicationStatus): FinancingTimelineEventType {
    switch (status) {
      case "SUBMITTED_TO_BANK":
        return "SUBMITTED_TO_BANK";
      case "PENDING":
        return "PENDENCY_OPENED";
      case "APPROVED":
        return "APPROVED";
      case "REJECTED":
        return "REJECTED";
      case "CONTRACT_SIGNED":
        return "CONTRACT_SIGNED";
      case "CREDIT_RELEASED":
        return "CREDIT_RELEASED";
      default:
        return "STATUS_CHANGED";
    }
  }

  private summarizeAdminUpdate(changes: Record<string, unknown>): string {
    const parts: string[] = [];
    if (changes["assignedUserId"] !== undefined) parts.push("responsável atualizado");
    if (changes["notes"] !== undefined) parts.push("observações atualizadas");
    if (changes["externalReference"] !== undefined) parts.push("referência externa atualizada");
    if (changes["approvedAmount"] !== undefined) {
      parts.push(`valor aprovado: ${formatBRL(changes["approvedAmount"] as number)}`);
    }
    if (changes["approvedTerm"] !== undefined) {
      parts.push(`prazo aprovado: ${changes["approvedTerm"]}x`);
    }
    if (changes["approvedRate"] !== undefined) {
      parts.push(`taxa aprovada: ${(Number(changes["approvedRate"]) * 100).toFixed(2)}% a.m.`);
    }
    if (changes["approvedCet"] !== undefined) {
      parts.push(`CET aprovado: ${(Number(changes["approvedCet"]) * 100).toFixed(2)}% a.m.`);
    }
    return parts.join(" · ") || "Detalhes atualizados.";
  }

  private async notifyCustomerViaWhatsapp(input: {
    leadId: string;
    customerName: string;
    providerName: string;
    status: "APPROVED" | "CONTRACT_SIGNED" | "CREDIT_RELEASED";
    approvedAmount?: number | null;
    installmentValue?: number | null;
    term?: number | null;
  }): Promise<void> {
    const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim();
    if (!phoneNumberId) {
      this.logger.debug(
        "notifyCustomerViaWhatsapp: WHATSAPP_PHONE_NUMBER_ID não configurado, pulando."
      );
      return;
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { whatsapp: true, name: true },
    });
    const toWaId = lead?.whatsapp?.replace(/\D/g, "");
    if (!toWaId || toWaId.length < 10) return;

    const greeting = input.customerName.split(" ")[0] ?? "Olá";
    let body: string;
    switch (input.status) {
      case "APPROVED": {
        const valor = input.approvedAmount ? ` no valor de ${formatBRL(input.approvedAmount)}` : "";
        const parcela =
          input.installmentValue && input.term
            ? `\n\nParcela: ${formatBRL(input.installmentValue)} em ${input.term}x.`
            : "";
        body =
          `Olá ${greeting}! 🎉\n\n` +
          `Seu financiamento solar foi *aprovado* pelo ${input.providerName}${valor}.${parcela}\n\n` +
          `Em breve enviaremos o contrato para assinatura. Qualquer dúvida, é só responder por aqui.`;
        break;
      }
      case "CONTRACT_SIGNED":
        body =
          `Olá ${greeting}! ✅\n\n` +
          `Seu contrato com o ${input.providerName} foi assinado. ` +
          `O próximo passo é a liberação do crédito.`;
        break;
      case "CREDIT_RELEASED":
        body =
          `Olá ${greeting}! 💰\n\n` +
          `O crédito do seu financiamento (${input.providerName}) foi *liberado*. ` +
          `Em breve a equipe entrará em contato para agendar a instalação.`;
        break;
    }

    try {
      await this.whatsapp.sendTextMessage({ phoneNumberId, toWaId, body });
      this.logger.log(`WhatsApp ao cliente lead=${input.leadId} status=${input.status} enviado.`);
    } catch (e) {
      this.logger.warn(
        `notifyCustomerViaWhatsapp falhou lead=${input.leadId}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
