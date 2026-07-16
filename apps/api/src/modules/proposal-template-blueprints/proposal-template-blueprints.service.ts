import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProposalTemplateBlueprintDto } from "./dto/create-proposal-template-blueprint.dto";
import { UpdateProposalTemplateBlueprintDto } from "./dto/update-proposal-template-blueprint.dto";

function assertValidEditorDocument(document: unknown): void {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new BadRequestException("O documento deve ser um objeto JSON.");
  }
  const obj = document as Record<string, unknown>;
  if (!Array.isArray(obj["sections"])) {
    throw new BadRequestException("O campo document.sections deve ser um array.");
  }
  if (!obj["styles"] || typeof obj["styles"] !== "object" || Array.isArray(obj["styles"])) {
    throw new BadRequestException("O campo document.styles deve ser um objeto.");
  }
  if (
    !obj["variables"] ||
    typeof obj["variables"] !== "object" ||
    Array.isArray(obj["variables"])
  ) {
    throw new BadRequestException("O campo document.variables deve ser um objeto.");
  }
}

export type BlueprintSummary = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
};

export type BlueprintDetail = BlueprintSummary & { document: Prisma.JsonValue };

export type BlueprintAdminRow = BlueprintSummary & {
  slug: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BlueprintAdminDetail = BlueprintAdminRow & { document: Prisma.JsonValue };

@Injectable()
export class ProposalTemplateBlueprintsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished(): Promise<BlueprintSummary[]> {
    return this.prisma.proposalTemplateBlueprint.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailUrl: true,
      },
    });
  }

  async findPublishedById(id: string): Promise<BlueprintDetail> {
    const row = await this.prisma.proposalTemplateBlueprint.findFirst({
      where: { id, published: true },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailUrl: true,
        document: true,
      },
    });
    if (!row) {
      throw new NotFoundException("Modelo blueprint não encontrado ou não publicado.");
    }
    return row;
  }

  adminList(): Promise<BlueprintAdminRow[]> {
    return this.prisma.proposalTemplateBlueprint.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        thumbnailUrl: true,
        published: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async adminFindOne(id: string): Promise<BlueprintAdminDetail> {
    const row = await this.prisma.proposalTemplateBlueprint.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException("Modelo blueprint não encontrado.");
    }
    return row;
  }

  async create(dto: CreateProposalTemplateBlueprintDto): Promise<BlueprintAdminDetail> {
    assertValidEditorDocument(dto.document);
    try {
      return await this.prisma.proposalTemplateBlueprint.create({
        data: {
          name: dto.name,
          slug: dto.slug?.trim() ? dto.slug.trim() : null,
          description: dto.description ?? null,
          thumbnailUrl: dto.thumbnailUrl ?? null,
          document: dto.document as Prisma.InputJsonValue,
          published: dto.published ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Este identificador (slug) já está em uso.");
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateProposalTemplateBlueprintDto): Promise<BlueprintAdminDetail> {
    if (dto.document !== undefined) {
      assertValidEditorDocument(dto.document);
    }
    try {
      return await this.prisma.proposalTemplateBlueprint.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug?.trim() ? dto.slug.trim() : null } : {}),
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
          ...(dto.thumbnailUrl !== undefined ? { thumbnailUrl: dto.thumbnailUrl ?? null } : {}),
          ...(dto.document !== undefined
            ? { document: dto.document as Prisma.InputJsonValue }
            : {}),
          ...(dto.published !== undefined ? { published: dto.published } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          throw new NotFoundException("Modelo blueprint não encontrado.");
        }
        if (e.code === "P2002") {
          throw new ConflictException("Este identificador (slug) já está em uso.");
        }
      }
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.proposalTemplateBlueprint.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("Modelo blueprint não encontrado.");
      }
      throw e;
    }
  }
}
