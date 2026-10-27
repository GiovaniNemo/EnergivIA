import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { ProposalsService } from "./proposals.service";

@Injectable()
export class ZapSignService {
  private readonly logger = new Logger(ZapSignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ProposalsService))
    private readonly proposalsService: ProposalsService
  ) {}

  async isAddonActiveForTenant(tenantId: string): Promise<{
    enabled: boolean;
    reason?: string;
    hasCustomToken?: boolean;
  }> {
    const [tenant, subscription] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, settings: true },
      }),
      this.prisma.subscription.findUnique({
        where: { tenantId },
      }),
    ]);

    const settings = (tenant?.settings as Record<string, unknown> | null) ?? {};
    const customToken =
      typeof settings["zapsignApiToken"] === "string" && settings["zapsignApiToken"].trim()
        ? settings["zapsignApiToken"].trim()
        : null;

    if (customToken) {
      return { enabled: true, hasCustomToken: true };
    }

    if (settings["specialAccessActive"] === true) {
      return { enabled: true };
    }

    if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
      const isLifetime =
        subscription.stripeSubscriptionId === "sub_lifetime_admin_v1t4l1c10" ||
        (subscription.currentPeriodEnd &&
          new Date(subscription.currentPeriodEnd).getFullYear() >= 2090);

      if (subscription.zapsignAddonActive || isLifetime) {
        return { enabled: true };
      }
    }

    return {
      enabled: false,
      reason:
        "O módulo de Assinatura Digital (+ R$ 89,90/mês) não está ativo na sua assinatura. Ative o módulo em Meus Planos para enviar contratos com validade jurídica.",
    };
  }

  async createSignatureDocument(
    tenantId: string,
    proposalId: string,
    signerOverride?: { name?: string; email?: string; phone?: string; forceRecreate?: boolean }
  ) {
    const access = await this.isAddonActiveForTenant(tenantId);
    if (!access.enabled) {
      throw new ForbiddenException(access.reason);
    }

    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId, deletedAt: null },
      include: {
        deal: { include: { lead: true } },
        tenant: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada.");
    }

    if (
      !signerOverride?.forceRecreate &&
      proposal.zapsignSignUrl &&
      proposal.zapsignStatus &&
      proposal.zapsignStatus !== "REFUSED"
    ) {
      return {
        docToken: proposal.zapsignDocToken,
        signerToken: proposal.zapsignSignerToken,
        signUrl: proposal.zapsignSignUrl,
        status: proposal.zapsignStatus,
      };
    }

    const settings = (proposal.tenant?.settings as Record<string, unknown> | null) ?? {};
    const customToken =
      typeof settings["zapsignApiToken"] === "string" && settings["zapsignApiToken"].trim()
        ? settings["zapsignApiToken"].trim()
        : null;
    const apiToken = customToken || this.configService.get<string>("ZAPSIGN_API_TOKEN");

    if (!apiToken) {
      throw new BadRequestException(
        "Token de API do ZapSign (ZAPSIGN_API_TOKEN) não configurado no servidor."
      );
    }

    const isSandbox =
      settings["zapsignSandbox"] === true ||
      this.configService.get<string>("ZAPSIGN_SANDBOX") === "true";

    const baseUrl = isSandbox ? "https://sandbox.api.zapsign.com.br" : "https://api.zapsign.com.br";

    const pdfBuffer = await this.proposalsService.generatePdf(proposal.id);
    const base64Pdf = pdfBuffer.toString("base64");

    const lead = proposal.deal?.lead;
    const signerName = signerOverride?.name?.trim() || lead?.name || "Cliente";
    const signerEmail = signerOverride?.email?.trim() || lead?.email || "";
    const rawPhone = (signerOverride?.phone || lead?.whatsapp || "").replace(/\D/g, "");
    const cleanPhone =
      rawPhone.startsWith("55") && rawPhone.length > 11 ? rawPhone.slice(2) : rawPhone;

    const docName = proposal.proposalNumber
      ? `Proposta Comercial #${proposal.proposalNumber} - ${proposal.title}`
      : `Proposta Comercial - ${proposal.title}`;

    const response = await fetch(`${baseUrl}/api/v1/docs/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        name: docName,
        base64_pdf: base64Pdf,
        lang: "pt-br",
        external_id: proposal.id,
        signers: [
          {
            name: signerName,
            ...(signerEmail ? { email: signerEmail } : {}),
            ...(cleanPhone
              ? {
                  phone_country: "55",
                  phone_number: cleanPhone,
                }
              : {}),
            auth_mode: "assinaturaTela",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      this.logger.error(`Erro na API ZapSign (${response.status}): ${errorText}`);
      throw new BadRequestException(
        `Não foi possível gerar o documento no ZapSign (${response.status}). Verifique a configuração da chave API.`
      );
    }

    const data = (await response.json()) as {
      token?: string;
      status?: string;
      signers?: Array<{ token?: string; sign_url?: string }>;
    };

    const docToken = data.token || "";
    const firstSigner = data.signers?.[0];
    const signerToken = firstSigner?.token || "";
    const signUrl = firstSigner?.sign_url || "";

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        zapsignDocToken: docToken || null,
        zapsignSignerToken: signerToken || null,
        zapsignSignUrl: signUrl || null,
        zapsignStatus: "PENDING",
      },
    });

    return {
      docToken,
      signerToken,
      signUrl,
      status: "PENDING",
    };
  }

  async handleWebhook(payload: Record<string, unknown>) {
    const eventType = String(payload["event_type"] || "").toLowerCase();
    const docToken = typeof payload["token"] === "string" ? payload["token"] : undefined;
    const externalId =
      typeof payload["external_id"] === "string" ? payload["external_id"] : undefined;
    const signedFile =
      typeof payload["signed_file"] === "string" ? payload["signed_file"] : undefined;

    if (!docToken && !externalId) {
      return { processed: false, reason: "missing_identifiers" };
    }

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        OR: [
          ...(docToken ? [{ zapsignDocToken: docToken }] : []),
          ...(externalId ? [{ id: externalId }] : []),
        ],
      },
    });

    if (!proposal) {
      return { processed: false, reason: "proposal_not_found" };
    }

    const signers = Array.isArray(payload["signers"])
      ? (payload["signers"] as Array<Record<string, unknown>>)
      : [];
    const firstSignerName =
      typeof signers[0]?.["name"] === "string" ? String(signers[0]["name"]) : undefined;

    if (eventType === "doc_signed" || String(payload["status"] || "").toLowerCase() === "signed") {
      const now = new Date();
      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          zapsignStatus: "SIGNED",
          zapsignSignedPdfUrl: signedFile || proposal.zapsignSignedPdfUrl,
          zapsignSignedAt: now,
          status: "ACCEPTED",
          clientDecision: "ACCEPT",
          clientDecisionAt: now,
          ...(firstSignerName ? { clientSignatureName: firstSignerName } : {}),
        },
      });
      return { processed: true, status: "SIGNED", proposalId: proposal.id };
    }

    if (eventType === "doc_refused") {
      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          zapsignStatus: "REFUSED",
        },
      });
      return { processed: true, status: "REFUSED", proposalId: proposal.id };
    }

    return { processed: false, reason: "unhandled_event" };
  }
}
