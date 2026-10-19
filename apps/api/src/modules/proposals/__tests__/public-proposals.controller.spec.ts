/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StreamableFile } from "@nestjs/common";
import { PublicProposalsController } from "../public-proposals.controller";

describe("PublicProposalsController - PDF and Public endpoints", () => {
  let controller: PublicProposalsController;
  let mockProposalsService: any;
  let mockResponse: any;

  beforeEach(() => {
    mockProposalsService = {
      findPublicById: vi.fn().mockResolvedValue({ id: "prop-123", title: "Proposta Solar" }),
      generatePublicPdf: vi.fn().mockResolvedValue({
        buffer: Buffer.from("%PDF-1.4 test"),
        filename: "Proposta_1002_Pedro.pdf",
      }),
      trackPublicProposalView: vi.fn().mockResolvedValue({ ok: true }),
      respondPublicById: vi.fn().mockResolvedValue({ success: true }),
    };

    mockResponse = {
      setHeader: vi.fn(),
    };

    controller = new PublicProposalsController(mockProposalsService);
  });

  it("should return StreamableFile and set Content-Disposition on downloadPdf", async () => {
    const result = await controller.downloadPdf("prop-123", mockResponse);

    expect(mockProposalsService.generatePublicPdf).toHaveBeenCalledWith("prop-123");
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="Proposta_1002_Pedro.pdf"'
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it("should forward findPublic with isPdf flag", async () => {
    const result = await controller.findPublic("prop-123", "true");

    expect(mockProposalsService.findPublicById).toHaveBeenCalledWith("prop-123", { isPdf: true });
    expect(result).toEqual({ id: "prop-123", title: "Proposta Solar" });
  });
});
