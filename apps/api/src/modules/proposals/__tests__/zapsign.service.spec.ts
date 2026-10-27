import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZapSignService } from "../zapsign.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ProposalsService } from "../proposals.service";

describe("ZapSignService", () => {
  let service: ZapSignService;
  let prismaMock: {
    tenant: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    subscription: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    proposal: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let proposalsServiceMock: {
    generatePdf: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const configService = {
      get: vi.fn((key: string) => {
        if (key === "ZAPSIGN_API_TOKEN") return "zapsign_master_token_123";
        if (key === "ZAPSIGN_SANDBOX") return "true";
        return undefined;
      }),
    } as unknown as ConfigService;

    prismaMock = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "tenant_1",
          name: "Solar Integradora",
          settings: {},
        }),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sub_1",
          tenantId: "tenant_1",
          status: "active",
          zapsignAddonActive: true,
          stripeSubscriptionId: "sub_stripe_123",
          currentPeriodEnd: new Date(Date.now() + 86400000),
        }),
      },
      proposal: {
        findFirst: vi.fn().mockResolvedValue({
          id: "prop_1",
          tenantId: "tenant_1",
          title: "Usina Solar 10 kWp",
          proposalNumber: 42,
          deal: {
            lead: {
              name: "João Cliente",
              email: "joao@cliente.com",
              whatsapp: "11999998888",
            },
          },
          tenant: {
            name: "Solar Integradora",
          },
        }),
        update: vi.fn().mockImplementation(async ({ data }) => ({
          id: "prop_1",
          ...data,
        })),
      },
    };

    proposalsServiceMock = {
      generatePdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock pdf")),
    };

    service = new ZapSignService(
      prismaMock as unknown as PrismaService,
      configService,
      proposalsServiceMock as unknown as ProposalsService
    );
  });

  it("bloqueia criação de documento se o Add-on ZapSign não estiver ativo na assinatura", async () => {
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      id: "sub_1",
      tenantId: "tenant_1",
      status: "active",
      zapsignAddonActive: false,
      stripeSubscriptionId: "sub_stripe_123",
      currentPeriodEnd: new Date(Date.now() + 86400000),
    });

    await expect(service.createSignatureDocument("tenant_1", "prop_1")).rejects.toThrow(
      ForbiddenException
    );
  });

  it("envia o PDF da proposta para a API do ZapSign e salva sign_url quando o Add-on está ativo", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "doc_tok_999",
        status: "pending",
        signers: [
          {
            token: "signer_tok_888",
            sign_url: "https://sandbox.app.zapsign.com.br/verificar/signer_tok_888",
          },
        ],
      }),
    } as Response);

    const result = await service.createSignatureDocument("tenant_1", "prop_1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      docToken: "doc_tok_999",
      signerToken: "signer_tok_888",
      signUrl: "https://sandbox.app.zapsign.com.br/verificar/signer_tok_888",
      status: "PENDING",
    });
    expect(prismaMock.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prop_1" },
        data: expect.objectContaining({
          zapsignDocToken: "doc_tok_999",
          zapsignSignerToken: "signer_tok_888",
          zapsignSignUrl: "https://sandbox.app.zapsign.com.br/verificar/signer_tok_888",
          zapsignStatus: "PENDING",
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  it("processa webhook doc_signed do ZapSign e marca a proposta como ACCEPTED", async () => {
    const res = await service.handleWebhook({
      event_type: "doc_signed",
      token: "doc_tok_999",
      external_id: "prop_1",
      signed_file: "https://zapsign.s3.amazonaws.com/signed_prop_1.pdf",
      signers: [{ name: "João Cliente", status: "signed" }],
    });

    expect(res.processed).toBe(true);
    expect(prismaMock.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prop_1" },
        data: expect.objectContaining({
          zapsignStatus: "SIGNED",
          zapsignSignedPdfUrl: "https://zapsign.s3.amazonaws.com/signed_prop_1.pdf",
          status: "ACCEPTED",
          clientDecision: "ACCEPT",
        }),
      })
    );
  });
});
