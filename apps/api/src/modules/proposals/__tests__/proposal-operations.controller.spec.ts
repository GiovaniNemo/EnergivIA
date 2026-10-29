/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StreamableFile } from "@nestjs/common";
import { ProposalOperationsController } from "../proposal-operations.controller";

describe("ProposalOperationsController - PDF & Thumbnail Endpoints", () => {
  let controller: ProposalOperationsController;
  let mockProposalsService: any;

  beforeEach(() => {
    mockProposalsService = {
      generatePdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 test")),
      renderHtmlPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 html test")),
      closeProposal: vi.fn().mockResolvedValue({ id: "prop-123", status: "ACCEPTED" }),
      renderThumbnail: vi
        .fn()
        .mockResolvedValue({ dataUrl: "data:image/jpeg;base64,mockThumbnail" }),
    };

    controller = new ProposalOperationsController(mockProposalsService);
  });

  it("should return StreamableFile when generatePdf is called", async () => {
    const result = await controller.generatePdf("prop-123");
    expect(mockProposalsService.generatePdf).toHaveBeenCalledWith("prop-123");
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it("should delegate to renderHtmlPdf and return StreamableFile", async () => {
    const htmlPayload = { html: "<html><body>Proposta</body></html>", title: "Proposta Solar" };
    const result = await controller.renderHtmlPdf(htmlPayload);

    expect(mockProposalsService.renderHtmlPdf).toHaveBeenCalledWith(htmlPayload.html);
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it("should delegate to renderThumbnail and return dataUrl JSON", async () => {
    const thumbPayload = { url: "http://localhost:3000/proposta/123", selector: "[data-target]" };
    const result = await controller.renderThumbnail(thumbPayload);

    expect(mockProposalsService.renderThumbnail).toHaveBeenCalledWith(
      thumbPayload.url,
      thumbPayload.selector
    );
    expect(result).toEqual({ dataUrl: "data:image/jpeg;base64,mockThumbnail" });
  });

  it("should delegate to closeProposal and return updated proposal", async () => {
    const result = await controller.closeProposal("tenant-1", "prop-123");
    expect(mockProposalsService.closeProposal).toHaveBeenCalledWith("tenant-1", "prop-123");
    expect(result).toEqual({ id: "prop-123", status: "ACCEPTED" });
  });
});
