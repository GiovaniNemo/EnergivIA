import { Injectable, ServiceUnavailableException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  FinancialSimulationService,
  type SimulationInput,
} from "../financial-simulation/financial-simulation.service";
import { ProposalsService } from "../proposals/proposals.service";

@Injectable()
export class ChatbaseService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly financialSimulation: FinancialSimulationService,
    private readonly proposalsService: ProposalsService
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

  async createLead(data: {
    tenantId: string;
    name: string;
    whatsapp: string;
    email?: string;
    source?: string;
  }) {
    if (!data.tenantId || !data.name || !data.whatsapp) {
      throw new BadRequestException("Faltam campos obrigatórios (tenantId, name, whatsapp).");
    }

    const nameStr = String(data.name || "");
    const whatsappStr = String(data.whatsapp || "");

    if (nameStr.includes("{name}") || whatsappStr.includes("{whatsapp}")) {
      return {
        success: false,
        message:
          "Por favor, preencha os dados reais do cliente em vez de usar variáveis como {name}.",
      };
    }
    if (data.email && String(data.email).includes("{email}")) {
      data.email = undefined;
    }

    // Procura por um lead existente com o mesmo whatsapp
    let lead = await this.prisma.lead.findFirst({
      where: { tenantId: data.tenantId, whatsapp: whatsappStr },
    });

    if (lead) {
      // Atualiza o lead existente
      lead = await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: nameStr && nameStr !== lead.name ? nameStr : undefined,
          email: data.email && data.email !== lead.email ? data.email : undefined,
          source: data.source || lead.source,
        },
      });
    } else {
      // Cria novo lead
      lead = await this.prisma.lead.create({
        data: {
          tenantId: data.tenantId,
          name: nameStr || "Cliente sem nome",
          whatsapp: whatsappStr,
          email: data.email,
          source: data.source || "Chatbase Bot",
        },
      });

      // Registra a atividade apenas para novos leads
      await this.prisma.leadActivityLog.create({
        data: {
          tenantId: lead.tenantId,
          leadId: lead.id,
          kind: "LEAD_CREATED",
          label: "Lead criado através do chatbot.",
        },
      });
    }

    return {
      success: true,
      message: "Lead registrado com sucesso",
      leadId: lead.id,
    };
  }

  async createFastSimulation(data: {
    tenantId: string;
    name: string;
    whatsapp: string;
    monthlyConsumptionKwh: number;
    email?: string;
    source?: string;
  }) {
    // Remove caracteres não numéricos (ex: "300 kWh" -> "300")
    const rawConsumption = String(data.monthlyConsumptionKwh)
      .replace(/[^\d.,]/g, "")
      .replace(",", ".");
    const consumption = parseFloat(rawConsumption);

    if (!data.tenantId || !consumption || isNaN(consumption)) {
      throw new BadRequestException("Faltam campos (tenantId ou monthlyConsumptionKwh válido).");
    }

    const nameStr = String(data.name || "");
    const whatsappStr = String(data.whatsapp || "");

    if (nameStr.includes("{name}") || whatsappStr.includes("{whatsapp}")) {
      return {
        success: false,
        message:
          "Por favor, preencha os dados reais do cliente em vez de usar variáveis como {name}.",
      };
    }
    if (data.email && String(data.email).includes("{email}")) {
      data.email = undefined;
    }

    // 1. Cria ou atualiza o Lead
    let lead = await this.prisma.lead.findFirst({
      where: { tenantId: data.tenantId, whatsapp: whatsappStr },
    });

    if (lead) {
      lead = await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: nameStr && nameStr !== lead.name ? nameStr : undefined,
          email: data.email && data.email !== lead.email ? data.email : undefined,
          source: data.source || "Chatbase Bot (Simulação)",
        },
      });
    } else {
      lead = await this.prisma.lead.create({
        data: {
          tenantId: data.tenantId,
          name: nameStr || "Cliente sem nome",
          whatsapp: whatsappStr,
          email: data.email,
          source: data.source || "Chatbase Bot (Simulação)",
        },
      });
    }

    // 2. Calcula as grandezas básicas (como fazia antes para criar o Deal)
    const kwhPerKwMonth = 150;
    const recommendedPowerKw = Math.ceil((consumption / kwhPerKwMonth) * 1.1 * 10) / 10;
    const panelW = 550;
    const panelCount = Math.ceil((recommendedPowerKw * 1000) / panelW);
    const estimatedValue = recommendedPowerKw * 3500;

    // 3. Registra o Negócio (Deal) no funil
    const deal = await this.prisma.deal.create({
      data: {
        tenantId: data.tenantId,
        leadId: lead.id,
        title: `Simulação Chatbot - ${nameStr || "Cliente"}`,
        value: estimatedValue,
      },
    });

    // 4. Cria a Simulação Financeira formal (FinancialSimulationService já usa o SizingEngine por baixo)
    const simInput: SimulationInput = {
      systemSizeKw: recommendedPowerKw,
      investmentAmount: estimatedValue,
      financingType: "CASH", // Padrão
      sizing: {
        monthlyConsumptionKwh: consumption,
      },
    };
    const simulation = await this.financialSimulation.create(
      data.tenantId,
      lead.id,
      simInput,
      "Simulação Automática (Chatbase)"
    );

    // 5. Cria a Proposta vinculada ao Deal e Simulação
    // Utiliza data de validade de 7 dias
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const proposal = await this.proposalsService.create(data.tenantId, {
      dealId: deal.id,
      simulationId: simulation.id,
      title: "Proposta Comercial Automática",
      validUntil,
    });

    // Monta o link da proposta pública
    // Tenta pegar WEB_URL das vars de ambiente, ou usa o default de prod
    const webUrl = process.env["WEB_URL"] || "https://www.energivia.com.br";
    const token = proposal.publicToken || proposal.id;
    const proposalLink = `${webUrl}/proposta/${token}`;

    return {
      success: true,
      message: `Simulação gerada com sucesso! O sistema recomendado é de ${recommendedPowerKw} kWp, utilizando ${panelCount} painéis solares. O investimento estimado é de aproximadamente R$ ${estimatedValue.toLocaleString("pt-BR")}. Veja a proposta comercial completa e detalhada no link: ${proposalLink}`,
      systemDetails: {
        powerKw: recommendedPowerKw,
        panels: panelCount,
        estimatedValueBrl: estimatedValue,
      },
      proposalLink,
      proposalId: proposal.id,
    };
  }
}
