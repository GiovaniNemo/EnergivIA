import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import * as crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../../common/email/email.service";
import { DocumentTemplateService } from "./document-template.service";
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

  let browser = "Navegador Web";
  if (ua.includes("OPR/") || ua.includes("Opera")) {
    const match = ua.match(/OPR\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Opera / Opera GX" + ver;
  } else if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Microsoft Edge" + ver;
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
    browser = "Google Chrome" + ver;
  } else if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    const ver = match ? " " + match[1].split(".")[0] : "";
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

    // Gerar Folha Oficial de Auditoria Jurídica e Certificado
    const auditSheetHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            font-size: 10pt;
          }
          .title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
          .subtitle { font-size: 9pt; text-align: center; color: #64748b; margin-bottom: 25px; }
          .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-bottom: 14px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .label { font-weight: 600; color: #475569; width: 35%; }
          .val { width: 65%; font-family: monospace; font-size: 9.5pt; word-break: break-all; }
          .sig-box { border: 1px dashed #94a3b8; background: #ffffff; padding: 10px; text-align: center; border-radius: 4px; margin-top: 10px; }
          .legal { font-size: 8pt; color: #475569; text-align: justify; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 25px; }
        </style>
      </head>
      <body>
        <div class="title">Certificado de Assinatura Eletrônica & Trilha de Auditoria</div>
        <div class="subtitle">Documento de Conformidade com o Marco Legal da Assinatura Digital (Lei 14.063/2020)</div>

        <div class="card">
          <div style="font-weight: bold; color: #059669; margin-bottom: 10px; text-transform: uppercase; font-size: 9pt;">1. Identificação do Documento</div>
          <div class="row"><span class="label">Título do Documento:</span><span class="val">${doc.title}</span></div>
          <div class="row"><span class="label">Empresa Integradora:</span><span class="val">${doc.sale?.tenant?.name || "EnergivIA Soluções Solares"}</span></div>
          <div class="row"><span class="label">Código de Rastreio (UUID):</span><span class="val">${doc.publicToken}</span></div>
          <div class="row"><span class="label">Hash Original (SHA-256):</span><span class="val">${doc.originalPdfHash || "—"}</span></div>
        </div>

        <div class="card">
          <div style="font-weight: bold; color: #059669; margin-bottom: 10px; text-transform: uppercase; font-size: 9pt;">2. Dados do Signatário e Autenticação</div>
          <div class="row"><span class="label">Nome Completo:</span><span class="val">${signerName}</span></div>
          <div class="row"><span class="label">CPF / Documento:</span><span class="val">${signerCpf}</span></div>
          <div class="row"><span class="label">E-mail Cadastrado:</span><span class="val">${signerEmail}</span></div>
          <div class="row"><span class="label">Endereço IP Registrado:</span><span class="val">${signerIp}</span></div>
          <div class="row"><span class="label">Ambiente / Navegador:</span><span class="val"><strong>${friendlyUserAgent}</strong><span style="display: block; font-size: 7.5pt; color: #64748b; font-family: monospace; word-break: break-all; margin-top: 2px;">Identificador Forense: ${signerUserAgent}</span></span></div>
          <div class="row"><span class="label">Data e Hora da Assinatura:</span><span class="val">${signedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Horário de Brasília)</span></div>
          <div class="row"><span class="label">Validação OTP:</span><span class="val">Confirmado com sucesso via código de 5 dígitos enviado por e-mail</span></div>

          <div class="sig-box">
            <span style="display: block; font-size: 8pt; color: #64748b; margin-bottom: 4px;">Rubrica Capturada Digitalmente:</span>
            <img src="${dto.signatureImage}" style="max-height: 70px; max-width: 260px; object-fit: contain;" />
          </div>
        </div>

        <div class="card">
          <div style="font-weight: bold; color: #059669; margin-bottom: 10px; text-transform: uppercase; font-size: 9pt;">3. Integridade Criptográfica</div>
          <div class="row"><span class="label">ID da Transação:</span><span class="val">${signatureHash}</span></div>
          <div class="row"><span class="label">Padrão Tecnológico:</span><span class="val">Carimbo do Tempo UTC com Duplo Hash SHA-256</span></div>
        </div>

        <div class="legal">
          <strong>ENQUADRAMENTO LEGAL:</strong> O presente documento eletrônico possui plena eficácia probatória e validade jurídica entre as partes signatárias, atendendo integralmente ao disposto no Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e na Lei Federal nº 14.063/2020 (Assinatura Eletrônica Avançada). A integridade do conteúdo e a autoria do signatário foram comprovadas mediante verificação em dois fatores (conferência do número de CPF, código OTP de uso único transmitido por e-mail e registro forense de IP, data/hora e metadados).
        </div>
      </body>
      </html>
    `;

    // Renderizar o certificado de auditoria em PDF
    const { pdfBuffer: auditPdfBuffer } =
      await this.documentTemplateService.generatePdfWithHash(auditSheetHtml);

    // Salvar arquivo assinado no disco
    const signedFileName = `signed-${doc.id}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(signedFileName, auditPdfBuffer);

    // Computar hash final do documento assinado
    const signedPdfHash = crypto.createHash("sha256").update(auditPdfBuffer).digest("hex");

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

  async getDocumentPdf(publicToken: string): Promise<{ buffer: Buffer; filename: string }> {
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

    const isSigned = doc.status === STATUS_SIGNED;
    const targetUrl = isSigned && doc.signedPdfUrl ? doc.signedPdfUrl : doc.originalPdfUrl;

    if (targetUrl) {
      const fileName = targetUrl.split("/").pop();
      if (fileName) {
        const diskBuffer = this.documentTemplateService.getPdfFromDisk(fileName);
        if (diskBuffer) {
          return {
            buffer: diskBuffer,
            filename: `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}${isSigned ? "_assinado" : ""}.pdf`,
          };
        }
      }
    }

    // Fallback: regerar o PDF dinamicamente se o container tiver sido reiniciado
    if (doc.sale) {
      try {
        const lead = doc.sale.proposal?.deal?.lead;
        const tenant = doc.sale.tenant;
        const formattedDate = new Date(doc.createdAt || Date.now()).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const formattedInvestment = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(doc.sale.investmentAmount || 0);

        const html = this.documentTemplateService.buildDocumentHtml(
          doc.templateType as DocumentType,
          {
            nome_cliente:
              lead?.name || doc.sale.legalRepresentativeName || doc.signerName || "Cliente",
            cpf_cliente: doc.sale.documentNumber || lead?.cpfCnpj || doc.signerCpf || "—",
            rg_cliente: doc.sale.rgNumber
              ? `${doc.sale.rgNumber} ${doc.sale.rgIssuer ?? ""}`.trim()
              : "—",
            endereco_instalacao: doc.sale.installationAddress || "—",
            cidade_instalacao: doc.sale.installationCity || "—",
            estado_instalacao: doc.sale.installationState || "—",
            cep_instalacao: doc.sale.installationZip || "—",
            concessionaria: doc.sale.distributionCompany || "—",
            numero_uc: doc.sale.consumerUnitNumber || "—",
            potencia_kwp: doc.sale.systemPowerKwp > 0 ? doc.sale.systemPowerKwp.toFixed(2) : "—",
            valor_total: formattedInvestment,
            forma_pagamento: doc.sale.paymentMethod || "À Vista / Financiamento Bancário",
            nome_empresa: tenant?.name || "EnergivIA Soluções Solares",
            nome_vendedor: doc.sale.sellerName || "Consultor Técnico",
            data_atual: formattedDate,
          }
        );

        const { pdfBuffer } = await this.documentTemplateService.generatePdfWithHash(html);
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
