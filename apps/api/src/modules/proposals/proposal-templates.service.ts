import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_PROPOSAL_TEMPLATE_CONFIG,
  PROPOSAL_TEMPLATE_SECTION_KEYS,
  type ProposalEditorDocument,
  type ProposalTemplateConfig,
  type ProposalTemplateSectionKey,
} from "@energivia/shared-types";
import type { CreateProposalTemplateDto } from "./dto/create-proposal-template.dto";
import type { UpdateProposalTemplateDto } from "./dto/update-proposal-template.dto";

const soft = { deletedAt: null as null };

function isTemplateSectionKey(value: string): value is ProposalTemplateSectionKey {
  return (PROPOSAL_TEMPLATE_SECTION_KEYS as readonly string[]).includes(value);
}

@Injectable()
export class ProposalTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.proposalTemplate.findMany({
      where: { tenantId, ...soft },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.proposalTemplate.findFirst({
      where: { id, tenantId, ...soft },
    });
    if (!template) throw new NotFoundException("Modelo de proposta não encontrado.");
    return template;
  }

  async create(tenantId: string, dto: CreateProposalTemplateDto) {
    const config = this.normalizeConfig(dto.config);
    const shouldSetDefault = dto.isDefault === true;

    return this.prisma.$transaction(async (tx) => {
      if (shouldSetDefault) {
        await tx.proposalTemplate.updateMany({
          where: { tenantId, isDefault: true, ...soft },
          data: { isDefault: false },
        });
      }

      const created = await tx.proposalTemplate.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          isDefault: shouldSetDefault,
          status: "PUBLISHED",
          config: config as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.proposalTemplateRevision.create({
        data: {
          proposalTemplateId: created.id,
          tenantId,
          version: created.version,
          status: "PUBLISHED",
          config: config as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });

      return created;
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProposalTemplateDto) {
    const current = await this.findOne(tenantId, id);
    const nextConfig = dto.config
      ? this.normalizeConfig(dto.config)
      : this.normalizeConfig(current.config as unknown as ProposalTemplateConfig);
    const nextStatus = dto.status ?? current.status;

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.proposalTemplate.updateMany({
          where: { tenantId, isDefault: true, ...soft },
          data: { isDefault: false },
        });
      }

      return tx.proposalTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault,
          status: nextStatus,
          config: nextConfig as unknown as Prisma.InputJsonValue,
          version: current.version,
        },
      });
    });
  }

  async duplicate(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);
    return this.prisma.$transaction(async (tx) => {
      const duplicated = await tx.proposalTemplate.create({
        data: {
          tenantId,
          name: `${template.name} (Copy)`,
          description: template.description,
          config: template.config as Prisma.InputJsonValue,
          status: "PUBLISHED",
          isDefault: false,
        },
      });
      await tx.proposalTemplateRevision.create({
        data: {
          proposalTemplateId: duplicated.id,
          tenantId,
          version: duplicated.version,
          status: "PUBLISHED",
          config: duplicated.config as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });
      return duplicated;
    });
  }

  async publish(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);
    const nextVersion = template.version + 1;
    const normalizedConfig = this.normalizeConfig(
      template.config as unknown as ProposalTemplateConfig
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.proposalTemplateRevision.create({
        data: {
          proposalTemplateId: template.id,
          tenantId,
          version: nextVersion,
          status: "PUBLISHED",
          config: normalizedConfig as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      });

      return tx.proposalTemplate.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          version: nextVersion,
          config: normalizedConfig as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.proposalTemplate.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  async listRevisions(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.proposalTemplateRevision.findMany({
      where: { tenantId, proposalTemplateId: id },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    });
  }

  async restoreRevision(tenantId: string, id: string, revisionId: string) {
    const template = await this.findOne(tenantId, id);
    const revision = await this.prisma.proposalTemplateRevision.findFirst({
      where: {
        id: revisionId,
        tenantId,
        proposalTemplateId: id,
      },
    });
    if (!revision) throw new NotFoundException("Revisão do modelo de proposta não encontrada.");

    const normalizedConfig = this.normalizeConfig(
      revision.config as unknown as ProposalTemplateConfig
    );

    return this.prisma.proposalTemplate.update({
      where: { id: template.id },
      data: {
        config: normalizedConfig as unknown as Prisma.InputJsonValue,
        status: "PUBLISHED",
      },
    });
  }

  private normalizeConfig(config?: ProposalTemplateConfig): ProposalTemplateConfig {
    const base = config ?? DEFAULT_PROPOSAL_TEMPLATE_CONFIG;
    const sectionsByKey = new Map(base.sections.map((section) => [section.key, section]));

    for (const section of base.sections) {
      if (!PROPOSAL_TEMPLATE_SECTION_KEYS.includes(section.key)) {
        throw new BadRequestException(`Chave de seção inválida: "${section.key}"`);
      }
    }

    const normalizedSections = PROPOSAL_TEMPLATE_SECTION_KEYS.map((key, index) => {
      const existing = sectionsByKey.get(key);
      if (existing) {
        return {
          ...existing,
          position: existing.position > 0 ? existing.position : index + 1,
        };
      }
      const fallback = DEFAULT_PROPOSAL_TEMPLATE_CONFIG.sections.find(
        (section) => section.key === key
      );
      return {
        key,
        enabled: true,
        position: index + 1,
        title: fallback?.title ?? key,
        content: fallback?.content,
      };
    });

    return {
      theme: {
        ...DEFAULT_PROPOSAL_TEMPLATE_CONFIG.theme,
        ...base.theme,
      },
      sections: normalizedSections.sort((a, b) => a.position - b.position),
      editor: this.normalizeEditorConfig(base.editor),
    };
  }

  private normalizeEditorConfig(
    editor: ProposalTemplateConfig["editor"]
  ): ProposalEditorDocument | undefined {
    if (!editor) return undefined;
    if (!Array.isArray(editor.sections)) {
      throw new BadRequestException('Payload do editor inválido: "sections" deve ser um array.');
    }

    const normalizedSections = editor.sections
      .filter(
        (section) =>
          typeof section?.id === "string" &&
          typeof section?.title === "string" &&
          typeof section?.type === "string"
      )
      .map((section, index) => {
        const rawType = String(section.type);
        const resolvedType = rawType === "savings" ? "economy_purchases" : rawType;
        const type: ProposalTemplateSectionKey | "custom" = isTemplateSectionKey(resolvedType)
          ? resolvedType
          : "custom";
        return {
          id: section.id,
          title: section.title,
          type,
          variant:
            rawType === "savings" && resolvedType === "economy_purchases"
              ? "default"
              : typeof section.variant === "string"
                ? section.variant
                : "default",
          order: typeof section.order === "number" ? section.order : index,
          content:
            section.content && typeof section.content === "object"
              ? (section.content as Record<string, unknown>)
              : {},
          style:
            section.style && typeof section.style === "object"
              ? (section.style as Record<string, unknown>)
              : {},
          visible: section.visible !== false,
        };
      });

    if (!normalizedSections.length) {
      throw new BadRequestException(
        "Payload do editor inválido: é necessária pelo menos uma seção."
      );
    }

    return {
      sections: normalizedSections,
      styles:
        editor.styles && typeof editor.styles === "object"
          ? (editor.styles as Record<string, unknown>)
          : {},
      variables:
        editor.variables && typeof editor.variables === "object"
          ? Object.fromEntries(
              Object.entries(editor.variables).filter(([, value]) => typeof value === "string")
            )
          : {},
    };
  }
}
