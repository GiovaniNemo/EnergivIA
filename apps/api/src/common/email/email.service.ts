import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { buildOrganizationInviteTemplate } from "./templates/organization-invite.template";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendOrganizationInviteEmail(input: {
    toEmail: string;
    organizationName: string;
    inviterName: string;
  }) {
    const from = this.config.get<string>("INVITE_EMAIL_FROM");
    const awsRegion = this.config.get<string>("AWS_REGION");
    const appBaseUrl = this.config.get<string>("APP_BASE_URL") ?? "http://localhost:3000";
    const loginUrl = `${appBaseUrl.replace(/\/$/, "")}/auth/login`;

    if (!from || !awsRegion) {
      this.logger.warn(
        `Invite email not sent (missing AWS_REGION or INVITE_EMAIL_FROM). Recipient: ${input.toEmail}`
      );
      return;
    }

    const { subject, text, html } = buildOrganizationInviteTemplate({
      inviterName: input.inviterName,
      organizationName: input.organizationName,
      loginUrl,
    });

    try {
      const ses = new SESv2Client({ region: awsRegion });
      const command = new SendEmailCommand({
        FromEmailAddress: from,
        Destination: {
          ToAddresses: [input.toEmail],
        },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: text, Charset: "UTF-8" },
              Html: { Data: html, Charset: "UTF-8" },
            },
          },
        },
      });

      await ses.send(command);
    } catch (error) {
      this.logger.warn(
        `Invite email request failed for ${input.toEmail}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
