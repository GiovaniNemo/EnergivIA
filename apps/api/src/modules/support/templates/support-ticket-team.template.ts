import { TicketAttachment, TicketCategory, TicketSeverity } from "../dto/create-support-ticket.dto";

export interface SupportTicketTeamTemplateInput {
  protocol: string;
  category: TicketCategory;
  severity?: TicketSeverity;
  subject: string;
  message: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  userPlan?: string;
  attachments?: TicketAttachment[];
  metadata?: Record<string, unknown>;
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

const CATEGORY_LABELS: Record<TicketCategory, { title: string; color: string; bg: string }> = {
  dificuldade: { title: "Dificuldade Técnica / Bug", color: "#f87171", bg: "#450a0a" },
  melhoria: { title: "Sugestão de Melhoria / Ideia", color: "#60a5fa", bg: "#172554" },
  reclamacao: { title: "Reclamação / Ouvidoria", color: "#fb923c", bg: "#431407" },
  duvida: { title: "Dúvida de Operação", color: "#a78bfa", bg: "#2e1065" },
  financeiro: { title: "Financeiro & Faturamento", color: "#34d399", bg: "#064e3b" },
  outro: { title: "Geral / Outros", color: "#9ca3af", bg: "#1f2937" },
};

const SEVERITY_LABELS: Record<TicketSeverity, { title: string; color: string; badge: string }> = {
  baixa: { title: "Baixa", color: "#9ca3af", badge: "#374151" },
  media: { title: "Média", color: "#facc15", badge: "#713f12" },
  alta: { title: "Alta", color: "#fb923c", badge: "#7c2d12" },
  critica: { title: "Crítica (Urgente)", color: "#ef4444", badge: "#7f1d1d" },
};

export function buildSupportTicketTeamTemplate(input: SupportTicketTeamTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  const cat = CATEGORY_LABELS[input.category] || CATEGORY_LABELS.outro;
  const sevKey = (input.severity || "media").toLowerCase() as TicketSeverity;
  const sev = SEVERITY_LABELS[sevKey] || SEVERITY_LABELS.media;

  const emailSubject = `[Suporte #${input.protocol}] [${cat.title.toUpperCase()}] ${input.subject} - ${input.name} (${input.companyName || "Cliente"})`;

  const safePhone = input.phone ? input.phone.replace(/\D/g, "") : "";
  const waUrl = safePhone ? `https://wa.me/55${safePhone.replace(/^55/, "")}` : null;

  const textLines = [
    `NOVO CHAMADO DE SUPORTE - ENERGIVIA`,
    `Protocolo: #${input.protocol}`,
    `Data/Hora: ${input.createdAt.toLocaleString("pt-BR")}`,
    `Categoria: ${cat.title}`,
    `Severidade: ${sev.title}`,
    `----------------------------------------`,
    `DADOS DO CLIENTE:`,
    `Nome: ${input.name}`,
    `E-mail: ${input.email}`,
    `Telefone: ${input.phone || "Não informado"}`,
    `Empresa: ${input.companyName || "Não informada"}`,
    `Plano: ${input.userPlan || "Não identificado"}`,
    `----------------------------------------`,
    `ASSUNTO:`,
    input.subject,
    ``,
    `MENSAGEM:`,
    input.message,
    ``,
    input.attachments && input.attachments.length > 0
      ? `ANEXOS (${input.attachments.length}):\n` +
        input.attachments.map((a) => `- ${a.filename}: ${a.url || "(enviado)"}`).join("\n")
      : `ANEXOS: Nenhum`,
    ``,
    `METADADOS TÉCNICOS:`,
    JSON.stringify(input.metadata || {}, null, 2),
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
          <table role="presentation" width="650" cellspacing="0" cellpadding="0" style="width:650px; max-width:650px; background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.7);">
            
            <!-- Header com Logo e Protocolo -->
            <tr>
              <td style="background:#0f172a; padding:24px 30px; border-bottom:1px solid #1f2937;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                        Energiv<span style="color:#10b981;">IA</span>
                        <span style="font-size:12px; font-weight:600; color:#9ca3af; margin-left:8px; text-transform:uppercase; letter-spacing:1px;">Central de Suporte</span>
                      </div>
                    </td>
                    <td align="right">
                      <span style="display:inline-block; background:#1e293b; color:#38bdf8; font-family:monospace; font-size:13px; font-weight:700; padding:6px 12px; border-radius:8px; border:1px solid #334155;">
                        #${escapeHtml(input.protocol)}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Banner de Categoria e Severidade -->
            <tr>
              <td style="padding:16px 30px; background:#1e293b; border-bottom:1px solid #334155;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="display:inline-block; background:${cat.bg}; color:${cat.color}; font-size:12px; font-weight:700; padding:4px 10px; border-radius:6px; border:1px solid ${cat.color}40; text-transform:uppercase;">
                        ${escapeHtml(cat.title)}
                      </span>
                      <span style="display:inline-block; background:${sev.badge}; color:${sev.color}; font-size:12px; font-weight:700; padding:4px 10px; border-radius:6px; margin-left:8px; border:1px solid ${sev.color}40; text-transform:uppercase;">
                        Severidade: ${escapeHtml(sev.title)}
                      </span>
                    </td>
                    <td align="right" style="color:#94a3b8; font-size:12px;">
                      ${input.createdAt.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Assunto e Mensagem do Cliente -->
            <tr>
              <td style="padding:28px 30px;">
                <div style="font-size:13px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                  Assunto da Solicitação
                </div>
                <h1 style="margin:0 0 20px; font-size:20px; font-weight:700; color:#ffffff; line-height:1.4;">
                  ${escapeHtml(input.subject)}
                </h1>

                <div style="font-size:13px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                  Descrição Detalhada do Cliente
                </div>
                <div style="background:#0f172a; border:1px solid #1f2937; border-radius:12px; padding:20px; color:#e2e8f0; font-size:15px; line-height:1.7; white-space:pre-wrap; word-break:break-word;">
${escapeHtml(input.message)}
                </div>

                ${
                  input.attachments && input.attachments.length > 0
                    ? `
                <div style="margin-top:20px;">
                  <div style="font-size:13px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                    Anexos / Evidências (${input.attachments.length})
                  </div>
                  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a; border:1px solid #1f2937; border-radius:10px; padding:12px;">
                    ${input.attachments
                      .map(
                        (a) => `
                      <tr>
                        <td style="padding:6px 0; color:#38bdf8; font-size:14px;">
                          📎 <strong style="color:#f3f4f6;">${escapeHtml(a.filename)}</strong>
                          ${a.url ? `<a href="${escapeHtml(a.url)}" target="_blank" style="color:#10b981; margin-left:10px; text-decoration:none;">Visualizar ➔</a>` : ""}
                        </td>
                      </tr>
                    `
                      )
                      .join("")}
                  </table>
                </div>
                `
                    : ""
                }

                <!-- Dados do Solicitante -->
                <div style="margin-top:28px;">
                  <div style="font-size:13px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
                    Dados do Solicitante & Conta
                  </div>
                  <table width="100%" cellspacing="0" cellpadding="8" style="background:#0f172a; border:1px solid #1f2937; border-radius:12px; font-size:14px;">
                    <tr>
                      <td width="25%" style="color:#9ca3af; border-bottom:1px solid #1f2937;">Nome:</td>
                      <td style="color:#ffffff; font-weight:600; border-bottom:1px solid #1f2937;">${escapeHtml(input.name)}</td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af; border-bottom:1px solid #1f2937;">E-mail:</td>
                      <td style="border-bottom:1px solid #1f2937;">
                        <a href="mailto:${escapeHtml(input.email)}?subject=Re:%20[Suporte%20%23${escapeHtml(input.protocol)}]%20${encodeURIComponent(input.subject)}" style="color:#38bdf8; text-decoration:none; font-weight:600;">
                          ${escapeHtml(input.email)}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af; border-bottom:1px solid #1f2937;">Telefone / WhatsApp:</td>
                      <td style="border-bottom:1px solid #1f2937;">
                        ${
                          input.phone
                            ? `<span style="color:#ffffff; font-weight:600;">${escapeHtml(input.phone)}</span>
                               ${waUrl ? `<a href="${escapeHtml(waUrl)}" target="_blank" style="margin-left:8px; display:inline-block; background:#064e3b; color:#34d399; font-size:12px; font-weight:600; padding:2px 8px; border-radius:4px; text-decoration:none;">Abrir WhatsApp ↗</a>` : ""}`
                            : `<span style="color:#6b7280;">Não informado</span>`
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af; border-bottom:1px solid #1f2937;">Empresa / Integrador:</td>
                      <td style="color:#ffffff; font-weight:600; border-bottom:1px solid #1f2937;">${escapeHtml(input.companyName || "Não identificada")}</td>
                    </tr>
                    <tr>
                      <td style="color:#9ca3af;">Plano Atual:</td>
                      <td>
                        <span style="display:inline-block; background:#10b98120; color:#34d399; font-weight:700; font-size:12px; padding:2px 8px; border-radius:4px; border:1px solid #10b98140;">
                          ${escapeHtml(input.userPlan || "TRIAL")}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Botão de Ação Rápida: Responder ao Cliente -->
                <div style="margin-top:28px; text-align:center;">
                  <a href="mailto:${escapeHtml(input.email)}?subject=Re:%20[Suporte%20%23${escapeHtml(input.protocol)}]%20${encodeURIComponent(input.subject)}" style="display:inline-block; background:#10b981; color:#ffffff; font-weight:700; font-size:15px; padding:12px 28px; border-radius:10px; text-decoration:none; box-shadow:0 4px 12px rgba(16, 185, 129, 0.3);">
                    Responder ao Cliente por E-mail ✉️
                  </a>
                </div>

                <!-- Diagnóstico Técnico de Background -->
                ${
                  input.metadata && Object.keys(input.metadata).length > 0
                    ? `
                <div style="margin-top:28px; padding-top:20px; border-top:1px solid #1f2937;">
                  <div style="font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                    Telemetria Técnica do Ambiente
                  </div>
                  <pre style="margin:0; background:#0b0f19; border:1px solid #1f2937; border-radius:8px; padding:10px; color:#94a3b8; font-size:11px; font-family:monospace; overflow-x:auto;">${escapeHtml(JSON.stringify(input.metadata, null, 2))}</pre>
                </div>
                `
                    : ""
                }

              </td>
            </tr>

            <!-- Footer Corporativo -->
            <tr>
              <td style="padding:18px 30px; background:#0b0f19; border-top:1px solid #1f2937; text-align:center; color:#6b7280; font-size:12px;">
                Notificação automática da Central de Ajuda • <strong>EnergivIA Enterprise</strong>
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
