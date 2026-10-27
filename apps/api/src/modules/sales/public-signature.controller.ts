import { Body, Controller, Get, Param, Post, Req, StreamableFile, Header } from "@nestjs/common";
import { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { SignatureAuditService } from "./signature-audit.service";

@Public()
@Controller(["public/documents", "api/public/documents"])
export class PublicSignatureController {
  constructor(private readonly signatureAuditService: SignatureAuditService) {}

  @Get(":token")
  getDocument(@Param("token") token: string) {
    return this.signatureAuditService.getDocumentByToken(token);
  }

  @Post(":token/request-otp")
  requestOtp(@Param("token") token: string, @Body() body: { cpf: string }) {
    return this.signatureAuditService.requestOtp(token, body.cpf);
  }

  @Post(":token/verify-otp")
  verifyOtp(@Param("token") token: string, @Body() body: { code: string }) {
    return this.signatureAuditService.verifyOtp(token, body.code);
  }

  @Post(":token/sign")
  signDocument(
    @Param("token") token: string,
    @Body()
    body: {
      signatureImage: string;
      signerName: string;
      signerCpf?: string;
    },
    @Req() req: Request
  ) {
    return this.signatureAuditService.signDocument(token, body, req);
  }

  @Get([":token/download", ":token/pdf"])
  @Header("Content-Type", "application/pdf")
  async downloadPdf(@Param("token") token: string) {
    const { buffer, filename } = await this.signatureAuditService.getDocumentPdf(token);
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `inline; filename="${filename}"`,
    });
  }
}
