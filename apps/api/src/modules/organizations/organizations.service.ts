import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrgRole, InvitationStatus, Prisma } from "@prisma/client";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { CreateWhatsappInboundPhoneDto } from "./dto/create-whatsapp-inbound-phone.dto";
import { EmailService } from "../../common/email/email.service";

import { softDeleteWhere as soft } from "../../prisma/soft-delete";

function normalizeInboundPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length < 10) {
    throw new BadRequestException("Telefone inválido: informe DDD + número (mínimo 10 dígitos).");
  }
  if (digits.startsWith("55")) {
    if (digits.length < 12 || digits.length > 13) {
      throw new BadRequestException(
        "Telefone inválido: com código 55 use DDD + número (12 ou 13 dígitos no total)."
      );
    }
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) {
    throw new BadRequestException(
      "Telefone inválido: após o DDD são 8 ou 9 dígitos (móvel com 9 na frente)."
    );
  }
  return digits;
}

function brNationalMobileNineVariants(national: string): string[] {
  const d = national.replace(/\D/g, "");
  const out = new Set<string>();
  if (d.length < 10 || d.length > 11) {
    if (d.length >= 10) out.add(d);
    return [...out];
  }
  out.add(d);
  if (d.length === 10) {
    out.add(`${d.slice(0, 2)}9${d.slice(2)}`);
  }
  if (d.length === 11 && d.charAt(2) === "9") {
    out.add(`${d.slice(0, 2)}${d.slice(3)}`);
  }
  return [...out];
}

function expandInboundPhoneLookupCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return [];

  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  const nationals = brNationalMobileNineVariants(national);
  const out = new Set<string>();

  for (const n of nationals) {
    if (n.length >= 10 && n.length <= 11) {
      out.add(n);
      out.add(`55${n}`);
    }
  }

  if (digits.startsWith("55") && digits.length >= 12) {
    out.add(digits);
    const withNineVariants = brNationalMobileNineVariants(digits.slice(2));
    for (const n of withNineVariants) {
      out.add(`55${n}`);
    }
  }

  return [...out];
}

function cleanCnpj(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  return digits || undefined;
}

function buildSlugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "organizacao";
}

