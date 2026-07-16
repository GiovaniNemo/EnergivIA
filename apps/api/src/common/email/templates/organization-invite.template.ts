export interface OrganizationInviteTemplateInput {
  inviterName: string;
  organizationName: string;
  loginUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildOrganizationInviteTemplate(input: OrganizationInviteTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const inviterName = escapeHtml(input.inviterName);
  const organizationName = escapeHtml(input.organizationName);
  const safeLoginUrl = escapeHtml(input.loginUrl);

  const subject = `Convite para a organização ${input.organizationName}`;
  const text = [
    `Olá!`,
    ``,
    `${input.inviterName} convidou você para participar da organização "${input.organizationName}" no Energivia.`,
    `Entre na sua conta para aceitar automaticamente o convite:`,
    input.loginUrl,
    ``,
    `Se você ainda não tiver conta, faça cadastro com este mesmo e-mail e o convite será vinculado automaticamente.`,
  ].join("\n");

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0; padding:0; background-color:#f3f5f9;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f5f9; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="background:#0f172a; padding:20px 24px; font-family:Arial, sans-serif;">
                <div style="color:#ffffff; font-size:20px; font-weight:700;">Energivia</div>
                <div style="color:#cbd5e1; margin-top:4px; font-size:13px;">Convite de organização</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px; font-family:Arial, sans-serif; color:#0f172a;">
                <p style="margin:0 0 16px; font-size:15px;">Olá!</p>
                <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
                  <strong>${inviterName}</strong> convidou você para participar da organização
                  <strong>${organizationName}</strong> no Energivia.
                </p>
                <p style="margin:0 0 20px; font-size:15px; line-height:1.6;">
                  Para aceitar o convite, entre com sua conta usando o botão abaixo.
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="border-radius:8px; background:#2563eb;">
                      <a href="${safeLoginUrl}" style="display:inline-block; padding:12px 20px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; font-family:Arial, sans-serif;">
                        Entrar no Energivia
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px; color:#6b7280; font-size:13px;">
                  Se o botão não funcionar, copie e cole este link no navegador:
                </p>
                <p style="margin:0 0 16px; font-size:13px;">
                  <a href="${safeLoginUrl}" style="color:#2563eb; word-break:break-all;">${safeLoginUrl}</a>
                </p>

                <p style="margin:0; color:#6b7280; font-size:13px; line-height:1.6;">
                  Se você ainda não tiver conta, faça o cadastro com este mesmo e-mail.
                  O convite será vinculado automaticamente após o login.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px; background:#f8fafc; border-top:1px solid #e5e7eb; font-family:Arial, sans-serif; color:#64748b; font-size:12px;">
                Este é um e-mail transacional do Energivia.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { subject, text, html };
}
