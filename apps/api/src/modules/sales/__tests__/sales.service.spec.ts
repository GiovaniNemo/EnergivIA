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
      saleDocument: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
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
});