function extractCnpj(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") return null;
  const raw = (settings as Record<string, unknown>)["cnpj"];
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function readOptionalSetting(settings: unknown, key: string): string | null {
  if (!settings || typeof settings !== "object") return null;
  const raw = (settings as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function buildTemplateSettings(dto: {
  templateBusinessSegment?: string;
  templateRegion?: string;
  templateValueProposition?: string;
  templateTone?: string;
}): Prisma.InputJsonObject {
  return {
    templateBusinessSegment: dto.templateBusinessSegment?.trim() || null,
    templateRegion: dto.templateRegion?.trim() || null,
    templateValueProposition: dto.templateValueProposition?.trim() || null,
    templateTone: dto.templateTone?.trim() || null,
  };
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  private async generateUniqueOrganizationSlug(name: string): Promise<string> {
    const base = buildSlugFromName(name);
    let candidate = base;
    let i = 2;
    while (true) {
      const exists = await this.prisma.tenant.findFirst({
        where: { slug: candidate, ...soft },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${base}-${i}`;
      i += 1;
    }
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = await this.generateUniqueOrganizationSlug(dto.name);
    const templateSettings = buildTemplateSettings(dto);
    const org = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        logoUrl: dto.logoUrl ?? undefined,
        settings: {
          ...(dto.cnpj ? { cnpj: cleanCnpj(dto.cnpj) } : {}),
          ...templateSettings,
        },
        createdById: userId,
      },
    });
    await this.prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId,
        role: OrgRole.OWNER,
        status: InvitationStatus.ACCEPTED,
        joinedAt: new Date(),
      },
    });
    return {
      ...org,
      cnpj: extractCnpj(org.settings),
      templateBusinessSegment: readOptionalSetting(org.settings, "templateBusinessSegment"),
      templateRegion: readOptionalSetting(org.settings, "templateRegion"),
      templateValueProposition: readOptionalSetting(org.settings, "templateValueProposition"),
      templateTone: readOptionalSetting(org.settings, "templateTone"),
    };
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        status: InvitationStatus.ACCEPTED,
        organization: { deletedAt: null },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            settings: true,
            createdAt: true,
          },
        },
      },
      orderBy: { invitedAt: "asc" },
    });
    return memberships.map((m) => {
      const organization = m.organization!;
      return {
        ...organization,
        cnpj: extractCnpj(organization.settings),
        templateBusinessSegment: readOptionalSetting(
          organization.settings,
          "templateBusinessSegment"
        ),
        templateRegion: readOptionalSetting(organization.settings, "templateRegion"),
        templateValueProposition: readOptionalSetting(
          organization.settings,
          "templateValueProposition"
        ),
        templateTone: readOptionalSetting(organization.settings, "templateTone"),
        role: m.role,
        membershipId: m.id,
      };
    });
  }

  async findOne(id: string, userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId,
        status: InvitationStatus.ACCEPTED,
      },
    });
    if (!membership) throw new NotFoundException("Organização não encontrada");
    const org = await this.prisma.tenant.findFirst({
      where: { id, ...soft },
    });
    if (!org) throw new NotFoundException("Organização não encontrada");
    return {
      ...org,
      cnpj: extractCnpj(org.settings),
      templateBusinessSegment: readOptionalSetting(org.settings, "templateBusinessSegment"),
      templateRegion: readOptionalSetting(org.settings, "templateRegion"),
      templateValueProposition: readOptionalSetting(org.settings, "templateValueProposition"),
      templateTone: readOptionalSetting(org.settings, "templateTone"),
      role: membership.role,
    };
  }

  async findOrganizationIdByInboundWhatsappPhone(rawPhone: string): Promise<string | null> {
    const candidates = expandInboundPhoneLookupCandidates(rawPhone);
    if (!candidates.length) return null;
    const row = await this.prisma.tenantWhatsappInboundPhone.findFirst({
      where: { phoneDigits: { in: candidates } },
      select: { organizationId: true },
    });
    return row?.organizationId ?? null;
  }

  async listWhatsappInboundPhones(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);
    const rows = await this.prisma.tenantWhatsappInboundPhone.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        phoneDigits: true,
        label: true,
        createdAt: true,
      },
    });
    return rows;
  }

  async addWhatsappInboundPhone(
    organizationId: string,
    userId: string,
    dto: CreateWhatsappInboundPhoneDto
  ) {
    await this.requireRole(organizationId, userId, [OrgRole.OWNER, OrgRole.ADMIN]);
    const phoneDigits = normalizeInboundPhoneDigits(dto.phone);
    const dedupeKeys = expandInboundPhoneLookupCandidates(phoneDigits);

    const existing = await this.prisma.tenantWhatsappInboundPhone.findFirst({
      where: { phoneDigits: { in: dedupeKeys } },
      select: { id: true, organizationId: true },
    });
    if (existing) {
      if (existing.organizationId === organizationId) {
        throw new ConflictException("Este número já está cadastrado nesta organização.");
      }
      throw new ConflictException(
        "Este número já está cadastrado em outra organização e não pode ser reutilizado."
      );
    }

    return this.prisma.tenantWhatsappInboundPhone.create({
      data: {
        organizationId,
        phoneDigits,
        label: dto.label?.trim() || null,
      },
      select: { id: true, phoneDigits: true, label: true, createdAt: true },
    });
  }

  async removeWhatsappInboundPhone(organizationId: string, phoneId: string, userId: string) {
    await this.requireRole(organizationId, userId, [OrgRole.OWNER, OrgRole.ADMIN]);
    const row = await this.prisma.tenantWhatsappInboundPhone.findFirst({
      where: { id: phoneId, organizationId },
    });
    if (!row) throw new NotFoundException("Telefone não encontrado nesta organização.");
    await this.prisma.tenantWhatsappInboundPhone.delete({ where: { id: phoneId } });
    return { success: true };
  }

  async update(id: string, userId: string, dto: UpdateOrganizationDto) {
    await this.requireRole(id, userId, [OrgRole.OWNER, OrgRole.ADMIN]);
    const current = await this.prisma.tenant.findUnique({
      where: { id },
      select: { settings: true },
    });
    const currentSettings =
      current?.settings && typeof current.settings === "object"
        ? (current.settings as Record<string, unknown>)
        : {};
    const nextSettings: Prisma.InputJsonObject = {
      ...(currentSettings as Prisma.InputJsonObject),
      ...(dto.cnpj !== undefined && { cnpj: cleanCnpj(dto.cnpj) ?? null }),
      ...(dto.templateBusinessSegment !== undefined && {
        templateBusinessSegment: dto.templateBusinessSegment.trim() || null,
      }),
      ...(dto.templateRegion !== undefined && {
        templateRegion: dto.templateRegion.trim() || null,
      }),
      ...(dto.templateValueProposition !== undefined && {
        templateValueProposition: dto.templateValueProposition.trim() || null,
      }),
      ...(dto.templateTone !== undefined && {
        templateTone: dto.templateTone.trim() || null,
      }),
    };

    const org = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...((dto.cnpj !== undefined ||
          dto.templateBusinessSegment !== undefined ||
          dto.templateRegion !== undefined ||
          dto.templateValueProposition !== undefined ||
          dto.templateTone !== undefined) && { settings: nextSettings }),
      },
    });
    return {
      ...org,
      cnpj: extractCnpj(org.settings),
      templateBusinessSegment: readOptionalSetting(org.settings, "templateBusinessSegment"),
      templateRegion: readOptionalSetting(org.settings, "templateRegion"),
      templateValueProposition: readOptionalSetting(org.settings, "templateValueProposition"),
      templateTone: readOptionalSetting(org.settings, "templateTone"),
    };
  }

  async getMembers(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: { in: [InvitationStatus.ACCEPTED, InvitationStatus.PENDING] },
      },
      include: {
        user: {
          where: soft,
          select: { id: true, email: true, name: true, picture: true },
        },
        invitedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { invitedAt: "asc" },
    });
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user?.email ?? m.email,
      name: m.user?.name ?? null,
      picture: m.user?.picture ?? null,
      role: m.role,
      status: m.status,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
      invitedBy: m.invitedBy?.name ?? null,
    }));
  }

  async invite(organizationId: string, inviterId: string, dto: InviteMemberDto) {
    await this.requireRole(organizationId, inviterId, [OrgRole.OWNER, OrgRole.ADMIN]);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        OR: [
          { email: normalizedEmail },
          { user: { email: { equals: normalizedEmail, mode: "insensitive" } } },
        ],
      },
    });
    if (existing) {
      if (existing.status === InvitationStatus.ACCEPTED) {
        throw new ConflictException("Usuário já é membro desta organização");
      }
      throw new ConflictException("Já existe um convite pendente para este e-mail");
    }

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" }, ...soft },
    });

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user?.id,
        email: user ? undefined : normalizedEmail,
        role: dto.role,
        invitedById: inviterId,
        status: user ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING,
        joinedAt: user ? new Date() : undefined,
      },
    });

    if (!user) {
      const organization = await this.prisma.tenant.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { name: true, email: true },
      });
      if (organization) {
        await this.emailService.sendOrganizationInviteEmail({
          toEmail: normalizedEmail,
          organizationName: organization.name,
          inviterName: inviter?.name ?? inviter?.email ?? "Equipe Energivia",
        });
      }
    }

    return member;
  }

  async updateMember(
    organizationId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberDto
  ) {
    await this.requireRole(organizationId, userId, [OrgRole.OWNER, OrgRole.ADMIN]);
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw new NotFoundException("Membro não encontrado");
    if (member.role === OrgRole.OWNER) {
      throw new ForbiddenException("Não é possível alterar a função do proprietário");
    }
    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
    return updated;
  }

  async removeMember(organizationId: string, memberId: string, userId: string) {
    const myMembership = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId, status: InvitationStatus.ACCEPTED },
    });
    if (!myMembership) throw new NotFoundException("Organização não encontrada");
    const isOwner = myMembership.role === OrgRole.OWNER;

    const target = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!target) throw new NotFoundException("Membro não encontrado");

    if (target.userId === userId) {
      await this.prisma.organizationMember.delete({ where: { id: memberId } });
      return { success: true };
    }
    if (target.role === OrgRole.OWNER) {
      throw new ForbiddenException("Não é possível remover o proprietário");
    }
    if (!isOwner && myMembership.role !== OrgRole.ADMIN) {
      throw new ForbiddenException("Sem permissão para remover membros");
    }
    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  private async requireMembership(organizationId: string, userId: string) {
    const m = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        status: InvitationStatus.ACCEPTED,
      },
    });
    if (!m) throw new NotFoundException("Organização não encontrada");
  }

  private async requireRole(organizationId: string, userId: string, allowed: OrgRole[]) {
    const m = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        status: InvitationStatus.ACCEPTED,
      },
    });
    if (!m) throw new NotFoundException("Organização não encontrada");
    if (!allowed.includes(m.role)) {
      throw new ForbiddenException("Sem permissão para esta ação");
    }
  }
}
