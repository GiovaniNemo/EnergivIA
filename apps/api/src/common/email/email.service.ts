import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { buildOrganizationInviteTemplate } from "./templates/organization-invite.template";
import { buildWelcomeTemplate } from "./templates/welcome.template";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private smtpTransporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private cleanEnv(key: string): string | undefined {
    const raw = this.config.get<string>(key) ?? process.env[key];
    if (!raw) return undefined;
    const trimmed = raw
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private createSmtpTransporter(port: number, secure: boolean): Transporter | null {
    const host = this.cleanEnv("SMTP_HOST") ?? "smtp.zoho.com";
    const user = this.cleanEnv("SMTP_USER");
    const pass = this.cleanEnv("SMTP_PASS");

    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  private getSmtpTransporter(): Transporter | null {
    if (this.smtpTransporter) return this.smtpTransporter;

    const rawPort = this.cleanEnv("SMTP_PORT");
    const port = rawPort ? Number(rawPort) : 465;
    const secure = this.cleanEnv("SMTP_SECURE") === "true" || port === 465;

    this.smtpTransporter = this.createSmtpTransporter(port, secure);
    if (this.smtpTransporter) {
      const host = this.cleanEnv("SMTP_HOST") ?? "smtp.zoho.com";
      const user = this.cleanEnv("SMTP_USER");
      this.logger.log(`SMTP transporter initialized with host: ${host}:${port} (User: ${user})`);
    }
    return this.smtpTransporter;
  }

  /**
   * Generic method to send emails via Zoho SMTP (with port fallback) or AWS SES
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const defaultFrom =
      this.cleanEnv("SMTP_FROM") ||
      this.cleanEnv("INVITE_EMAIL_FROM") ||
      "EnergivIA <noreply@energivia.com.br>";
    const from = options.from || defaultFrom;

    const user = this.cleanEnv("SMTP_USER");
    const pass = this.cleanEnv("SMTP_PASS");

    // 1. Try Primary SMTP
    if (user && pass) {
      const rawPort = this.cleanEnv("SMTP_PORT");
      const primaryPort = rawPort ? Number(rawPort) : 465;
      const primarySecure = this.cleanEnv("SMTP_SECURE") === "true" || primaryPort === 465;

      try {
        const primaryTransporter = this.createSmtpTransporter(primaryPort, primarySecure);
        if (primaryTransporter) {
          const info = await primaryTransporter.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
          });
          this.logger.log(
            `Email successfully sent via SMTP (${primaryPort}) to ${options.to}: ${info.messageId}`
          );
          return true;
        }
      } catch (primaryError) {
        this.logger.warn(
          `Failed to send email via primary SMTP port ${primaryPort}: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Trying fallback port...`
        );

        // Fallback port attempt (if 465 failed, try 587; if 587 failed, try 465)
        const fallbackPort = primaryPort === 465 ? 587 : 465;
        const fallbackSecure = fallbackPort === 465;
        try {
          const fallbackTransporter = this.createSmtpTransporter(fallbackPort, fallbackSecure);
          if (fallbackTransporter) {
            const info = await fallbackTransporter.sendMail({
              from,
              to: options.to,
              subject: options.subject,
              text: options.text,
              html: options.html,
            });
            this.logger.log(
              `Email successfully sent via fallback SMTP (${fallbackPort}) to ${options.to}: ${info.messageId}`
            );
            return true;
          }
        } catch (fallbackError) {
          this.logger.error(
            `Failed to send email via fallback SMTP (${fallbackPort}) to ${options.to}: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
          );
        }
      }
    }

    // 2. Fallback to AWS SES if configured
    const awsRegion = this.cleanEnv("AWS_REGION");
    if (awsRegion) {
      try {
        const ses = new SESv2Client({ region: awsRegion });
        const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
        const command = new SendEmailCommand({
          FromEmailAddress: from,
          Destination: {
            ToAddresses: toAddresses,
          },
          Content: {
            Simple: {
              Subject: { Data: options.subject, Charset: "UTF-8" },
              Body: {
                Text: options.text ? { Data: options.text, Charset: "UTF-8" } : undefined,
                Html: options.html ? { Data: options.html, Charset: "UTF-8" } : undefined,
              },
            },
          },
        });
        await ses.send(command);
        this.logger.log(`Email successfully sent via AWS SES to ${options.to}`);
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send email via AWS SES to ${options.to}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (!user && !awsRegion) {
      this.logger.warn(
        `Email not sent (missing SMTP or AWS SES config). Recipient: ${options.to} | Subject: ${options.subject}`
      );
    }

    return false;
  }

  async sendOrganizationInviteEmail(input: {
    toEmail: string;
    organizationName: string;
    inviterName: string;
  }) {
    const appBaseUrl = this.cleanEnv("APP_BASE_URL") ?? "https://energivia.com.br";
    const loginUrl = `${appBaseUrl.replace(/\/$/, "")}/login`;

    const { subject, text, html } = buildOrganizationInviteTemplate({
      inviterName: input.inviterName,
      organizationName: input.organizationName,
      loginUrl,
    });

    await this.sendEmail({
      to: input.toEmail,
      subject,
      text,
      html,
    });
  }

  async sendWelcomeEmail(input: { toEmail: string; userName?: string }) {
    const appBaseUrl = this.cleanEnv("APP_BASE_URL") ?? "https://energivia.com.br";
    const loginUrl = `${appBaseUrl.replace(/\/$/, "")}/login`;

    const { subject, text, html } = buildWelcomeTemplate({
      userName: input.userName,
      loginUrl,
    });

    await this.sendEmail({
      to: input.toEmail,
      subject,
      text,
      html,
    });
  }

  async runDiagnostics(toEmail: string) {
    const host = this.cleanEnv("SMTP_HOST") ?? "smtp.zoho.com";
    const user = this.cleanEnv("SMTP_USER");
    const pass = this.cleanEnv("SMTP_PASS");
    const rawPort = this.cleanEnv("SMTP_PORT");
    const port = rawPort ? Number(rawPort) : 465;

    const diagnostics = {
      smtpHost: host,
      smtpPort: port,
      smtpUser: user ? `${user.slice(0, 3)}***@${user.split("@")[1] ?? ""}` : "MISSING",
      hasPass: !!pass,
      passLength: pass?.length ?? 0,
      toEmail,
      port465Test: "pending",
      port587Test: "pending",
      sendResult: false,
      error: null as string | null,
    };

    if (!user || !pass) {
      diagnostics.error = "SMTP_USER or SMTP_PASS not found in environment variables";
      return diagnostics;
    }

    // Test verify port 465
    try {
      const t465 = this.createSmtpTransporter(465, true);
      if (t465) {
        await t465.verify();
        diagnostics.port465Test = "OK";
      }
    } catch (e: unknown) {
      diagnostics.port465Test = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Test verify port 587
    try {
      const t587 = this.createSmtpTransporter(587, false);
      if (t587) {
        await t587.verify();
        diagnostics.port587Test = "OK";
      }
    } catch (e: unknown) {
      diagnostics.port587Test = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Try sending email
    try {
      const ok = await this.sendEmail({
        to: toEmail,
        subject: `[EnergivIA] Teste de Diagnóstico SMTP - ${new Date().toLocaleTimeString("pt-BR")}`,
        text: `Teste de envio de e-mail de diagnóstico da plataforma EnergivIA para ${toEmail}.`,
        html: `<p>Teste de envio de e-mail de diagnóstico da plataforma <b>EnergivIA</b> para <code>${toEmail}</code>.</p>`,
      });
      diagnostics.sendResult = ok;
    } catch (e: unknown) {
      diagnostics.error = e instanceof Error ? e.message : String(e);
    }

    return diagnostics;
  }
}
