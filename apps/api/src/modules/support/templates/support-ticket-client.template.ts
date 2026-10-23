import { TicketCategory, TicketSeverity } from "../dto/create-support-ticket.dto";

export interface SupportTicketClientTemplateInput {
  protocol: string;
  category: TicketCategory;
  severity?: TicketSeverity;
  subject: string;
  message: string;
  name: string;
  userPlan?: string;
  createdAt: Date;
}

function escapeHtml(value?: string | null): string {
  if (!value) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CATEGORY_NAMES: Record<TicketCategory, string> = {
  dificuldade: "Dificuldade Técnica / Bug",
  melhoria: "Sugestão de Melhoria / Nova Ideia",
  reclamacao: "Reclamação / Ouvidoria",
  duvida: "Dúvida de Operação",
  financeiro: "Financeiro & Faturamento",
  outro: "Geral / Outros",
};

export function buildSupportTicketClientTemplate(input: SupportTicketClientTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const catTitle = CATEGORY_NAMES[input.category] || "Atendimento Geral";
  const firstName = input.name.split(" ")[0] || "Integrador";
  const emailSubject = `[EnergivIA] Recebemos sua solicitação - Protocolo #${input.protocol}`;

  const textLines = [
    `Olá, ${firstName}!`,
    ``,
    `Confirmamos o recebimento da sua solicitação através da Central de Ajuda da EnergivIA.`,
    `Nossa equipe de suporte técnico e produto já foi notificada e está analisando as informações enviadas.`,
    ``,
    `SEU PROTOCOLO DE ATENDIMENTO:`,
    `#${input.protocol}`,
    ``,
    `DETALHES DO CHAMADO:`,
    `Assunto: ${input.subject}`,
    `Categoria: ${catTitle}`,
    `Data de Abertura: ${input.createdAt.toLocaleString("pt-BR")}`,
    ``,
    `RESUMO DA SUA MENSAGEM:`,
    input.message,
    ``,
    `PRAZO ESTIMADO DE RESPOSTA (SLA):`,
    `• Previsão de retorno e análise em até 72 horas úteis.`,
    ``,
    `Caso precise adicionar novas evidências ou prints, basta responder diretamente a este e-mail mantendo o assunto original.`,
    ``,
    `Atenciosamente,`,
    `Equipe de Atendimento & Suporte EnergivIA`,
    `contato@energivia.com.br`,
  ];

  const html = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(emailSubject)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0b0f19; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f3f4f6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f19; padding:30px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px; background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.6);">
            
            <!-- Header Corporativo -->
            <tr>
              <td style="background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%); padding:28px 30px; text-align:left;">
                <div style="font-size:24px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                  Energiv<span style="color:#a7f3d0;">IA</span>
                </div>
                <div style="color:#ecfdf5; font-size:14px; font-weight:500; margin-top:4px;">
                  Central de Ajuda & Atendimento ao Cliente
                </div>
              </td>
            </tr>

            <!-- Conteúdo Principal -->
            <tr>
              <td style="padding:32px 30px;">
                <h1 style="margin:0 0 14px; font-size:20px; font-weight:700; color:#ffffff;">
                  Olá, ${escapeHtml(firstName)}!
                </h1>

                <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#d1d5db;">
                  Recebemos a sua solicitação com sucesso. Nossa equipe de especialistas e gestores já está ciente e analisando as informações fornecidas.
                </p>

                <!-- Box de Destaque do Protocolo -->
                <div style="background:#0f172a; border:1px solid #10b98140; border-radius:12px; padding:20px; text-align:center; margin-bottom:26px;">
                  <div style="font-size:12px; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">
                    Protocolo de Atendimento Registrado
                  </div>
                  <div style="font-family:monospace; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:1px;">
                    #${escapeHtml(input.protocol)}
                  </div>
                  <div style="font-size:12px; color:#9ca3af; margin-top:6px;">
                    Aberto em ${input.createdAt.toLocaleString("pt-BR")}
                  </div>
                </div>

                <!-- Detalhes do Chamado -->
                <div style="background:#1e293b; border-radius:12px; padding:18px 20px; margin-bottom:26px; border:1px solid #334155;">
                  <div style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                    Assunto:
                  </div>
                  <div style="font-size:16px; font-weight:600; color:#ffffff; margin-bottom:14px;">
                    ${escapeHtml(input.subject)}
                  </div>

                  <div style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                    Categoria:
                  </div>
                  <div style="font-size:14px; color:#38bdf8; font-weight:600; margin-bottom:14px;">
                    ${escapeHtml(catTitle)}
                  </div>

                  <div style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                    Resumo da sua mensagem:
                  </div>
                  <div style="background:#0f172a; border-radius:8px; padding:12px 14px; color:#e2e8f0; font-size:14px; line-height:1.6; white-space:pre-wrap;">
${escapeHtml(input.message)}
                  </div>
                </div>

                <!-- Prazos de Atendimento (SLA) -->
                <table width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a; border:1px solid #1f2937; border-radius:12px; padding:16px 20px; margin-bottom:26px;">
                  <tr>
                    <td>
                      <div style="font-size:13px; font-weight:700; color:#10b981; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">
                        ⏱️ Previsão de Atendimento:
                      </div>
                      <div style="font-size:13px; color:#d1d5db; line-height:1.6;">
                        • <strong>Previsão de retorno e atendimento:</strong> resposta em até 72 horas úteis.
                      </div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0; font-size:13px; line-height:1.6; color:#9ca3af;">
                  Para adicionar novos prints ou informações a este mesmo chamado, você pode simplesmente <strong>responder a este e-mail</strong> mantendo o número do protocolo no assunto.
                </p>
              </td>
            </tr>

            <!-- Footer Corporativo -->
            <tr>
              <td style="padding:20px 30px; background:#0b0f19; border-top:1px solid #1f2937; text-align:center; color:#6b7280; font-size:12px;">
                <p style="margin:0 0 4px;"><strong>EnergivIA Tecnologia Solar</strong> • <a href="mailto:contato@energivia.com.br" style="color:#10b981; text-decoration:none;">contato@energivia.com.br</a></p>
                <p style="margin:0;">Este é um e-mail automático de confirmação de atendimento.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return {
    subject: emailSubject,
    text: textLines.join("\n"),
    html,
  };
}
