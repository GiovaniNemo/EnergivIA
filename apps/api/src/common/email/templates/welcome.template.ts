export interface WelcomeTemplateInput {
  userName?: string;
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

export function buildWelcomeTemplate(input: WelcomeTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const displayName = input.userName ? escapeHtml(input.userName) : "Integrador";
  const safeLoginUrl = escapeHtml(input.loginUrl);

  const subject = `☀️ Bem-vindo(a) ao EnergivIA! Sua plataforma inteligente de energia solar`;
  const text = [
    `Olá, ${input.userName || "Integrador"}!`,
    ``,
    `Seja muito bem-vindo(a) ao EnergivIA!`,
    `A sua plataforma para acelerar vendas, criar propostas solares de alta conversão, simular financiamentos e automatizar seu atendimento com inteligência artificial.`,
    ``,
    `Para acessar a plataforma agora mesmo:`,
    input.loginUrl,
    ``,
    `O que você pode fazer no EnergivIA:`,
    `• Gerar propostas solares em PDF em segundos`,
    `• Analisar faturas de energia com IA`,
    `• Gerenciar seu funil de vendas (CRM)`,
    `• Simular financiamentos bancários solares`,
    ``,
    `Se precisar de suporte, estamos à disposição em contato@energivia.com.br`,
    ``,
    `Equipe EnergivIA`,
  ].join("\n");

  const html = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bem-vindo ao EnergivIA</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0f172a; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19; padding:40px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            
            <!-- Header com Logo / Destaque -->
            <tr>
              <td style="background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%); padding:32px 30px; text-align:left;">
                <div style="font-size:26px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                  Energiv<span style="color:#a7f3d0;">IA</span>
                </div>
                <div style="color:#ecfdf5; font-size:14px; font-weight:500; margin-top:6px;">
                  Inteligência e Tecnologia para o Mercado Solar ☀️
                </div>
              </td>
            </tr>

            <!-- Corpo Principal -->
            <tr>
              <td style="padding:32px 30px; color:#f3f4f6;">
                <h1 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#ffffff;">
                  Olá, ${displayName}! 👋
                </h1>
                
                <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#d1d5db;">
                  É um grande prazer ter você conosco! Sua conta no <strong>EnergivIA</strong> está pronta para ajudar você a fechar mais negócios solares e elevar o nível da sua operação.
                </p>

                <!-- Cards de Recursos -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px; background:#1f2937; border-radius:12px; padding:18px; border:1px solid #374151;">
                  <tr>
                    <td>
                      <div style="font-size:14px; font-weight:700; color:#10b981; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
                        Tudo o que você precisa em um só lugar:
                      </div>
                      <div style="font-size:14px; color:#e5e7eb; margin-bottom:10px; line-height:1.5;">
                        ⚡ <strong>Propostas em Segundos:</strong> Gere propostas comerciais em PDF com design premium e economia calculada.
                      </div>
                      <div style="font-size:14px; color:#e5e7eb; margin-bottom:10px; line-height:1.5;">
                        🤖 <strong>Leitura com IA:</strong> Faça upload da fatura de energia e a IA extrai o consumo e dados instantaneamente.
                      </div>
                      <div style="font-size:14px; color:#e5e7eb; margin-bottom:10px; line-height:1.5;">
                        🎯 <strong>CRM & Funil Solar:</strong> Acompanhe cada oportunidade e negociação do primeiro contato ao pós-venda.
                      </div>
                      <div style="font-size:14px; color:#e5e7eb; line-height:1.5;">
                        🏦 <strong>Financiamento Integrado:</strong> Simule parcelamentos e opções de crédito para seus clientes.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Botão de Ação -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px; text-align:center;">
                  <tr>
                    <td style="border-radius:10px; background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
                      <a href="${safeLoginUrl}" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
                        Acessar Minha Plataforma ➔
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px; color:#9ca3af; font-size:13px; text-align:center;">
                  Ou acesse diretamente pelo link:
                </p>
                <p style="margin:0 0 24px; font-size:13px; text-align:center;">
                  <a href="${safeLoginUrl}" style="color:#34d399; word-break:break-all;">${safeLoginUrl}</a>
                </p>

                <hr style="border:none; border-top:1px solid #374151; margin:24px 0;" />

                <p style="margin:0; font-size:14px; line-height:1.5; color:#9ca3af;">
                  Ficou com alguma dúvida ou precisa de ajuda para configurar sua equipe? Nossa equipe de suporte está à disposição no e-mail <a href="mailto:contato@energivia.com.br" style="color:#10b981; text-decoration:none; font-weight:600;">contato@energivia.com.br</a>.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 30px; background:#0b0f19; border-top:1px solid #1f2937; text-align:center; color:#6b7280; font-size:12px;">
                <p style="margin:0 0 4px;"><strong>EnergivIA</strong> • Tecnologia para o Futuro da Energia Solar</p>
                <p style="margin:0;">Você recebeu este e-mail por ter se cadastrado na plataforma EnergivIA.</p>
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
