/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

export const DEMO_TENANT_SLUG = "degustacao-whatsapp";
export const DEFAULT_MAX_TRIAL_QUOTES = 3;
export const DEFAULT_KWP_RATE = 2800;

export interface GuestTrialStatus {
  allowed: boolean;
  trialQuotesUsed: number;
  trialMaxQuotes: number;
  remaining: number;
  isGuestTrial: boolean;
}

@Injectable()
export class WhatsappGuestTrialService {
  private readonly logger = new Logger(WhatsappGuestTrialService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca ou cria a Organização de Sistema compartilhada para demonstrações no WhatsApp.
   * Essa organização garante integridade relacional (foreign keys válidas em propostas,
   * simulações e deals) e possui o recurso de WhatsApp com IA ativado via specialAccessActive.
   */
  async getOrCreateDemoTenant() {
    const includeQuery = {
      subscription: {
        include: { plan: true },
      },
      proposalTemplates: {
        where: { deletedAt: null },
      },
    };

    let tenant = await this.prisma.tenant.findUnique({
      where: { slug: DEMO_TENANT_SLUG },
      include: includeQuery,
    });

    if (!tenant) {
      this.logger.log(`Criando organização de demonstração padrão (slug: ${DEMO_TENANT_SLUG})...`);
      tenant = await this.prisma.tenant.create({
        data: {
          slug: DEMO_TENANT_SLUG,
          name: "EnergivIA Demonstração",
          domain: "degustacao.energivia.com.br",
          settings: {
            specialAccessActive: true,
            defaultKwpRate: DEFAULT_KWP_RATE,
            isDemoTenant: true,
            companyName: "EnergivIA",
          },
        },
        include: includeQuery,
      });
      this.logger.log(`Organização de demonstração criada com sucesso: ${tenant.id}`);
    }

    // Garante que a organização de demonstração possua um template padrão oficial
    if (!tenant.proposalTemplates || tenant.proposalTemplates.length === 0) {
      await this.ensureDefaultDemoTemplate(tenant.id);
    }

    return tenant;
  }

  /**
   * Garante a criação de um Modelo Oficial Padrão EnergivIA vinculado à organização demo.
   */
  private async ensureDefaultDemoTemplate(tenantId: string) {
    try {
      if (!this.prisma?.proposalTemplateBlueprint?.findFirst) return;

      const blueprint = await this.prisma.proposalTemplateBlueprint.findFirst({
        where: { published: true },
        orderBy: { updatedAt: "desc" },
      });

      if (blueprint) {
        await this.prisma.proposalTemplate.create({
          data: {
            tenantId,
            name: blueprint.name || "Modelo Comercial Padrão",
            status: "PUBLISHED",
            isDefault: true,
            config: blueprint.document as any,
            version: 1,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Não foi possível clonar blueprint para organização demo: ${err}`);
    }
  }

  /**
   * Avalia o status e saldo da cota de degustação a partir dos metadados da conversa.
   */
  getGuestTrialStatus(conversation: { metadata?: unknown } | null | undefined): GuestTrialStatus {
    const meta = (conversation?.metadata as Record<string, any>) || {};
    const trialQuotesUsed =
      typeof meta["trialQuotesUsed"] === "number" && meta["trialQuotesUsed"] >= 0
        ? meta["trialQuotesUsed"]
        : 0;
    const trialMaxQuotes =
      typeof meta["trialMaxQuotes"] === "number" && meta["trialMaxQuotes"] > 0
        ? meta["trialMaxQuotes"]
        : DEFAULT_MAX_TRIAL_QUOTES;

    const remaining = Math.max(0, trialMaxQuotes - trialQuotesUsed);
    const allowed = remaining > 0;

    return {
      allowed,
      trialQuotesUsed,
      trialMaxQuotes,
      remaining,
      isGuestTrial: true,
    };
  }

  /**
   * Registra a conclusão com sucesso de uma proposta no modo degustação,
   * incrementando a cota consumida e anexando o ID da proposta aos metadados.
   */
  async recordProposalCompleted(
    conversationId: string,
    proposalId: string
  ): Promise<GuestTrialStatus> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true },
    });

    const meta = (conversation?.metadata as Record<string, any>) || {};
    const currentUsed = typeof meta["trialQuotesUsed"] === "number" ? meta["trialQuotesUsed"] : 0;
    const nextUsed = currentUsed + 1;
    const existingIds = Array.isArray(meta["trialCompletedProposalIds"])
      ? meta["trialCompletedProposalIds"]
      : [];

    const updatedMetadata = {
      ...meta,
      trialQuotesUsed: nextUsed,
      trialCompletedProposalIds: [...existingIds, proposalId],
      isGuestTrial: true,
    };

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: updatedMetadata,
      },
    });

    return this.getGuestTrialStatus({ metadata: updatedMetadata });
  }
}
