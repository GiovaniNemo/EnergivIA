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

  async createFastSimulation(data: { tenantId: string; name: string; whatsapp: string; monthlyConsumptionKwh: number; email?: string; source?: string }) {
    if (!data.tenantId || !data.monthlyConsumptionKwh) {
      throw new BadRequestException("Faltam campos (tenantId ou monthlyConsumptionKwh).");
    }

    // 1. Cria ou atualiza o Lead
    const lead = await this.prisma.lead.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email,
        source: data.source || "Chatbase Bot (Simulação)",
      },
    });

    // 2. Cria a simulação rápida (cálculo básico)
    const kwhPerKwMonth = 150; // Média nacional de geração
    const recommendedPowerKw = Math.ceil((data.monthlyConsumptionKwh / kwhPerKwMonth) * 1.1 * 10) / 10;
    const panelW = 550;
    const panelCount = Math.ceil((recommendedPowerKw * 1000) / panelW);
    const estimatedValue = recommendedPowerKw * 3500; // Custo médio de R$ 3500 por kWp instalado

    // 3. Registra um negócio (Deal) no funil para a equipe de vendas não perder de vista
    await this.prisma.deal.create({
      data: {
        tenantId: data.tenantId,
        leadId: lead.id,
        title: `Simulação Chatbot - ${data.name}`,
        value: estimatedValue,
        probability: 50,
      }
    });

    return {
      success: true,
      message: `Simulação gerada com sucesso! O sistema recomendado é de ${recommendedPowerKw} kWp, utilizando ${panelCount} painéis solares. O investimento estimado é de aproximadamente R$ ${estimatedValue.toLocaleString('pt-BR')}. Um consultor entrará em contato para enviar a proposta oficial em PDF.`,
      systemDetails: {
        powerKw: recommendedPowerKw,
        panels: panelCount,
        estimatedValueBrl: estimatedValue
      }
    };
  }
}
