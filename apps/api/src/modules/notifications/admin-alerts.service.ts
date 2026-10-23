import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "../whatsapp/whatsapp-cloud.service";

@Injectable()
export class AdminAlertsService {
  private readonly logger = new Logger(AdminAlertsService.name);
  public static readonly GROUP_SETTING_KEY = "ADMIN_WHATSAPP_ALERT_GROUP_JID";

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => WhatsappCloudService))
    private readonly whatsappCloud: WhatsappCloudService
  ) {}

  /**
   * Obtém o JID do grupo de alertas cadastrado no sistema (ou da variável de ambiente).
   */
  async getAlertGroupJid(): Promise<string | null> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: AdminAlertsService.GROUP_SETTING_KEY },
      });
      if (setting?.value?.trim()) return setting.value.trim();
    } catch (e) {
      this.logger.warn(`Erro ao buscar grupo de alertas no banco: ${e}`);
    }
    const envVal = this.config.get<string>("ADMIN_WHATSAPP_ALERT_GROUP_JID")?.trim();
    return envVal || null;
  }

  /**
   * Registra o JID do grupo de alertas administrativos.
   * Trava permanente: uma vez ativado, não pode ser sobrescrito por outro grupo (a menos que force=true).
   */
  async setAlertGroupJid(groupJid: string, force = false): Promise<boolean> {
    const existing = await this.getAlertGroupJid();
    if (existing && existing !== groupJid && !force) {
      this.logger.warn(
        `[Admin Alerts] Tentativa de alterar grupo de alertas bloqueada. Já configurado exclusivamente para: ${existing}`
      );
      return false;
    }
    await this.prisma.systemSetting.upsert({
      where: { key: AdminAlertsService.GROUP_SETTING_KEY },
      update: { value: groupJid },
      create: { key: AdminAlertsService.GROUP_SETTING_KEY, value: groupJid },
    });
    this.logger.log(`[Admin Alerts] Grupo de alertas registrado com sucesso: ${groupJid}`);
    return true;
  }

  /**
   * Verifica se o grupo já está travado/ativo.
   */
  async isAlertGroupLocked(): Promise<boolean> {
    const jid = await this.getAlertGroupJid();
    return Boolean(jid);
  }

  /**
   * Envia uma mensagem formatada diretamente para o grupo de alertas.
   */
  async sendToAlertGroup(body: string): Promise<boolean> {
    const groupJid = await this.getAlertGroupJid();
    if (!groupJid) {
      this.logger.debug(
        `[Admin Alerts] Nenhum grupo de alertas configurado ainda. Mensagem não enviada.`
      );
      return false;
    }

    const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
    try {
      const sent = await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: groupJid,
        body,
      });
      if (sent) {
        this.logger.log(`[Admin Alerts] Alerta enviado com sucesso para o grupo ${groupJid}`);
      } else {
        this.logger.warn(`[Admin Alerts] Falha ao despachar alerta para o grupo ${groupJid}`);
      }
      return sent;
    } catch (err) {
      this.logger.error(`[Admin Alerts] Erro ao enviar mensagem para grupo ${groupJid}: ${err}`);
      return false;
    }
  }

  /**
   * 1. Alerta de Novo Chamado na Central de Ajuda & Suporte
   */
  async notifySupportTicket(data: {
    protocol: string;
    category: string;
    severity?: string;
    subject: string;
    message: string;
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
    userPlan?: string;
  }): Promise<boolean> {
    const catMap: Record<string, string> = {
      dificuldade: "Dificuldade Técnica / Bug",
      melhoria: "Sugestão de Melhoria",
      reclamacao: "Reclamação & Ouvidoria",
      duvida: "Dúvida de Operação",
      financeiro: "Financeiro & Faturamento",
      outro: "Outro",
    };
    const catTitle = catMap[data.category] || data.category;
    const sev = (data.severity || "media").toUpperCase();
    const phoneDigits = data.phone ? data.phone.replace(/\D/g, "") : "";
    const waLink = phoneDigits
      ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}`
      : null;

    const msg =
      `🚨 *NOVO CHAMADO NA CENTRAL DE AJUDA*\n\n` +
      `📋 *Protocolo:* #${data.protocol}\n` +
      `🏷️ *Tipo:* ${catTitle} (Urgência: *${sev}*)\n` +
      `👤 *Cliente:* ${data.name}\n` +
      `🏢 *Empresa:* ${data.companyName || "Não informada"} (Plano: *${data.userPlan || "TRIAL"}*)\n` +
      `📧 *E-mail:* ${data.email}\n` +
      `📱 *WhatsApp:* ${data.phone || "Não informado"}\n\n` +
      `📌 *Assunto:* ${data.subject}\n` +
      `💬 *Descrição:* "${data.message}"\n` +
      (waLink ? `\n📲 *Chamar cliente no WhatsApp:* ${waLink}` : "");

    return this.sendToAlertGroup(msg);
  }

  private readonly recentRegistrations = new Map<string, number>();

  /**
   * 2. Alerta de Novo Cadastro de Integrador na Plataforma
   */
  async notifyNewUserRegistration(data: {
    name: string;
    email: string;
    phone?: string | null;
    companyName?: string;
    city?: string | null;
    state?: string | null;
  }): Promise<boolean> {
    const emailKey = (data.email || "").trim().toLowerCase();
    if (emailKey) {
      const nowMs = Date.now();
      const lastSent = this.recentRegistrations.get(emailKey);
      if (lastSent && nowMs - lastSent < 10 * 60 * 1000) {
        this.logger.log(`[Admin Alerts] Alerta de cadastro duplicado suprimido para ${emailKey}`);
        return true;
      }
      this.recentRegistrations.set(emailKey, nowMs);
    }

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const location =
      data.city && data.state ? `${data.city}/${data.state}` : data.city || data.state || null;

    const rawDigits = (data.phone || "").replace(/\D/g, "");
    const waLink =
      rawDigits.length >= 10
        ? `https://wa.me/${rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`}`
        : null;

    const msg =
      `👤 *NOVO CADASTRO NA PLATAFORMA* 🎉\n\n` +
      `Um novo integrador acabou de criar conta na EnergivIA:\n\n` +
      `• *Nome:* ${data.name}\n` +
      `• *E-mail:* ${data.email}\n` +
      (data.phone ? `• *WhatsApp:* ${data.phone}${waLink ? ` (${waLink})` : ""}\n` : "") +
      (data.companyName ? `• *Empresa:* ${data.companyName}\n` : "") +
      (location ? `• *Localização:* ${location}\n` : "") +
      `• *Plano Inicial:* TRIAL (7 dias grátis)\n` +
      `• *Data/Hora:* ${now}`;

    return this.sendToAlertGroup(msg);
  }

  /**
   * 2.1. Alerta de Cadastro Não Finalizado (Desistência/Abandono no Onboarding)
   */
  async notifyOnboardingAbandoned(data: {
    name: string;
    email: string;
    phone?: string | null;
    step?: string | number;
  }): Promise<boolean> {
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const rawDigits = (data.phone || "").replace(/\D/g, "");
    const waLink =
      rawDigits.length >= 10
        ? `https://wa.me/${rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`}`
        : null;

    const stepLabel =
      data.step === 1
        ? "Passo 1 (Dados da Empresa)"
        : data.step === 2
          ? "Passo 2 (Perfil do Integrador)"
          : data.step === 3
            ? "Passo 3 (Propostas Inteligentes)"
            : String(data.step || "Passo 1");

    const msg =
      `🚨 *CADASTRO NÃO FINALIZADO (ABANDONO)* ⚠️\n\n` +
      `Um integrador iniciou o cadastro mas saiu da página antes de concluir:\n\n` +
      `• *Nome:* ${data.name}\n` +
      `• *E-mail:* ${data.email}\n` +
      (data.phone ? `• *WhatsApp:* ${data.phone}\n` : "") +
      (waLink ? `• *Falar com Integrador:* ${waLink}\n` : "") +
      `• *Etapa onde parou:* ${stepLabel}\n` +
      `• *Status:* Onboarding Incompleto\n` +
      `• *Data/Hora:* ${now}\n\n` +
      `_Dica: Entre em contato ativo para entender a dúvida e ajudar a concluir o setup._`;

    return this.sendToAlertGroup(msg);
  }

  /**
   * 3. Alerta de Intenção de Pagamento / Checkout Iniciado (Chegou na tela de pagamento)
   */
  async notifyCheckoutInitiated(data: {
    customerName?: string;
    customerEmail?: string;
    tenantName?: string;
    planName: string;
    planPrice: number;
  }): Promise<boolean> {
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const priceFormatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(data.planPrice);

    const msg =
      `⏳ *TENTATIVA DE PAGAMENTO (CHECKOUT INICIADO)*\n\n` +
      `Um cliente cadastrado avançou até a tela de pagamento do plano:\n\n` +
      `• *Cliente/Empresa:* ${data.tenantName || data.customerName || "Integrador"}\n` +
      (data.customerEmail ? `• *E-mail:* ${data.customerEmail}\n` : "") +
      `• *Plano Escolhido:* *${data.planName}* (${priceFormatted}/mês)\n` +
      `• *Horário:* ${now}\n\n` +
      `_Aguardando preenchimento e confirmação do pagamento no Stripe..._`;

    return this.sendToAlertGroup(msg);
  }

  /**
   * 4. Alerta de Pagamento Confirmado / Assinatura Aprovada
   */
  async notifyPaymentCompleted(data: {
    customerName?: string;
    customerEmail?: string;
    tenantName?: string;
    planName: string;
    amount?: number;
    stripeSubscriptionId?: string;
  }): Promise<boolean> {
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const valFormatted = data.amount
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          data.amount / 100
        )
      : null;

    const msg =
      `💳 *PAGAMENTO CONFIRMADO!* 💰🎉\n\n` +
      `Uma nova assinatura foi realizada com sucesso:\n\n` +
      `• *Cliente/Empresa:* ${data.tenantName || data.customerName || "Integrador"}\n` +
      (data.customerEmail ? `• *E-mail:* ${data.customerEmail}\n` : "") +
      `• *Plano Assinado:* *${data.planName}*\n` +
      (valFormatted ? `• *Valor Pago:* ${valFormatted}\n` : "") +
      `• *Status:* Ativo / Pago\n` +
      `• *Data/Hora:* ${now}`;

    return this.sendToAlertGroup(msg);
  }
}
