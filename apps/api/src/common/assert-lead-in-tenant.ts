import { NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { softDeleteWhere } from "../prisma/soft-delete";

export async function assertLeadInTenant(
  prisma: PrismaService,
  tenantId: string,
  leadId: string
): Promise<void> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId, ...softDeleteWhere },
    select: { id: true },
  });
  if (!lead) throw new NotFoundException("Lead não encontrado.");
}
