import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import * as crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../../common/email/email.service";
import { DocumentTemplateService } from "./document-template.service";
import { CONTRACT_PF_TEMPLATE } from "./templates/contract-pf.template";
import { POWER_OF_ATTORNEY_PF_TEMPLATE } from "./templates/power-of-attorney-pf.template";
import { DocumentSignStatus, DocumentType, SaleStatus } from "@prisma/client";

const STATUS_SIGNED = (DocumentSignStatus?.SIGNED ?? "SIGNED") as DocumentSignStatus;
const STATUS_OTP_SENT = (DocumentSignStatus?.OTP_SENT ?? "OTP_SENT") as DocumentSignStatus;
const SALE_STATUS_SIGNED = (SaleStatus?.SIGNED ?? "SIGNED") as SaleStatus;

function maskCpf(cpf?: string | null): string {
  if (!cpf) return "—";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 14) {
    return `**.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-**`;
  }
  if (clean.length !== 11) return cpf;
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
}

export function parseUserAgentFriendly(ua?: string | null): string {
  if (!ua || typeof ua !== "string") return "Navegador Web / Mobile";

  let os = "Dispositivo";
  if (ua.includes("iPhone")) os = "iPhone (iOS)";
  else if (ua.includes("iPad")) os = "iPad (iPadOS)";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  const arch =
    ua.includes("x64") || ua.includes("Win64") || ua.includes("WOW64") ? " (64-bit)" : "";

  function extractMajorVersion(match: RegExpMatchArray | null): string {
    const full = match?.[1];
    if (!full) return "";
    const major = full.split(".")[0];
    return major ? " " + major : "";
  }

  let browser = "Navegador Web";
  if (ua.includes("OPR/") || ua.includes("Opera")) {
    const ver = extractMajorVersion(ua.match(/OPR\/([\d.]+)/));
    browser = "Opera / Opera GX" + ver;
  } else if (ua.includes("Edg/")) {
    const ver = extractMajorVersion(ua.match(/Edg\/([\d.]+)/));
    browser = "Microsoft Edge" + ver;
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium")) {
    const ver = extractMajorVersion(ua.match(/Chrome\/([\d.]+)/));
    browser = "Google Chrome" + ver;
  } else if (ua.includes("Firefox/")) {
    const ver = extractMajorVersion(ua.match(/Firefox\/([\d.]+)/));
    browser = "Mozilla Firefox" + ver;
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Apple Safari";
  }

  return browser + " · " + os + arch;
}

