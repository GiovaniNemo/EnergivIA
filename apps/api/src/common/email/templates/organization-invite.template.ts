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
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Convite para a organização ${organizationName}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0b0f19; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19; padding:32px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            
            <!-- Header com Logo Oficial -->
            <tr>
              <td style="background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%); padding:28px 30px; text-align:left;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size:24px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                        Energiv<span style="color:#a7f3d0;">IA</span>
                      </div>
                      <div style="color:#ecfdf5; font-size:13px; font-weight:500; margin-top:4px;">
                        Convite para fazer parte da equipe 👥
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Corpo Principal -->
            <tr>
              <td style="padding:32px 30px; color:#f3f4f6;">
                <h1 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#ffffff;">
                  Olá! 👋
                </h1>
                
                <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#d1d5db;">
                  <strong>${inviterName}</strong> convidou você para participar da organização
                  <strong style="color:#34d399;">${organizationName}</strong> na plataforma <strong>EnergivIA</strong>.
                </p>

                <!-- Destaque do Convite -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px; background:#1f2937; border-radius:12px; padding:18px; border:1px solid #374151;">
                  <tr>
                    <td>
                      <div style="font-size:13px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                        Organização
                      </div>
                      <div style="font-size:17px; font-weight:700; color:#ffffff; margin-bottom:12px;">
                        ${organizationName}
                      </div>
                      <div style="font-size:13px; color:#9ca3af; line-height:1.5;">
                        Ao aceitar o convite, você terá acesso aos projetos, propostas, dimensionamentos e funil de vendas compartilhado da sua equipe.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Botão de Ação -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px; text-align:center;">
                  <tr>
                    <td style="border-radius:10px; background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
                      <a href="${safeLoginUrl}" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
                        Aceitar Convite e Entrar ➔
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px; color:#9ca3af; font-size:13px; text-align:center;">
                  Se o botão não abrir, copie e cole o link no seu navegador:
                </p>
                <p style="margin:0 0 24px; font-size:13px; text-align:center;">
                  <a href="${safeLoginUrl}" style="color:#34d399; word-break:break-all;">${safeLoginUrl}</a>
                </p>

                <p style="margin:0; font-size:13px; line-height:1.6; color:#9ca3af;">
                  💡 <em>Se você ainda não tiver conta, basta fazer o cadastro com este mesmo endereço de e-mail. O convite será vinculado automaticamente à sua conta assim que você entrar.</em>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 30px; background:#0b0f19; border-top:1px solid #1f2937; text-align:center; color:#6b7280; font-size:12px;">
                <p style="margin:0 0 4px;"><strong>EnergivIA</strong> • Tecnologia para o Futuro da Energia Solar</p>
                <p style="margin:0;">Este é um e-mail transacional oficial do EnergivIA.</p>
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
