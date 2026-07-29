import { Injectable, ServiceUnavailableException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ChatbaseService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  getIdentityHash(userId: string): { userId: string; userHash: string } {
    const secret = this.config.get<string>("CHATBASE_SECRET_KEY");
    if (!secret) {
      throw new ServiceUnavailableException(
        "Chatbase não está configurado (CHATBASE_SECRET_KEY ausente)."
      );
    }
    const userHash = createHmac("sha256", secret).update(userId).digest("hex");
    return { userId, userHash };
  }

  async createLead(data: { tenantId: string; name: string; whatsapp: string; email?: string; source?: string }) {
    if (!data.tenantId || !data.name || !data.whatsapp) {
      throw new BadRequestException("Faltam campos obrigatórios (tenantId, name, whatsapp).");
    }

    const lead = await this.prisma.lead.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email,
        source: data.source || "Chatbase Bot",
      },
    });

    // Registra a atividade do lead
    await this.prisma.leadActivityLog.create({
      data: {
        leadId: lead.id,
        kind: "LEAD_CREATED",
        description: "Lead criado através do chatbot.",
      },
    });

    return {
      success: true,
      message: "Lead criado com sucesso",
      leadId: lead.id,
    };
  }
}
