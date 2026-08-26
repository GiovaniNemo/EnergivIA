import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { buildOrganizationInviteTemplate } from "./templates/organization-invite.template";

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

  constructor(private readonly config: ConfigService) {
    this.getSmtpTransporter();
  }

  private getSmtpTransporter(): Transporter | null {
    if (this.smtpTransporter) return this.smtpTransporter;

    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 465);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    const secure = this.config.get<string>("SMTP_SECURE") === "true" || port === 465;

    if (host && user && pass) {
      this.smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
      this.logger.log(`SMTP transporter initialized with host: ${host}:${port} (User: ${user})`);
    }

    return this.smtpTransporter;
  }

  /**
   * Generic method to send emails via Zoho SMTP (or fallback to AWS SES / logger)
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const defaultFrom =
      this.config.get<string>("SMTP_FROM") ||
      this.config.get<string>("INVITE_EMAIL_FROM") ||
      "EnergivIA <noreply@energivia.com.br>";
    const from = options.from || defaultFrom;

    const transporter = this.getSmtpTransporter();

    // 1. Try Zoho SMTP if configured
    if (transporter) {
      try {
        await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        this.logger.log(`Email successfully sent via SMTP to ${options.to}`);
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send email via SMTP to ${options.to}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined
        );
      }
    }

    // 2. Fallback to AWS SES if configured
    const awsRegion = this.config.get<string>("AWS_REGION");
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

    // If neither configured or both failed
    if (!this.smtpTransporter && !awsRegion) {
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
    const appBaseUrl = this.config.get<string>("APP_BASE_URL") ?? "http://localhost:3000";
    const loginUrl = `${appBaseUrl.replace(/\/$/, "")}/auth/login`;

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
}