function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "—";
  const [user, domain] = email.split("@");
  if (!user || user.length <= 2) return `*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

@Injectable()
export class SignatureAuditService {
  private readonly logger = new Logger(SignatureAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly documentTemplateService: DocumentTemplateService
  ) {}

  async getDocumentByToken(publicToken: string) {
    const doc = await this.prisma.saleDocument.findUnique({
      where: { publicToken },
      include: {
        sale: {
          include: {
            proposal: {
              include: {
                deal: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
            tenant: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado ou link expirado.");
    }

    const lead = doc.sale?.proposal?.deal?.lead;
    const isSigned = doc.status === STATUS_SIGNED;

    const signerName = isSigned
      ? doc.signerName || lead?.name || doc.sale?.legalRepresentativeName || "Titular do Contrato"
      : lead?.name || doc.sale?.legalRepresentativeName || doc.signerName || "Titular do Contrato";

    const companyName = doc.sale?.tenant?.name || "EnergivIA Soluções Solares";

    return {
      id: doc.id,
      title: doc.title,
      templateType: doc.templateType,
      documentType: doc.templateType,
      status: doc.status,
      signStatus: doc.status,
      isSigned,
      createdAt: doc.createdAt,
      signedAt: doc.signedAt,
      signedPdfHash: doc.signedPdfHash,
      originalPdfHash: doc.originalPdfHash,
      signerName,
      customerName: signerName,
      customerType: doc.sale?.customerType ?? "PF",
      customerCpfMasked: maskCpf(
        doc.sale?.legalRepresentativeCpf ||
          doc.sale?.documentNumber ||
          lead?.cpfCnpj ||
          doc.signerCpf
      ),
      customerEmailMasked: maskEmail(lead?.email || doc.signerEmail),
      installationAddress: doc.sale?.installationAddress,
      installationCity: doc.sale?.installationCity,
      installationState: doc.sale?.installationState,
      systemPowerKwp: doc.sale?.systemPowerKwp,
      companyName,
      organizationName: companyName,
      companyLogoUrl: doc.sale?.tenant?.logoUrl,
      otpVerified: Boolean(doc.otpVerifiedAt),
      companySignedAt: doc.companySignedAt,
      companySignerName: doc.companySignerName,
      companySignatureImage: doc.companySignatureImage,
      isCompanySigned: Boolean(doc.companySignedAt),
    };
  }

  async requestOtp(publicToken: string, providedCpf: string) {
    const doc = await this.prisma.saleDocument.findUnique({
      where: { publicToken },
      include: {
        sale: {
          include: {
            proposal: {
              include: {
                deal: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
            tenant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    if (doc.status === STATUS_SIGNED) {
      throw new BadRequestException("Este documento já foi assinado e finalizado.");
    }

    const lead = doc.sale?.proposal?.deal?.lead;
    const candidateDocs = [
      doc.sale?.documentNumber,
      doc.sale?.legalRepresentativeCpf,
      lead?.cpfCnpj,
      doc.signerCpf,
    ]
      .map((val) => (val || "").replace(/\D/g, ""))
      .filter((val) => val.length > 0);

    const cleanProvidedCpf = (providedCpf || "").replace(/\D/g, "");

    if (candidateDocs.length > 0 && !candidateDocs.includes(cleanProvidedCpf)) {
      throw new BadRequestException(
        "O CPF/CNPJ informado não confere com o cadastro do titular ou representante legal."
      );
    }

    const targetEmail = lead?.email || doc.signerEmail;
    if (!targetEmail) {
      throw new BadRequestException(
        "Nenhum e-mail de contato cadastrado para envio do código de segurança. Contate seu consultor."
      );
    }

    // Gerar código numérico de 5 dígitos
    const otpCode = crypto.randomInt(10000, 99999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await this.prisma.saleDocument.update({
      where: { id: doc.id },
      data: {
        otpCode,
        otpExpiresAt,
        status: STATUS_OTP_SENT,
      },
    });

    const signerDisplayName =
      lead?.name || doc.sale?.legalRepresentativeName || doc.signerName || "Cliente";
    const companyName = doc.sale?.tenant?.name || "EnergivIA Soluções Solares";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Código de Segurança para Assinatura Eletrônica</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          Olá, <strong>${signerDisplayName}</strong>!
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          Você solicitou a validação para assinatura do documento <strong>"${doc.title}"</strong> junto à <strong>${companyName}</strong>.
        </p>
        <div style="background-color: #f1f5f9; padding: 18px; border-radius: 6px; text-align: center; margin: 25px 0;">
          <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1px; display: block; margin-bottom: 8px;">Seu Código de Verificação</span>
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #059669; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
          Este código expira em 15 minutos. Se você não solicitou este acesso, ignore esta mensagem com segurança.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Plataforma de Assinatura Eletrônica Segura · EnergivIA
        </p>
      </div>
    `;

    try {
      await this.emailService.sendEmail({
        to: targetEmail,
        subject: `${otpCode} é seu código de segurança para assinatura do contrato solar`,
        html: emailHtml,
      });
    } catch (err) {
      this.logger.error(`Erro ao disparar OTP para ${targetEmail}: ${err}`);
    }

    return {
      success: true,
      message: "Código de verificação enviado para seu e-mail.",
      emailMasked: maskEmail(targetEmail),
    };
  }

  async verifyOtp(publicToken: string, code: string) {
    const doc = await this.prisma.saleDocument.findUnique({
      where: { publicToken },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    if (!doc.otpCode || !doc.otpExpiresAt) {
      throw new BadRequestException("Nenhum código OTP ativo. Solicite um novo código.");
    }

    if (new Date() > doc.otpExpiresAt) {
      throw new BadRequestException("O código de verificação expirou. Solicite um novo envio.");
    }

    if (doc.otpCode !== code.trim()) {
      throw new BadRequestException("Código de verificação incorreto.");
    }

    await this.prisma.saleDocument.update({
      where: { id: doc.id },
      data: {
        otpVerifiedAt: new Date(),
      },
    });

    return {
      verified: true,
      message: "Identidade verificada com sucesso.",
    };
  }

  async signDocument(
    publicToken: string,
    dto: { signatureImage: string; signerName: string; signerCpf?: string },
    req: { ip?: string; headers?: Record<string, string | string[] | undefined> }
  ) {
    const doc = await this.prisma.saleDocument.findUnique({
      where: { publicToken },
      include: {
        sale: {
          include: {
            proposal: {
              include: {
                deal: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
            tenant: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    if (doc.status === STATUS_SIGNED) {
      return {
        signed: true,
        alreadySigned: true,
        signedAt: doc.signedAt,
        signedPdfHash: doc.signedPdfHash,
      };
    }

    if (!dto.signatureImage || !dto.signatureImage.startsWith("data:image")) {
      throw new BadRequestException("Imagem da rubrica/assinatura é obrigatória.");
    }

    const lead = doc.sale?.proposal?.deal?.lead;
    const signerName =
      dto.signerName?.trim() ||
      lead?.name ||
      doc.sale?.legalRepresentativeName ||
      doc.signerName ||
      "Signatário";
    const signerCpf =
      dto.signerCpf?.trim() ||
      doc.sale?.legalRepresentativeCpf ||
      doc.sale?.documentNumber ||
      lead?.cpfCnpj ||
      doc.signerCpf ||
      "—";
    const signerEmail = lead?.email || doc.signerEmail || "—";

    const forwarded = req.headers?.["x-forwarded-for"];
    const signerIp =
      (typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : null) ||
      req.ip ||
      "127.0.0.1";

    const signerUserAgent =
      (typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null) ||
      "Navegador Web / Mobile";

    const friendlyUserAgent = parseUserAgentFriendly(signerUserAgent);
    const signedAt = new Date();
    const signatureHash = crypto.randomUUID();

    // Construir o HTML completo assinado (Contrato + Bloco de Assinaturas Bilaterais + Folha de Auditoria)
    const fullSignedHtml = await this.buildFullDocumentHtml(doc, {
      isSigned: true,
      signerName,
      signerCpf,
      signerEmail,
      signerIp,
      signerUserAgent,
      friendlyUserAgent,
      signedAt,
      signatureHash,
      signatureImage: dto.signatureImage,
    });

    // Renderizar o documento completo assinado em PDF
    const { pdfBuffer: fullSignedPdfBuffer, sha256Hash: signedPdfHash } =
      await this.documentTemplateService.generatePdfWithHash(fullSignedHtml);

    // Salvar arquivo assinado no disco
    const signedFileName = `signed-${doc.id}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(signedFileName, fullSignedPdfBuffer);

    // Atualizar documento
    await this.prisma.saleDocument.update({
      where: { id: doc.id },
      data: {
        status: STATUS_SIGNED,
        signedAt,
        signerName,
        signerCpf,
        signerEmail,
        signerIp,
        signerUserAgent,
        signatureImage: dto.signatureImage,
        signatureHash,
        signedPdfUrl: `/uploads/sales-documents/${signedFileName}`,
        signedPdfHash,
      },
    });

    // Atualizar status da venda para SIGNED
    if (doc.sale?.id) {
      await this.prisma.sale.update({
        where: { id: doc.sale.id },
        data: { status: SALE_STATUS_SIGNED },
      });
    }

    return {
      signed: true,
      signedAt,
      signedPdfHash,
    };
  }

  async signCompanyDocument(
    tenantId: string,
    saleId: string,
    docId: string,
    signerUser: { id: string; name?: string; email?: string },
    req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
    dto: {
      signatureImage?: string;
      signerName?: string;
      signerCpf?: string;
      saveAsDefault?: boolean;
    }
  ) {
    const doc = await this.prisma.saleDocument.findFirst({
      where: { id: docId, saleId, tenantId },
      include: {
        sale: {
          include: {
            proposal: {
              include: {
                simulation: true,
                deal: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
            tenant: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado para esta venda.");
    }

    if (doc.companySignedAt) {
      throw new BadRequestException("Este documento já foi assinado pela empresa.");
    }

    const tenant = doc.sale?.tenant;
    let signatureImage = dto.signatureImage;
    if (!signatureImage && tenant?.representativeSignature) {
      signatureImage = tenant.representativeSignature;
    }

    if (!signatureImage) {
      throw new BadRequestException(
        "Nenhuma assinatura fornecida e a empresa não possui rubrica padrão cadastrada."
      );
    }

    const companySignerName =
      dto.signerName?.trim() ||
      tenant?.representativeName ||
      signerUser.name ||
      "Representante Legal";
    const companySignerEmail = signerUser.email || "—";
    const companySignerCpf = dto.signerCpf?.trim() || tenant?.representativeCpf || null;

    const forwarded = req?.headers?.["x-forwarded-for"];
    const companySignerIp =
      (typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : null) ||
      req?.ip ||
      "127.0.0.1";

    const companySignerUserAgent =
      (typeof req?.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null) ||
      "Navegador Web Corporativo";

    const companySignedAt = new Date();
    const companySignatureHash = crypto.randomUUID();

    if (dto.saveAsDefault || !tenant?.representativeSignature) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          representativeSignature: signatureImage,
          representativeName: companySignerName,
          ...(companySignerCpf ? { representativeCpf: companySignerCpf } : {}),
        },
      });
    }

    const updatedDoc = {
      ...doc,
      companySignedAt,
      companySignerName,
      companySignerEmail,
      companySignerCpf,
      companySignerIp,
      companySignerUserAgent,
      companySignatureImage: signatureImage,
      companySignatureHash,
    };

    const newHtml = await this.buildFullDocumentHtml(updatedDoc, undefined);

    const { pdfBuffer, sha256Hash } =
      await this.documentTemplateService.generatePdfWithHash(newHtml);

    const fileName = `company-signed-${doc.id}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(fileName, pdfBuffer);

    const saved = await this.prisma.saleDocument.update({
      where: { id: doc.id },
      data: {
        companySignedAt,
        companySignerName,
        companySignerEmail,
        companySignerCpf,
        companySignerIp,
        companySignerUserAgent,
        companySignatureImage: signatureImage,
        companySignatureHash,
        contentHtml: newHtml,
        originalPdfUrl: `/uploads/sales-documents/${fileName}`,
        originalPdfHash: sha256Hash,
      },
    });

    return {
      success: true,
      companySignedAt,
      companySignerName,
      companySignatureHash,
      pdfUrl: saved.originalPdfUrl,
    };
  }

  async buildFullDocumentHtml(
    doc: {
      title: string;
      publicToken: string;
      originalPdfHash?: string | null;
      templateType: string;
      createdAt?: Date | null;
      contentHtml?: string | null;
      companySignedAt?: Date | null;
      companySignerName?: string | null;
      companySignerEmail?: string | null;
      companySignerCpf?: string | null;
      companySignerIp?: string | null;
      companySignerUserAgent?: string | null;
      companySignatureImage?: string | null;
      companySignatureHash?: string | null;
      sale?: {
        investmentAmount?: number | null;
        rgNumber?: string | null;
        rgIssuer?: string | null;
        installationAddress?: string | null;
        installationCity?: string | null;
        installationState?: string | null;
        installationZip?: string | null;
        distributionCompany?: string | null;
        consumerUnitNumber?: string | null;
        systemPowerKwp?: number | null;
        paymentMethod?: string | null;
        sellerName?: string | null;
        legalRepresentativeName?: string | null;
        legalRepresentativeCpf?: string | null;
        documentNumber?: string | null;
        proposal?: {
          deal?: {
            lead?: {
              name?: string | null;
              email?: string | null;
              whatsapp?: string | null;
              cpfCnpj?: string | null;
            } | null;
          } | null;
        } | null;
        tenant?: {
          name?: string | null;
        } | null;
      } | null;
    },
    signMeta?: {
      isSigned: boolean;
      signerName: string;
      signerCpf: string;
      signerEmail: string;
      signerIp: string;
      signerUserAgent: string;
      friendlyUserAgent: string;
      signedAt: Date;
      signatureHash: string;
      signatureImage?: string | null;
    }
  ): Promise<string> {
    const lead = doc.sale?.proposal?.deal?.lead;
    const tenant = doc.sale?.tenant;
    const formattedDate = new Date(doc.createdAt || Date.now()).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const isSigned = Boolean(signMeta?.isSigned);
    let clientSignatureBlock = "";
    let companySignatureBlock = "";
    let companySignedAtFormatted = "";
    let auditSheetHtml = "";

    const hasCompanySigner = Boolean(doc.companySignedAt && doc.companySignatureImage);
    if (hasCompanySigner && doc.companySignedAt && doc.companySignatureImage) {
      const companySignedDate = new Date(doc.companySignedAt);
      companySignedAtFormatted = `${companySignedDate.toLocaleDateString("pt-BR")} às ${companySignedDate.toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "America/Sao_Paulo",
        }
      )} (Horário de Brasília)`;

      companySignatureBlock = `
        <div style="border: 1px solid #059669; background: #ffffff; border-radius: 6px; padding: 6px; text-align: center;">
          <img src="${doc.companySignatureImage}" style="max-height: 44px; max-width: 170px; object-fit: contain; display: block; margin: 0 auto;" />
          <div style="font-size: 7.5pt; font-weight: 700; color: #047857; margin-top: 2px;">
            ✓ Assinado em ${companySignedAtFormatted}
          </div>
          <div style="font-size: 6.5pt; font-family: monospace; color: #64748b;">
            Autenticação Corporativa · ${(doc.companySignatureHash || "").slice(0, 8)}...
          </div>
        </div>
      `;
    }

    if (isSigned && signMeta?.signatureImage) {
      const signedAtFormatted = `${signMeta.signedAt.toLocaleDateString("pt-BR")} às ${signMeta.signedAt.toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "America/Sao_Paulo",
        }
      )} (Horário de Brasília)`;

      clientSignatureBlock = `
        <div style="border: 1px solid #059669; background: #ffffff; border-radius: 6px; padding: 6px; text-align: center;">
          <img src="${signMeta.signatureImage}" style="max-height: 44px; max-width: 170px; object-fit: contain; display: block; margin: 0 auto;" />
          <div style="font-size: 7.5pt; font-weight: 700; color: #047857; margin-top: 2px;">
            ✓ Assinado em ${signedAtFormatted}
          </div>
          <div style="font-size: 6.5pt; font-family: monospace; color: #64748b;">
            Autenticação OTP · ${signMeta.signatureHash.slice(0, 8)}...
          </div>
        </div>
      `;

      if (hasCompanySigner) {
        auditSheetHtml = `
        <div style="page-break-before: always; margin-top: 0; padding-top: 10px;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 18px;">
            <div style="font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; color: #0f172a;">
              Certificado de Assinatura Eletrônica & Trilha de Auditoria Bilateral
            </div>
            <div style="font-size: 8.5pt; text-align: center; color: #64748b; margin-top: 2px;">
              Documento de Conformidade com o Marco Legal da Assinatura Digital (Lei 14.063/2020, MP 2.200-2/2001 e Art. 784, III do CPC)
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">1. Identificação do Documento</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Título do Documento:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.title}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Empresa Integradora:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${tenant?.name || "EnergivIA Soluções Solares"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Código de Rastreio (UUID):</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.publicToken}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="font-weight: 600; color: #475569; width: 35%;">Hash Original (SHA-256):</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.originalPdfHash || "—"}</span></div>
          </div>

          <!-- SIGNATÁRIO 1: CONTRATADA -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">2. Signatário 1 — CONTRATADA (Empresa Integradora)</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Razão Social / Nome:</span><span style="width: 65%; font-size: 9pt;">${tenant?.name || "Empresa Integradora"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Representante Autorizado:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.companySignerName || "Representante Legal"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">CPF do Representante:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.companySignerCpf ? maskCpf(doc.companySignerCpf) : "—"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">E-mail Corporativo:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.companySignerEmail || "—"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Endereço IP Registrado:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.companySignerIp || "—"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Ambiente / Navegador:</span><span style="width: 65%; font-size: 9pt;"><strong>${parseUserAgentFriendly(doc.companySignerUserAgent)}</strong></span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Data e Hora da Assinatura:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${companySignedAtFormatted}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Autenticação:</span><span style="width: 65%; font-size: 9pt;">Sessão Corporativa Autenticada na Plataforma EnergivIA</span></div>
            <div style="border: 1px dashed #059669; background: #ffffff; padding: 8px; text-align: center; border-radius: 4px; margin-top: 8px;">
              <span style="display: block; font-size: 7.5pt; color: #047857; margin-bottom: 3px; font-weight: 600;">Rubrica da Contratada:</span>
              <img src="${doc.companySignatureImage}" style="max-height: 50px; max-width: 220px; object-fit: contain;" />
            </div>
          </div>

          <!-- SIGNATÁRIO 2: CONTRATANTE -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">3. Signatário 2 — CONTRATANTE (Cliente Titular)</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Nome Completo:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerName}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">CPF / Documento:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerCpf}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">E-mail Cadastrado:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerEmail}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Endereço IP Registrado:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerIp}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Ambiente / Navegador:</span><span style="width: 65%; font-size: 9pt;"><strong>${signMeta.friendlyUserAgent}</strong><span style="display: block; font-size: 7pt; color: #64748b; font-family: monospace; word-break: break-all; margin-top: 1px;">Identificador Forense: ${signMeta.signerUserAgent}</span></span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Data e Hora da Assinatura:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signedAtFormatted}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Validação OTP:</span><span style="width: 65%; font-size: 9pt;">Confirmado com sucesso via código de 5 dígitos enviado por e-mail</span></div>

            <div style="border: 1px dashed #94a3b8; background: #ffffff; padding: 8px; text-align: center; border-radius: 4px; margin-top: 8px;">
              <span style="display: block; font-size: 7.5pt; color: #64748b; margin-bottom: 3px;">Rubrica do Cliente:</span>
              <img src="${signMeta.signatureImage}" style="max-height: 50px; max-width: 220px; object-fit: contain;" />
            </div>
          </div>

          <!-- INTEGRIDADE CRIPTOGRÁFICA -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">4. Integridade Criptográfica e Não-Repúdio</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">ID da Transação (Contratada):</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.companySignatureHash || "—"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">ID da Transação (Contratante):</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signatureHash}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="font-weight: 600; color: #475569; width: 35%;">Padrão Tecnológico:</span><span style="width: 65%; font-size: 9pt;">Carimbo do Tempo UTC com Duplo Hash SHA-256</span></div>
          </div>

          <div style="font-size: 7.5pt; color: #475569; text-align: justify; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 15px;">
            <strong>ENQUADRAMENTO LEGAL:</strong> O presente documento eletrônico possui plena eficácia probatória e validade jurídica entre as partes signatárias, atendendo integralmente ao disposto no Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e na Lei Federal nº 14.063/2020 (Assinatura Eletrônica Avançada Bilateral) e constituindo Título Executivo Extrajudicial nos termos do Art. 784, III do Código de Processo Civil. A integridade do conteúdo e a autoria das partes foram comprovadas mediante autenticação em duas etapas e registro forense inviolável de IP, data/hora e metadados.
          </div>
        </div>
      `;
      } else {
        auditSheetHtml = `
        <div style="page-break-before: always; margin-top: 0; padding-top: 10px;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 18px;">
            <div style="font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; color: #0f172a;">
              Certificado de Assinatura Eletrônica & Trilha de Auditoria
            </div>
            <div style="font-size: 8.5pt; text-align: center; color: #64748b; margin-top: 2px;">
              Documento de Conformidade com o Marco Legal da Assinatura Digital (Lei 14.063/2020 e MP 2.200-2/2001)
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">1. Identificação do Documento</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Título do Documento:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.title}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Empresa Integradora:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${tenant?.name || "EnergivIA Soluções Solares"}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Código de Rastreio (UUID):</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.publicToken}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="font-weight: 600; color: #475569; width: 35%;">Hash Original (SHA-256):</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${doc.originalPdfHash || "—"}</span></div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">2. Dados do Signatário e Autenticação</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Nome Completo:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerName}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">CPF / Documento:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerCpf}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">E-mail Cadastrado:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerEmail}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Endereço IP Registrado:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signerIp}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Ambiente / Navegador:</span><span style="width: 65%; font-size: 9pt;"><strong>${signMeta.friendlyUserAgent}</strong><span style="display: block; font-size: 7pt; color: #64748b; font-family: monospace; word-break: break-all; margin-top: 1px;">Identificador Forense: ${signMeta.signerUserAgent}</span></span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Data e Hora da Assinatura:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signedAtFormatted}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">Validação OTP:</span><span style="width: 65%; font-size: 9pt;">Confirmado com sucesso via código de 5 dígitos enviado por e-mail</span></div>

            <div style="border: 1px dashed #94a3b8; background: #ffffff; padding: 8px; text-align: center; border-radius: 4px; margin-top: 8px;">
              <span style="display: block; font-size: 7.5pt; color: #64748b; margin-bottom: 3px;">Rubrica Capturada Digitalmente:</span>
              <img src="${signMeta.signatureImage}" style="max-height: 60px; max-width: 240px; object-fit: contain;" />
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 9pt;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 8px; text-transform: uppercase; font-size: 8.5pt;">3. Integridade Criptográfica</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569; width: 35%;">ID da Transação:</span><span style="width: 65%; font-family: monospace; font-size: 9pt;">${signMeta.signatureHash}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="font-weight: 600; color: #475569; width: 35%;">Padrão Tecnológico:</span><span style="width: 65%; font-size: 9pt;">Carimbo do Tempo UTC com Duplo Hash SHA-256</span></div>
          </div>

          <div style="font-size: 7.5pt; color: #475569; text-align: justify; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 15px;">
            <strong>ENQUADRAMENTO LEGAL:</strong> O presente documento eletrônico possui plena eficácia probatória e validade jurídica entre as partes signatárias, atendendo integralmente ao disposto no Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e na Lei Federal nº 14.063/2020 (Assinatura Eletrônica Avançada). A integridade do conteúdo e a autoria do signatário foram comprovadas mediante verificação em dois fatores (conferência do número de CPF, código OTP de uso único transmitido por e-mail e registro forense de IP, data/hora e metadados).
          </div>
        </div>
      `;
      }
    }

    // Se o documento foi editado e possui contentHtml personalizado, utilizá-lo diretamente como base
    if (doc.contentHtml && typeof doc.contentHtml === "string" && doc.contentHtml.trim()) {
      let customHtml = doc.contentHtml.trim();
      const template = String(doc.templateType).startsWith("CONTRATO")
        ? CONTRACT_PF_TEMPLATE
        : POWER_OF_ATTORNEY_PF_TEMPLATE;
      const headMatch = template.match(/<head[\s\S]*?<\/head>/i);
      const headHtml = headMatch ? headMatch[0] : "<head><meta charset='UTF-8'></head>";
      let cleanBody = customHtml
        .replace(/<head[\s\S]*?<\/head>/gi, "")
        .replace(/<\/?(html|body|!DOCTYPE)[^>]*>/gi, "")
        .trim();

      // Limpar quebras artificiais rígidas legadas antes das cláusulas 5, 9 e 15 que deixavam 70% da folha em branco
      cleanBody = cleanBody
        .replace(
          /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*5\.|<div class="section-title">\s*5\.))/gi,
          ""
        )
        .replace(
          /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*9\.|<div class="section-title">\s*9\.))/gi,
          ""
        )
        .replace(
          /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*15\.|<div class="section-title">\s*15\.))/gi,
          ""
        );

      customHtml = `<!DOCTYPE html>\n<html lang="pt-BR">\n${headHtml}\n<body>\n${cleanBody}\n</body>\n</html>`;

      // Atualizar bloco da empresa
      if (companySignatureBlock) {
        if (customHtml.includes("{{bloco_assinatura_empresa}}")) {
          customHtml = customHtml.replace(
            /\{\{bloco_assinatura_empresa\}\}/g,
            companySignatureBlock
          );
        } else {
          const waitingCompanyRegex =
            /<div style="[^"]*border:\s*1px dashed #d97706[^"]*">[\s\S]*?Aguardando Assinatura do Integrador[\s\S]*?<\/div>\s*<\/div>/i;
          if (waitingCompanyRegex.test(customHtml)) {
            customHtml = customHtml.replace(waitingCompanyRegex, companySignatureBlock);
          } else {
            const legacyCompanyBoxRegex =
              /<div style="border:\s*1px dashed #059669;\s*background:\s*#ecfdf5;[\s\S]*?✓ ASSINADO DIGITALMENTE[\s\S]*?<\/div>\s*<\/div>/i;
            if (legacyCompanyBoxRegex.test(customHtml)) {
              customHtml = customHtml.replace(legacyCompanyBoxRegex, companySignatureBlock);
            }
          }
        }
      } else if (customHtml.includes("{{bloco_assinatura_empresa}}")) {
        const waitingCompanyBlock = `<div style="border: 1px dashed #d97706; background: #fffbeb; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 700; color: #b45309; text-transform: uppercase;">
            Aguardando Assinatura do Integrador
          </div>
          <div style="font-size: 7pt; color: #92400e; margin-top: 2px;">
            Assinatura formal da Contratada pendente no painel
          </div>
        </div>`;
        customHtml = customHtml.replace(/\{\{bloco_assinatura_empresa\}\}/g, waitingCompanyBlock);
      }

      if (clientSignatureBlock) {
        if (customHtml.includes("{{bloco_assinatura_cliente}}")) {
          customHtml = customHtml.replace(
            /\{\{bloco_assinatura_cliente\}\}/g,
            clientSignatureBlock
          );
        } else if (
          !customHtml.includes("✓ Assinado em") &&
          !customHtml.includes("Rubrica Capturada Digitalmente")
        ) {
          // Se houver a caixa de "Aguardando Assinatura", substituir no local exato para evitar duplicação no rodapé
          const waitingBoxRegex =
            /<div style="[^"]*border:\s*1px dashed #94a3b8[^"]*">[\s\S]*?Aguardando Assinatura Eletrônica[\s\S]*?<\/div>\s*<\/div>/i;
          if (waitingBoxRegex.test(customHtml)) {
            customHtml = customHtml.replace(waitingBoxRegex, clientSignatureBlock);
          } else {
            customHtml = customHtml.replace(
              /(<\/body>|$)/i,
              `<div style="margin-top: 20px;">${clientSignatureBlock}</div>$1`
            );
          }
        }
      }
      if (auditSheetHtml) {
        if (customHtml.includes("{{folha_auditoria_anexa}}")) {
          customHtml = customHtml.replace(/\{\{folha_auditoria_anexa\}\}/g, auditSheetHtml);
        } else if (
          !customHtml.includes("Certificado de Assinatura Eletrônica") &&
          !customHtml.includes("Trilha de Auditoria")
        ) {
          if (customHtml.includes("</body>")) {
            customHtml = customHtml.replace("</body>", `${auditSheetHtml}</body>`);
          } else {
            customHtml += auditSheetHtml;
          }
        }
      }
      return customHtml;
    }

    const signerNameResolved =
      signMeta?.signerName || lead?.name || doc.sale?.legalRepresentativeName || "Cliente";

    const signerCpfResolved =
      signMeta?.signerCpf ||
      doc.sale?.legalRepresentativeCpf ||
      doc.sale?.documentNumber ||
      lead?.cpfCnpj ||
      "—";

    const data = await this.documentTemplateService.prepareContractVariables({
      sale: doc.sale,
      tenant,
      lead,
      formattedDate,
      companySignatureBlock: companySignatureBlock || undefined,
      clientSignatureBlock: clientSignatureBlock || undefined,
      auditSheetHtml: auditSheetHtml || undefined,
    });

    if (signerNameResolved && signerNameResolved !== "Cliente") {
      data["nome_cliente"] = signerNameResolved;
    }
    if (signerCpfResolved && signerCpfResolved !== "—") {
      data["cpf_cliente"] = signerCpfResolved;
    }

    return this.documentTemplateService.buildDocumentHtml(
      doc.templateType as DocumentType,
      data,
      tenant
    );
  }

  async getDocumentPdf(
    publicToken: string,
    forceRegenerate = false
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.prisma.saleDocument.findUnique({
      where: { publicToken },
      include: {
        sale: {
          include: {
            proposal: {
              include: {
                simulation: true,
                deal: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
            tenant: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    const isSigned = doc.status === STATUS_SIGNED;
    const targetUrl = isSigned && doc.signedPdfUrl ? doc.signedPdfUrl : doc.originalPdfUrl;

    if (!forceRegenerate && isSigned && targetUrl) {
      const fileName = targetUrl.split("/").pop();
      if (fileName) {
        const diskBuffer = this.documentTemplateService.getPdfFromDisk(fileName);
        // Retornar arquivo do disco apenas se já for assinado e tiver mais de 80KB (indicando contrato completo + auditoria)
        if (diskBuffer && diskBuffer.length > 80000) {
          return {
            buffer: diskBuffer,
            filename: `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}${isSigned ? "_assinado" : ""}.pdf`,
          };
        }
      }
    }

    // Regerar PDF completo dinamicamente
    if (doc.sale) {
      try {
        const signMeta = isSigned
          ? {
              isSigned: true,
              signerName: doc.signerName || "Signatário",
              signerCpf: doc.signerCpf || "—",
              signerEmail: doc.signerEmail || "—",
              signerIp: doc.signerIp || "127.0.0.1",
              signerUserAgent: doc.signerUserAgent || "Navegador Web",
              friendlyUserAgent: parseUserAgentFriendly(doc.signerUserAgent || ""),
              signedAt: doc.signedAt || doc.updatedAt,
              signatureHash: doc.signatureHash || doc.publicToken,
              signatureImage: doc.signatureImage,
            }
          : undefined;

        const html = await this.buildFullDocumentHtml(doc, signMeta);
        const { pdfBuffer } = await this.documentTemplateService.generatePdfWithHash(html);

        // Se for assinado, salvar a versão completa atualizada no disco para os próximos downloads
        if (isSigned && doc.signedPdfUrl) {
          const fileName = doc.signedPdfUrl.split("/").pop();
          if (fileName) {
            this.documentTemplateService.savePdfToDisk(fileName, pdfBuffer);
          }
        }

        return {
          buffer: pdfBuffer,
          filename: `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}${isSigned ? "_assinado" : ""}.pdf`,
        };
      } catch (err) {
        this.logger.warn(`Erro ao regerar PDF em fallback para token ${publicToken}: ${err}`);
      }
    }

    const dummyPdf = Buffer.from("%PDF-1.4 Mock Contract Content");
    return {
      buffer: dummyPdf,
      filename: `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
    };
  }
}
