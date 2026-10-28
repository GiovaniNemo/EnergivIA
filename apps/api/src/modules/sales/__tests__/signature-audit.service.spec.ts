/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignatureAuditService, parseUserAgentFriendly } from "../signature-audit.service";

describe("SignatureAuditService", () => {
  let service: SignatureAuditService;
  let mockPrisma: any;
  let mockEmailService: any;
  let mockDocTemplateService: any;

  beforeEach(() => {
    mockPrisma = {
      saleDocument: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      sale: {
        update: vi.fn(),
      },
    };
    mockEmailService = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    mockDocTemplateService = {
      buildDocumentHtml: vi.fn().mockReturnValue("<html></html>"),
      generatePdfWithHash: vi.fn().mockResolvedValue({
        pdfBuffer: Buffer.from("%PDF-1.4"),
        sha256Hash: "abc123hash",
      }),
      savePdfToDisk: vi.fn(),
      getPdfFromDisk: vi.fn(),
    };

    service = new SignatureAuditService(mockPrisma, mockEmailService, mockDocTemplateService);
  });

  describe("getDocumentByToken", () => {
    it("should return signerName, organizationName, createdAt, signStatus, and documentType for public signature preview", async () => {
      const createdAt = new Date("2026-10-27T18:00:00.000Z");
      mockPrisma.saleDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        title: "Contrato de Venda e Instalação Solar - #1001",
        templateType: "CONTRATO_PF",
        status: "PENDING",
        createdAt,
        signedAt: null,
        signerName: null,
        originalPdfHash: "8d5ad8e920f76d640000000000000000",
        signedPdfHash: null,
        otpVerifiedAt: null,
        sale: {
          customerType: "PF",
          documentNumber: "123.456.789-00",
          legalRepresentativeName: null,
          legalRepresentativeCpf: null,
          installationAddress: "Rua A, 100",
          installationCity: "Belo Horizonte",
          installationState: "MG",
          systemPowerKwp: 6.5,
          proposal: {
            deal: {
              lead: {
                name: "Maria Oliveira",
                cpfCnpj: "123.456.789-00",
                email: "maria@exemplo.com",
              },
            },
          },
          tenant: {
            name: "Solar Tech Integradora",
            logoUrl: "https://example.com/logo.png",
          },
        },
      });

      const res = await service.getDocumentByToken("token-abc");

      expect(res.signerName).toBe("Maria Oliveira");
      expect(res.customerName).toBe("Maria Oliveira");
      expect(res.organizationName).toBe("Solar Tech Integradora");
      expect(res.companyName).toBe("Solar Tech Integradora");
      expect(res.createdAt).toEqual(createdAt);
      expect(res.signStatus).toBe("PENDING");
      expect(res.documentType).toBe("CONTRATO_PF");
    });

    it("should accept legalRepresentativeCpf or CNPJ when requesting OTP for PJ sale", async () => {
      mockPrisma.saleDocument.findUnique.mockResolvedValue({
        id: "doc-pj",
        title: "Contrato PJ",
        status: "PENDING",
        sale: {
          customerType: "PJ",
          documentNumber: "12.345.678/0001-90",
          legalRepresentativeName: "Carlos Sócio",
          legalRepresentativeCpf: "111.222.333-44",
          proposal: {
            deal: {
              lead: {
                name: "Empresa Solar Ltda",
                cpfCnpj: "12.345.678/0001-90",
                email: "contato@empresasolar.com",
              },
            },
          },
          tenant: {
            name: "Solar Tech Integradora",
          },
        },
      });
      mockPrisma.saleDocument.update.mockResolvedValue({});

      const otpByRepCpf = await service.requestOtp("token-pj", "111.222.333-44");
      expect(otpByRepCpf.success).toBe(true);

      const otpByCnpj = await service.requestOtp("token-pj", "12.345.678/0001-90");
      expect(otpByCnpj.success).toBe(true);
    });
  });

  describe("parseUserAgentFriendly", () => {
    it("should recognize Opera GX on Windows NT 10.0", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 OPR/137.0.0.0";
      const res = parseUserAgentFriendly(ua);
      expect(res).toBe("Opera / Opera GX 137 · Windows 10/11 (64-bit)");
    });

    it("should recognize Google Chrome, Edge, and mobile devices", () => {
      expect(
        parseUserAgentFriendly(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
      ).toBe("Google Chrome 120 · Windows 10/11 (64-bit)");

      expect(
        parseUserAgentFriendly(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"
        )
      ).toBe("Apple Safari · iPhone (iOS)");

      expect(
        parseUserAgentFriendly(
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
        )
      ).toBe("Google Chrome 120 · Android");

      expect(parseUserAgentFriendly(null)).toBe("Navegador Web / Mobile");
    });
  });

  describe("signDocument", () => {
    it("should build complete document with bilateral signatures and attached audit trail", async () => {
      const mockDoc = {
        id: "doc-1",
        title: "Contrato de Venda e Instalação Solar - #1002",
        publicToken: "token-123",
        originalPdfHash: "hash-original-sha256",
        templateType: "CONTRATO_PF",
        status: "PENDING",
        sale: {
          id: "sale-1",
          investmentAmount: 20493,
          systemPowerKwp: 7.44,
          sellerName: "Consultor Técnico",
          tenant: { name: "EnergivIA Soluções Solares" },
          proposal: {
            deal: {
              lead: {
                name: "Emerson",
                cpfCnpj: "139.731.969-07",
                email: "emerson@exemplo.com",
              },
            },
          },
        },
      };

      mockPrisma.saleDocument.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.saleDocument.update.mockResolvedValue({ ...mockDoc, status: "SIGNED" });
      mockPrisma.sale.update.mockResolvedValue({});

      const req = {
        headers: { "user-agent": "Opera/137", "x-forwarded-for": "34.204.200.9" },
        ip: "34.204.200.9",
      };

      const res = await service.signDocument(
        "token-123",
        {
          signatureImage:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          signerName: "Emerson",
          signerCpf: "139.731.969-07",
        },
        req
      );

      expect(res.signed).toBe(true);
      expect(mockDocTemplateService.buildDocumentHtml).toHaveBeenCalled();
      const passedData = mockDocTemplateService.buildDocumentHtml.mock.calls[0][1];
      expect(passedData.nome_cliente).toBe("Emerson");
      expect(passedData.cpf_cliente).toBe("139.731.969-07");
      expect(passedData.bloco_assinatura_cliente).toContain("data:image/png");
      expect(passedData.folha_auditoria_anexa).toContain("Certificado de Assinatura Eletrônica");
      expect(mockDocTemplateService.generatePdfWithHash).toHaveBeenCalled();
      expect(mockDocTemplateService.savePdfToDisk).toHaveBeenCalled();
    });
  });
});
