/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PublicSignatureController } from "../public-signature.controller";

describe("PublicSignatureController", () => {
  let controller: PublicSignatureController;
  let mockSignatureAuditService: any;

  beforeEach(() => {
    mockSignatureAuditService = {
      getDocumentByToken: vi.fn(),
      requestOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signDocument: vi.fn(),
      getDocumentPdf: vi.fn(),
    };

    controller = new PublicSignatureController(mockSignatureAuditService);
  });

  describe("getDocument", () => {
    it("should return document metadata for valid token", async () => {
      const mockDoc = {
        title: "Contrato de Fornecimento",
        templateType: "CONTRATO_PF",
        status: "PENDING",
        signerName: "João da Silva",
        customerCpfMasked: "***.***.789-**",
      };
      mockSignatureAuditService.getDocumentByToken.mockResolvedValue(mockDoc);

      const result = await controller.getDocument("token-123");
      expect(result).toEqual(mockDoc);
      expect(mockSignatureAuditService.getDocumentByToken).toHaveBeenCalledWith("token-123");
    });

    it("should throw NotFoundException if token is invalid", async () => {
      mockSignatureAuditService.getDocumentByToken.mockRejectedValue(
        new NotFoundException("Documento não encontrado.")
      );

      await expect(controller.getDocument("token-invalid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("requestOtp", () => {
    it("should request OTP with cpf confirmation", async () => {
      mockSignatureAuditService.requestOtp.mockResolvedValue({
        success: true,
        message: "Código de verificação enviado para seu e-mail.",
        emailMasked: "j***@email.com",
      });

      const result = await controller.requestOtp("token-123", { cpf: "123.456.789-00" });
      expect(result.success).toBe(true);
      expect(mockSignatureAuditService.requestOtp).toHaveBeenCalledWith(
        "token-123",
        "123.456.789-00"
      );
    });

    it("should fail if CPF does not match", async () => {
      mockSignatureAuditService.requestOtp.mockRejectedValue(
        new BadRequestException("O CPF informado não confere com o cadastro do titular.")
      );

      await expect(controller.requestOtp("token-123", { cpf: "000.000.000-00" })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("verifyOtp", () => {
    it("should verify 5-digit code successfully", async () => {
      mockSignatureAuditService.verifyOtp.mockResolvedValue({
        verified: true,
      });

      const result = await controller.verifyOtp("token-123", { code: "12345" });
      expect(result.verified).toBe(true);
      expect(mockSignatureAuditService.verifyOtp).toHaveBeenCalledWith("token-123", "12345");
    });
  });

  describe("signDocument", () => {
    it("should sign document and return signed status and hash", async () => {
      const mockReq = {
        headers: { "x-forwarded-for": "201.55.12.3", "user-agent": "Mozilla/5.0 Chrome" },
        ip: "201.55.12.3",
      } as any;

      mockSignatureAuditService.signDocument.mockResolvedValue({
        signed: true,
        signedAt: "2026-10-27T15:00:00.000Z",
        signedPdfHash: "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
      });

      const result = await controller.signDocument(
        "token-123",
        {
          signatureImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
          signerName: "João da Silva",
          signerCpf: "123.456.789-00",
        },
        mockReq
      );

      expect(result.signed).toBe(true);
      expect(result.signedPdfHash.length).toBe(64);
    });
  });

  describe("downloadPdf", () => {
    it("should pass force=true when regenerate=true query is provided", async () => {
      mockSignatureAuditService.getDocumentPdf.mockResolvedValue({
        buffer: Buffer.from("%PDF-1.4 test"),
        filename: "Contrato_assinado.pdf",
      });

      const res = await controller.downloadPdf("token-123", "true");
      expect(mockSignatureAuditService.getDocumentPdf).toHaveBeenCalledWith("token-123", true);
      expect(res).toBeDefined();
    });

    it("should pass force=false by default when no regenerate param is passed", async () => {
      mockSignatureAuditService.getDocumentPdf.mockResolvedValue({
        buffer: Buffer.from("%PDF-1.4 test"),
        filename: "Contrato.pdf",
      });

      const res = await controller.downloadPdf("token-123");
      expect(mockSignatureAuditService.getDocumentPdf).toHaveBeenCalledWith("token-123", false);
      expect(res).toBeDefined();
    });
  });
});
