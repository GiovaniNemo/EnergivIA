import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface PairingCodeInfo {
  code: string;
  organizationId: string;
  organizationName: string;
  userId?: string;
  expiresAt: number;
}

@Injectable()
export class WhatsappPairingService {
  private readonly logger = new Logger(WhatsappPairingService.name);
  private static pairingCodes = new Map<string, PairingCodeInfo>();

  constructor(private readonly prisma: PrismaService) {}

  async generatePairingCode(organizationId: string, userId: string) {
    const org = await this.prisma.tenant.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!org) {
      throw new NotFoundException("Organização não encontrada.");
    }

    // Limpa códigos expirados
    const now = Date.now();
    for (const [code, info] of WhatsappPairingService.pairingCodes.entries()) {
      if (info.expiresAt < now) {
        WhatsappPairingService.pairingCodes.delete(code);
      }
    }

    // Gera um código de 6 dígitos único
    let code = "";
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (WhatsappPairingService.pairingCodes.has(code));

    const expiresAt = now + 15 * 60 * 1000; // 15 minutos

    const info: PairingCodeInfo = {
      code,
      organizationId,
      organizationName: org.name,
      userId,
      expiresAt,
    };

    WhatsappPairingService.pairingCodes.set(code, info);
    this.logger.log(
      `Código de pareamento gerado: ${code} para organização ${org.name} (${organizationId})`
    );

    const botNumber = "554491585309";
    const formattedMessage = `CONECTAR ${code}`;
    const whatsappUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(formattedMessage)}`;

    return {
      code,
      formattedMessage,
      expiresAt,
      whatsappUrl,
      botNumber: "+55 44 9158-5309",
    };
  }

  getPairingInfo(code: string): PairingCodeInfo | null {
    const cleanCode = code.replace(/\D/g, "");
    const info = WhatsappPairingService.pairingCodes.get(cleanCode);
    if (!info) return null;
    if (info.expiresAt < Date.now()) {
      WhatsappPairingService.pairingCodes.delete(cleanCode);
      return null;
    }
    return info;
  }

  consumePairingCode(code: string): PairingCodeInfo | null {
    const info = this.getPairingInfo(code);
    if (info) {
      WhatsappPairingService.pairingCodes.delete(info.code);
    }
    return info;
  }
}
