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
      prepareContractVariables: vi.fn().mockImplementation(async (params) => ({
        bloco_logo_empresa: "<div>LOGO</div>",
        qualificacao_contratada: "CONTRATADA QUALIFICADA",
        qualificacao_contratante: "CONTRATANTE QUALIFICADO",
        tabela_equipamentos: "<table></table>",
        nome_cliente: params.lead?.name || "Cliente",
        cpf_cliente: params.lead?.cpfCnpj || "—",
        valor_total: "R$ 20.493,00",
        bloco_assinatura_cliente: params.clientSignatureBlock,
        folha_auditoria_anexa: params.auditSheetHtml,
      })),
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

    it("should preserve edited contentHtml when signing document", async () => {
      const mockDoc = {
        id: "doc-custom",
        saleId: "sale-custom",
        title: "Contrato Editado em Tempo Real",
        templateType: "CONTRATO_PF",
        status: "PENDING",
        otpVerifiedAt: new Date(),
        contentHtml:
          "<html><body><h1>Contrato Customizado</h1><p>Cláusula 10: Condição Especial</p>{{bloco_assinatura_cliente}}{{folha_auditoria_anexa}}</body></html>",
        sale: {
          id: "sale-custom",
          customerType: "PF",
          documentNumber: "111.222.333-44",
          proposal: {
            deal: {
              lead: {
                name: "Carlos Solar",
                cpfCnpj: "111.222.333-44",
                email: "carlos@exemplo.com",
              },
            },
          },
        },
      };

      mockPrisma.saleDocument.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.saleDocument.update.mockResolvedValue({ ...mockDoc, status: "SIGNED" });
      mockPrisma.sale.update.mockResolvedValue({});

      const req = {
        headers: { "user-agent": "Chrome/120", "x-forwarded-for": "187.1.2.3" },
        ip: "187.1.2.3",
      };

      const res = await service.signDocument(
        "token-custom",
        {
          signatureImage: "data:image/png;base64,mockSign",
          signerName: "Carlos Solar",
          signerCpf: "111.222.333-44",
        },
        req
      );

      expect(res.signed).toBe(true);
      // If contentHtml is present, it should use generatePdfWithHash with the customized HTML containing the special clause
      expect(mockDocTemplateService.generatePdfWithHash).toHaveBeenCalled();
      const generatedHtml = mockDocTemplateService.generatePdfWithHash.mock.calls[0][0];
      expect(generatedHtml).toContain("Contrato Customizado");
      expect(generatedHtml).toContain("Cláusula 10: Condição Especial");
      expect(generatedHtml).toContain("data:image/png;base64,mockSign");
    });

    it("should clean legacy artificial page breaks and not duplicate audit sheets or signatures", async () => {
      const legacyHtml = `<!DOCTYPE html><html><body><h1>Contrato</h1><div class="page-break"></div><!-- 5. DO VALOR --><h2>5. DO VALOR</h2><div style="border: 1px dashed #94a3b8; background: #ffffff; border-radius: 6px; padding: 8px; text-align: center;"><div style="font-size: 7.5pt; font-weight: 600; color: #64748b; text-transform: uppercase;">Aguardando Assinatura Eletrônica</div><div style="font-size: 7pt; color: #94a3b8; margin-top: 2px;">Validação em 2 etapas via OTP por e-mail</div></div></body></html>`;
      const mockDoc = {
        id: "doc-legacy",
        saleId: "sale-legacy",
        title: "Contrato Legado",
        templateType: "CONTRATO_PF",
        status: "PENDING",
        contentHtml: legacyHtml,
        sale: { id: "sale-legacy", customerType: "PF", documentNumber: "123" },
      };

      const fullHtml = await service.buildFullDocumentHtml(mockDoc as any, {
        isSigned: true,
        signerName: "Signatario Teste",
        signerCpf: "123.456.789-00",
        signerEmail: "teste@exemplo.com",
        signerIp: "127.0.0.1",
        signerUserAgent: "Browser",
        friendlyUserAgent: "Chrome",
        signedAt: new Date(),
        signatureHash: "hash-12345",
        signatureImage: "data:image/png;base64,assinatura",
      });

      // Must clean the legacy page break before clause 5
      expect(fullHtml).not.toMatch(/<div class="page-break"[^>]*><\/div>\s*<!--\s*5\./);
      // Must replace the waiting box instead of appending at the bottom
      expect(fullHtml).toContain("data:image/png;base64,assinatura");
      expect(fullHtml).not.toContain("Aguardando Assinatura Eletrônica");
      // Must contain exactly 1 audit sheet
      const auditMatches = fullHtml.match(/Certificado de Assinatura Eletrônica/g);
      expect(auditMatches?.length).toBe(1);
    });

    it("should build bilateral audit sheet and replace company signature block when company signed", async () => {
      const mockDoc = {
        id: "doc-bilateral",
        saleId: "sale-bilateral",
        title: "Contrato Bilateral",
        templateType: "CONTRATO_PF",
        status: "PENDING",
        companySignedAt: new Date("2026-10-29T14:00:00Z"),
        companySignerName: "Eng. Roberto Silva",
        companySignerEmail: "roberto@solarenergy.com.br",
        companySignerCpf: "11122233344",
        companySignerIp: "200.1.2.3",
        companySignerUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        companySignatureImage: "data:image/png;base64,rubricaEmpresa",
        companySignatureHash: "comp-hash-12345",
        contentHtml: `<html><body><h1>Contrato</h1>{{bloco_assinatura_empresa}}{{bloco_assinatura_cliente}}{{folha_auditoria_anexa}}</body></html>`,
        sale: {
          id: "sale-bilateral",
          customerType: "PF",
          tenant: { name: "Solar Energy Ltda" },
          proposal: { deal: { lead: { name: "Cliente Final", email: "cliente@teste.com" } } },
        },
      };

      const fullHtml = await service.buildFullDocumentHtml(mockDoc as any, {
        isSigned: true,
        signerName: "Cliente Final",
        signerCpf: "999.888.777-66",
        signerEmail: "cliente@teste.com",
        signerIp: "177.1.1.1",
        signerUserAgent: "Safari",
        friendlyUserAgent: "Safari",
        signedAt: new Date("2026-10-29T15:30:00Z"),
        signatureHash: "cli-hash-99999",
        signatureImage: "data:image/png;base64,rubricaCliente",
      });

      // Contrato deve ter a rubrica da empresa e do cliente
      expect(fullHtml).toContain("data:image/png;base64,rubricaEmpresa");
      expect(fullHtml).toContain("data:image/png;base64,rubricaCliente");
      // Trilha bilateral
      expect(fullHtml).toContain("Trilha de Auditoria Bilateral");
      expect(fullHtml).toContain("Signatário 1 — CONTRATADA");
      expect(fullHtml).toContain("Eng. Roberto Silva");
      expect(fullHtml).toContain("roberto@solarenergy.com.br");
      expect(fullHtml).toContain("Signatário 2 — CONTRATANTE");
      expect(fullHtml).toContain("Cliente Final");
    });
  });

  describe("signCompanyDocument", () => {
    it("should allow company to sign document, update tenant default signature and return new PDF url", async () => {
      mockPrisma.tenant = { update: vi.fn().mockResolvedValue({}) };
      mockPrisma.saleDocument.findFirst = vi.fn().mockResolvedValue({
        id: "doc-10",
        saleId: "sale-10",
        tenantId: "tenant-10",
        templateType: "CONTRATO_PF",
        title: "Contrato Solar #10",
        status: "PENDING",
        companySignedAt: null,
        contentHtml: "<html><body>{{bloco_assinatura_empresa}}</body></html>",
        sale: {
          id: "sale-10",
          tenant: {
            id: "tenant-10",
            name: "Solar Prime",
            representativeSignature: null,
          },
          proposal: { deal: { lead: { name: "Cliente" } } },
        },
      });
      mockPrisma.saleDocument.update.mockResolvedValue({
        id: "doc-10",
        originalPdfUrl: "/uploads/sales-documents/company-signed-doc-10.pdf",
      });

      const res = await service.signCompanyDocument(
        "tenant-10",
        "sale-10",
        "doc-10",
        { id: "user-1", name: "Carlos Diretor", email: "carlos@solarprime.com.br" },
        { ip: "189.2.3.4", headers: { "user-agent": "Chrome/130" } },
        {
          signatureImage: "data:image/png;base64,novaRubrica",
          signerName: "Carlos Diretor",
          signerCpf: "12345678900",
          saveAsDefault: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.companySignerName).toBe("Carlos Diretor");
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: "tenant-10" },
        data: {
          representativeSignature: "data:image/png;base64,novaRubrica",
          representativeName: "Carlos Diretor",
          representativeCpf: "12345678900",
        },
      });
      expect(mockPrisma.saleDocument.update).toHaveBeenCalled();
      expect(mockDocTemplateService.generatePdfWithHash).toHaveBeenCalled();
    });
  });
});
