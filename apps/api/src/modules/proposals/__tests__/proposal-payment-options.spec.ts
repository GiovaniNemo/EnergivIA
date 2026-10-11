/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ProposalsService } from "../proposals.service";
import type { ProposalPaymentOptions } from "@energivia/shared-types";

describe("Proposals Payment Options Service", () => {
  let service: ProposalsService;
  let mockPrisma: any;
  let mockNotifications: any;
  let mockLeadActivityLog: any;
  let mockStockReservation: any;
  let mockPdfRenderer: any;

  const sampleProposal = {
    id: "prop-123",
    tenantId: "tenant-abc",
    title: "Proposta Solar Comercial",
    status: "DRAFT",
    validUntil: new Date("2026-12-31"),
    dealId: "deal-456",
    deal: {
      leadId: "lead-789",
      lead: { name: "Empresa Solar Teste" },
    },
    renderedData: {},
  };

  const validOptions: ProposalPaymentOptions = {
    cash: {
      enabled: true,
      discountPct: 5,
      discountBrl: 1000,
      finalAmount: 19000,
      methods: ["Pix", "TED"],
    },
    creditCard: {
      enabled: true,
      maxInstallments: 12,
      installmentAmount: 1800,
      totalAmount: 21600,
      taxDescription: "Taxa inclusa",
    },
    financing: {
      enabled: true,
      installments: 84,
      installmentAmount: 489,
      downPaymentBrl: 0,
      graceDays: 90,
      bankName: "BV Financeira",
    },
  };

  beforeEach(() => {
    mockPrisma = {
      proposal: {
        findFirst: vi.fn().mockResolvedValue(sampleProposal),
        update: vi.fn().mockImplementation(({ data }) => ({
          ...sampleProposal,
          ...data,
        })),
      },
    };
    mockNotifications = {
      handlePublicProposalView: vi.fn(),
    };
    mockLeadActivityLog = {
      append: vi.fn().mockResolvedValue(undefined),
    };
    mockStockReservation = {
      reserveForProposal: vi.fn(),
    };
    mockPdfRenderer = {
      renderPdf: vi.fn(),
    };

    service = new ProposalsService(
      mockPrisma,
      mockNotifications,
      mockLeadActivityLog,
      mockStockReservation,
      mockPdfRenderer
    );
  });

  it("updates proposal payment options and regenerates public token", async () => {
    const res = await service.updatePaymentOptions("tenant-abc", "prop-123", validOptions);

    expect(res.id).toBe("prop-123");
    expect(res.paymentOptions).toEqual(validOptions);
    expect(res.publicToken).toBeDefined();

    expect(mockPrisma.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prop-123" },
        data: expect.objectContaining({
          renderedData: expect.objectContaining({
            paymentOptions: validOptions,
          }),
        }),
      })
    );

    expect(mockLeadActivityLog.append).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-abc",
        leadId: "lead-789",
        kind: "NOTE_ADDED",
      })
    );
  });

  it("throws BadRequestException if all payment methods are disabled", async () => {
    const allDisabled: ProposalPaymentOptions = {
      cash: { ...validOptions.cash, enabled: false },
      creditCard: { ...validOptions.creditCard, enabled: false },
      financing: { ...validOptions.financing, enabled: false },
    };

    await expect(
      service.updatePaymentOptions("tenant-abc", "prop-123", allDisabled)
    ).rejects.toThrow(BadRequestException);
  });
});
