/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { SalesService } from "../sales.service";

describe("SalesService", () => {
  let service: SalesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      proposal: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      sale: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      lead: {
        update: vi.fn(),
      },
      deal: {
        update: vi.fn(),
      },
      leadActivityLog: {
        create: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      saleDocument: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    const mockDocumentTemplateService = {
      prepareContractVariables: vi.fn().mockResolvedValue({ nome_cliente: "João" }),
      buildDocumentHtml: vi.fn().mockReturnValue("<html>Corpo do Contrato Gerado</html>"),
      generatePdfWithHash: vi.fn().mockResolvedValue({
        pdfBuffer: Buffer.from("pdf-data"),
        sha256Hash: "hash-sha256-mocked",
      }),
      savePdfToDisk: vi.fn(),
      getFactoryDefaultTemplate: vi.fn().mockReturnValue("<html>Padrão de Fábrica</html>"),
      getAvailableTemplateVariables: vi
        .fn()
        .mockReturnValue([{ key: "nome_cliente", label: "Nome" }]),
    } as any;

    service = new SalesService(mockPrisma, mockDocumentTemplateService);
  });

  describe("convertToSale", () => {
    it("should throw NotFoundException if proposal not found", async () => {
      mockPrisma.proposal.findFirst.mockResolvedValue(null);

      await expect(service.convertToSale("tenant-1", "prop-999")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return existing sale if already converted", async () => {
      const mockProposal = {
        id: "prop-123",
        tenantId: "tenant-1",
        sale: { id: "sale-existing", status: "AWAITING_ANALYSIS" },
        deal: { lead: { name: "Cliente Teste", cpfCnpj: "123.456.789-00" } },
        simulation: {
          result: { sizing: { recommendedPowerKw: 5.5 } },
          input: { investmentAmount: 22000 },
        },
      };
      mockPrisma.proposal.findFirst.mockResolvedValue(mockProposal);

      const result = await service.convertToSale("tenant-1", "prop-123");
      expect(result.id).toBe("sale-existing");
      expect(mockPrisma.sale.create).not.toHaveBeenCalled();
    });

    it("should create new Sale copying proposal and lead snapshot", async () => {
      const mockProposal = {
        id: "prop-123",
        tenantId: "tenant-1",
        dealId: "deal-1",
        sale: null,
        deal: {
          lead: {
            name: "João da Silva",
            whatsapp: "11999999999",
            email: "joao@email.com",
            cpfCnpj: "12345678900",
          },
        },
        simulation: {
          input: { investmentAmount: 25000, city: "Campinas", state: "SP" },
          result: { sizing: { recommendedPowerKw: 6.8 } },
        },
      };
      mockPrisma.proposal.findFirst.mockResolvedValue(mockProposal);
      mockPrisma.sale.findFirst.mockResolvedValue(null);
      mockPrisma.sale.create.mockImplementation((args: any) =>
        Promise.resolve({ id: "sale-new", ...args.data })
      );

      const result = await service.convertToSale("tenant-1", "prop-123", {
        name: "Vendedor Alpha",
      });

      expect(mockPrisma.sale.create).toHaveBeenCalled();
      expect(result.systemPowerKwp).toBe(6.8);
      expect(result.investmentAmount).toBe(25000);
      expect(result.documentNumber).toBe("12345678900");
      expect(result.sellerName).toBe("Vendedor Alpha");
      expect(result.status).toBe("AWAITING_ANALYSIS");
      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deal-1" },
          data: expect.objectContaining({ stage: "WON" }),
        })
      );
      expect(mockPrisma.proposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prop-123" },
          data: expect.objectContaining({ status: "ACCEPTED" }),
        })
      );
    });
  });

  describe("listSales", () => {
    it("should map customerName, totalValue and metadata from relations", async () => {
      const mockSales = [
        {
          id: "sale-1",
          saleNumber: 1001,
          investmentAmount: 5657.6,
          installationCity: "Maringá",
          installationState: "PR",
          distributionCompany: "COPEL",
          consumerUnitNumber: "12345",
          documentNumber: "111.222.333-44",
          proposal: {
            title: "Proposta Comercial - Giovani",
            deal: {
              lead: {
                name: "Giovani",
                email: "giovani@exemplo.com",
                whatsapp: "44997423865",
                cpfCnpj: "111.222.333-44",
              },
            },
            renderedData: {
              integrator: {
                quotedSaleBrl: 5657.6,
              },
            },
          },
          documents: [
            {
              id: "doc-1",
              templateType: "CONTRATO_PF",
              title: "Contrato",
              status: "SIGNED",
              publicToken: "token-1",
              signedAt: new Date(),
              signerName: "Giovani",
              signerCpf: "111.222.333-44",
            },
          ],
        },
      ];

      mockPrisma.sale.findMany.mockResolvedValue(mockSales);
      mockPrisma.sale.count.mockResolvedValue(1);

      const result = await service.listSales("tenant-1");

      expect(result.total).toBe(1);
      expect(result.items[0].customerName).toBe("Giovani");
      expect(result.items[0].customerEmail).toBe("giovani@exemplo.com");
      expect(result.items[0].customerPhone).toBe("44997423865");
      expect(result.items[0].totalValue).toBe(5657.6);
      expect(result.items[0].city).toBe("Maringá");
      expect(result.items[0].state).toBe("PR");
      expect(result.items[0].utilityCompany).toBe("COPEL");
      expect(result.items[0].ucNumber).toBe("12345");
    });

    it("should fallback to legalRepresentativeName or proposal deal title when lead name is absent", async () => {
      const mockSales = [
        {
          id: "sale-2",
          investmentAmount: 20493,
          legalRepresentativeName: "Emerson Representante",
          proposal: {
            deal: {
              title: "Sistema Fotovoltaico - Emerson",
            },
          },
          documents: [],
        },
      ];

      mockPrisma.sale.findMany.mockResolvedValue(mockSales);
      mockPrisma.sale.count.mockResolvedValue(1);

      const result = await service.listSales("tenant-1");
      expect(result.items[0].customerName).toBe("Emerson Representante");
      expect(result.items[0].totalValue).toBe(20493);
    });
  });

  describe("getSaleById", () => {
    it("should return sale with mapped fields and relations", async () => {
      const mockSale = {
        id: "sale-1",
        tenantId: "tenant-1",
        investmentAmount: 20493,
        installationCity: "Maringá",
        installationState: "PR",
        distributionCompany: "COPEL (Paraná)",
        consumerUnitNumber: "425245626256",
        documentNumber: "139.731.969-07",
        proposal: {
          title: "Proposta Comercial - Emerson",
          deal: {
            lead: {
              name: "Emerson",
              email: "emerson@exemplo.com",
              whatsapp: "44997423865",
            },
          },
          renderedData: {
            integrator: {
              quotedSaleBrl: 20493,
            },
          },
        },
        documents: [],
      };
      mockPrisma.sale.findFirst.mockResolvedValue(mockSale);

      const result = await service.getSaleById("tenant-1", "sale-1");
      expect(result.customerName).toBe("Emerson");
      expect(result.customerEmail).toBe("emerson@exemplo.com");
      expect(result.customerPhone).toBe("44997423865");
      expect(result.totalValue).toBe(20493);
      expect(result.city).toBe("Maringá");
      expect(result.state).toBe("PR");
      expect(result.utilityCompany).toBe("COPEL (Paraná)");
      expect(result.ucNumber).toBe("425245626256");
    });

    it("should throw NotFoundException if sale not found", async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);

      await expect(service.getSaleById("tenant-1", "sale-unknown")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("updateSale", () => {
    it("should update sale fields and update lead.whatsapp instead of invalid phone field", async () => {
      const mockSale = {
        id: "sale-1",
        tenantId: "tenant-1",
        proposal: {
          deal: {
            leadId: "lead-1",
            lead: {
              id: "lead-1",
              name: "Maria Oliveira",
              email: "maria@exemplo.com",
              whatsapp: "(31) 98888-7777",
            },
          },
        },
        documents: [],
      };
      mockPrisma.sale.findFirst.mockResolvedValue(mockSale);
      mockPrisma.lead.update.mockResolvedValue({});
      mockPrisma.sale.update.mockResolvedValue({ ...mockSale, consumerUnitNumber: "998877" });

      const updated = await service.updateSale("tenant-1", "sale-1", {
        consumerUnitNumber: "998877",
        customerName: "Maria Oliveira",
        customerEmail: "maria@exemplo.com",
        customerPhone: "(31) 98888-7777",
      });

      expect(updated.consumerUnitNumber).toBe("998877");
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: expect.objectContaining({
          name: "Maria Oliveira",
          email: "maria@exemplo.com",
          whatsapp: "(31) 98888-7777",
        }),
      });
    });
  });

  describe("getDocumentForEditor", () => {
    it("should return existing document contentHtml if present", async () => {
      const mockDoc = {
        id: "doc-1",
        saleId: "sale-1",
        tenantId: "tenant-1",
        templateType: "CONTRATO_PF",
        title: "Contrato de Compra e Venda Solar",
        status: "PENDING",
        publicToken: "token-abc",
        contentHtml: "<p>Cláusula 1ª Original</p>",
        originalPdfUrl: "/uploads/doc-1.pdf",
        updatedAt: new Date(),
      };
      mockPrisma.saleDocument.findFirst.mockResolvedValue(mockDoc);

      const result = await service.getDocumentForEditor("tenant-1", "sale-1", "doc-1");
      expect(result.id).toBe("doc-1");
      expect(result.contentHtml).toBe("<p>Cláusula 1ª Original</p>");
      expect(result.isSigned).toBe(false);
    });

    it("should throw NotFoundException if document not found", async () => {
      mockPrisma.saleDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.getDocumentForEditor("tenant-1", "sale-1", "doc-inexistente")
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateDocumentContent", () => {
    it("should update contentHtml and regenerate PDF hash when valid", async () => {
      const mockDoc = {
        id: "doc-1",
        saleId: "sale-1",
        tenantId: "tenant-1",
        templateType: "CONTRATO_PF",
        status: "PENDING",
      };
      mockPrisma.saleDocument.findFirst.mockResolvedValue(mockDoc);
      mockPrisma.saleDocument.update.mockResolvedValue({
        ...mockDoc,
        contentHtml: "<p>Cláusula Atualizada com Nova Condição</p>",
        originalPdfUrl: "/uploads/sales-documents/doc-novo.pdf",
        originalPdfHash: "hash-sha256-mocked",
      });

      const updated = await service.updateDocumentContent(
        "tenant-1",
        "sale-1",
        "doc-1",
        "<p>Cláusula Atualizada com Nova Condição</p>"
      );

      expect(updated.contentHtml).toContain("Nova Condição");
      expect(updated.originalPdfHash).toBe("hash-sha256-mocked");
      expect(mockPrisma.saleDocument.update).toHaveBeenCalled();
    });

    it("should throw BadRequestException if document is already SIGNED", async () => {
      const mockDoc = {
        id: "doc-1",
        saleId: "sale-1",
        tenantId: "tenant-1",
        templateType: "CONTRATO_PF",
        status: "SIGNED",
      };
      mockPrisma.saleDocument.findFirst.mockResolvedValue(mockDoc);

      await expect(
        service.updateDocumentContent("tenant-1", "sale-1", "doc-1", "<p>Texto Qualquer</p>")
      ).rejects.toThrow(/assinados/);
    });
  });

  describe("deleteSaleDocument", () => {
    it("should delete document if status is PENDING", async () => {
      const mockDoc = {
        id: "doc-pending",
        saleId: "sale-1",
        tenantId: "tenant-1",
        status: "PENDING",
      };
      mockPrisma.saleDocument.findFirst.mockResolvedValue(mockDoc);
      mockPrisma.saleDocument.delete.mockResolvedValue(mockDoc);

      const res = await service.deleteSaleDocument("tenant-1", "sale-1", "doc-pending");
      expect(res.success).toBe(true);
      expect(mockPrisma.saleDocument.delete).toHaveBeenCalledWith({
        where: { id: "doc-pending" },
      });
    });

    it("should throw BadRequestException if document is SIGNED", async () => {
      const mockDoc = {
        id: "doc-signed",
        saleId: "sale-1",
        tenantId: "tenant-1",
        status: "SIGNED",
      };
      mockPrisma.saleDocument.findFirst.mockResolvedValue(mockDoc);

      await expect(service.deleteSaleDocument("tenant-1", "sale-1", "doc-signed")).rejects.toThrow(
        /assinados/
      );
      expect(mockPrisma.saleDocument.delete).not.toHaveBeenCalled();
    });
  });
  describe("Global Document Templates", () => {
    it("should get global templates with custom or factory defaults", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        name: "Solar Corp",
        settings: {
          customDocumentTemplates: {
            CONTRATO_PF: "<html>Contrato Customizado Global</html>",
          },
        },
      });

      const res = await service.getGlobalDocumentTemplates("tenant-1");
      expect(res.templates.CONTRATO_PF.isCustom).toBe(true);
      expect(res.templates.CONTRATO_PF.contentHtml).toBe(
        "<html>Contrato Customizado Global</html>"
      );
      expect(res.templates.PROCURACAO_PF.isCustom).toBe(false);
      expect(res.templates.PROCURACAO_PF.contentHtml).toBe("<html>Padrão de Fábrica</html>");
      expect(res.availableVariables).toHaveLength(1);
    });

    it("should update global document template for tenant", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        settings: {},
      });
      mockPrisma.tenant.update.mockResolvedValue({});

      const res = await service.updateGlobalDocumentTemplate(
        "tenant-1",
        "CONTRATO_PF" as any,
        "<html>Novo Modelo Global</html>"
      );

      expect(res.success).toBe(true);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tenant-1" },
          data: {
            settings: {
              customDocumentTemplates: {
                CONTRATO_PF: expect.stringContaining("Novo Modelo Global"),
                CONTRATO_PJ: expect.stringContaining("Novo Modelo Global"),
              },
            },
          },
        })
      );
    });

    it("should reset global document template to factory default", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        settings: {
          customDocumentTemplates: {
            CONTRATO_PF: "<html>Customizado</html>",
            CONTRATO_PJ: "<html>Customizado</html>",
          },
        },
      });
      mockPrisma.tenant.update.mockResolvedValue({});

      const res = await service.resetGlobalDocumentTemplate("tenant-1", "CONTRATO_PF" as any);
      expect(res.success).toBe(true);
      expect(res.isCustom).toBe(false);
      expect(res.contentHtml).toBe("<html>Padrão de Fábrica</html>");
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: {
          settings: {
            customDocumentTemplates: {},
          },
        },
      });
    });
  });

  describe("tenantSignature", () => {
    it("should return tenant representative signature info", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        representativeName: "João Silva",
        representativeCpf: "123.456.789-00",
        representativeSignature: "data:image/png;base64,assinaturaSalva",
      });

      const res = await service.getTenantSignature("tenant-1");
      expect(res.representativeName).toBe("João Silva");
      expect(res.representativeSignature).toBe("data:image/png;base64,assinaturaSalva");
    });

    it("should update tenant representative signature", async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        representativeName: "Maria Santos",
        representativeCpf: "987.654.321-00",
        representativeSignature: "data:image/png;base64,novaAssinatura",
      });

      const res = await service.updateTenantSignature("tenant-1", {
        representativeName: "Maria Santos",
        representativeCpf: "987.654.321-00",
        representativeSignature: "data:image/png;base64,novaAssinatura",
      });

      expect(res.representativeName).toBe("Maria Santos");
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: {
          representativeName: "Maria Santos",
          representativeCpf: "987.654.321-00",
          representativeSignature: "data:image/png;base64,novaAssinatura",
        },
        select: {
          representativeName: true,
          representativeCpf: true,
          representativeSignature: true,
        },
      });
    });
  });
});
