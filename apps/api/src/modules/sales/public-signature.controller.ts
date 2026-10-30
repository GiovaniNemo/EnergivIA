import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  StreamableFile,
  Header,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { SignatureAuditService } from "./signature-audit.service";

@Public()
@Controller(["public/documents", "api/public/documents"])
export class PublicSignatureController {
  constructor(private readonly signatureAuditService: SignatureAuditService) {}

  @Get(":token")
  @Throttle({ short: { limit: 10, ttl: 10_000 }, medium: { limit: 30, ttl: 60_000 } })
  getDocument(@Param("token") token: string) {
    return this.signatureAuditService.getDocumentByToken(token);
  }

  @Post(":token/request-otp")
  @Throttle({ short: { limit: 1, ttl: 10_000 }, medium: { limit: 3, ttl: 60_000 } })
  requestOtp(@Param("token") token: string, @Body() body: { cpf: string }) {
    return this.signatureAuditService.requestOtp(token, body.cpf);
  }

  @Post(":token/verify-otp")
  @Throttle({ short: { limit: 2, ttl: 10_000 }, medium: { limit: 5, ttl: 60_000 } })
  verifyOtp(@Param("token") token: string, @Body() body: { code: string }) {
    return this.signatureAuditService.verifyOtp(token, body.code);
  }

  @Post(":token/sign")
  @Throttle({ short: { limit: 1, ttl: 10_000 }, medium: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ short: { limit: 2, ttl: 10_000 }, medium: { limit: 10, ttl: 60_000 } })
  @Header("Content-Type", "application/pdf")
  async downloadPdf(@Param("token") token: string, @Query("regenerate") regenerate?: string) {
    const force = regenerate === "true" || regenerate === "1";
    const { buffer, filename } = await this.signatureAuditService.getDocumentPdf(token, force);
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `inline; filename="${filename}"`,
    });
  }
}
