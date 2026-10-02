import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";
import { normalizeAssistantTextForWhatsapp } from "./whatsapp-text-format.util";

function appSecretProof(accessToken: string, appSecret: string): string {
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

function graphErrorSubcode(errText: string): number | null {
  try {
    const j = JSON.parse(errText) as { error?: { error_subcode?: number | string } };
    const s = j?.error?.error_subcode;
    if (typeof s === "number" && Number.isFinite(s)) return s;
    if (typeof s === "string") {
      const n = Number.parseInt(s, 10);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

function formatToInternationalWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export interface InteractiveButtonOption {
  id: string;
  title: string;
}

export interface SendInteractiveListParams {
  phoneNumberId: string;
  toWaId: string;
  body: string;
  buttonText?: string;
  title?: string;
  footer?: string;
  sections: InteractiveListSection[];
}

export interface SendInteractiveButtonParams {
  phoneNumberId: string;
  toWaId: string;
  body: string;
  buttons: InteractiveButtonOption[];
  title?: string;
  footer?: string;
}

function truncateSafe(str: string | undefined | null, maxLen: number): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function buildFallbackTextForList(body: string, sections: InteractiveListSection[]): string {
  if (body.includes("1️⃣") || body.includes("1.")) {
    return body.trim();
  }
  let text = body.trim();
  text += "\n";
  for (const s of sections) {
    if (s.title) text += `\n*${s.title}*\n`;
    for (const [idx, r] of s.rows.entries()) {
      text += ` · ${idx + 1}. ${r.title}${r.description ? ` (${r.description})` : ""}\n`;
    }
  }
  text += "\n(Responda com o número ou nome da opção)";
  return text.trim();
}

function buildFallbackTextForButtons(body: string, buttons: InteractiveButtonOption[]): string {
  if (body.includes("1️⃣") || body.includes("1.")) {
    return body.trim();
  }
  let text = body.trim();
  text += "\n\n";
  buttons.forEach((b, idx) => {
    text += `${idx + 1}️⃣ ${b.title}\n`;
  });
  text += "\n(Responda com o número ou nome da opção)";
  return text.trim();
}

@Injectable()
export class WhatsappCloudService {
  private readonly logger = new Logger(WhatsappCloudService.name);

  constructor(private readonly config: ConfigService) {}

  private buildMessagesUrl(phoneNumberId: string, token: string): string {
    const version = this.config.get<string>("WHATSAPP_GRAPH_API_VERSION")?.trim() || "v21.0";
    const base = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const appSecret = this.config.get<string>("WHATSAPP_APP_SECRET")?.trim();
    const url = new URL(base);
    if (appSecret) {
      url.searchParams.set("appsecret_proof", appSecretProof(token, appSecret));
    }
    return url.toString();
  }

  private async postTextOnce(
    phoneNumberId: string,
    token: string,
    toWaId: string,
    body: string
  ): Promise<{ ok: boolean; status: number; errText: string }> {
    const to = formatToInternationalWhatsapp(toWaId);
    const res = await fetch(this.buildMessagesUrl(phoneNumberId, token), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    const errText = res.ok ? "" : await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, errText };
  }

  private async postInteractiveOnce(
    phoneNumberId: string,
    token: string,
    toWaId: string,
    interactivePayload: Record<string, unknown>
  ): Promise<{ ok: boolean; status: number; errText: string }> {
    const to = formatToInternationalWhatsapp(toWaId);
    const res = await fetch(this.buildMessagesUrl(phoneNumberId, token), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: interactivePayload,
      }),
    });
    const errText = res.ok ? "" : await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, errText };
  }

  private readonly mediaCache = new Map<
    string,
    { buffer: Buffer; mimeType: string; timestamp: number }
  >();

  registerMediaBuffer(mediaId: string, buffer: Buffer, mimeType: string) {
    this.mediaCache.set(mediaId, { buffer, mimeType, timestamp: Date.now() });
    // Limpar itens velhos (> 30 min)
    const threshold = Date.now() - 30 * 60 * 1000;
    for (const [key, item] of this.mediaCache.entries()) {
      if (item.timestamp < threshold) {
        this.mediaCache.delete(key);
      }
    }
  }

  private isEvolutionProvider(): boolean {
    const explicitProvider = this.config.get<string>("WHATSAPP_PROVIDER")?.trim().toLowerCase();
    if (explicitProvider === "meta") return false;
    if (explicitProvider === "evolution") return true;
    return !!this.config.get<string>("EVOLUTION_API_URL")?.trim();
  }

  private async sendEvolutionWithNumberRetry(
    url: string,
    toWaId: string,
    payloadData: Record<string, unknown>
  ): Promise<{ ok: boolean; status: number; errText: string }> {
    const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
    const cleanNumber = formatToInternationalWhatsapp(toWaId);

    const sendTo = async (num: string) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey || "",
          },
          body: JSON.stringify({
            number: num,
            ...payloadData,
          }),
        });
        const errText = res.ok ? "" : await res.text().catch(() => "");
        return { ok: res.ok, status: res.status, errText };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, status: 500, errText: msg };
      }
    };

    let result = await sendTo(cleanNumber);
    if (!result.ok && cleanNumber.startsWith("55")) {
      let altNumber: string | null = null;
      if (cleanNumber.length === 12) {
        altNumber = `${cleanNumber.slice(0, 4)}9${cleanNumber.slice(4)}`;
      } else if (cleanNumber.length === 13 && cleanNumber.charAt(4) === "9") {
        altNumber = `${cleanNumber.slice(0, 4)}${cleanNumber.slice(5)}`;
      }
      if (altNumber) {
        this.logger.warn(
          `[Evolution API] Falha para ${cleanNumber} (${result.status}): ${result.errText.slice(0, 100)}. Tentando variante ${altNumber}...`
        );
        const altResult = await sendTo(altNumber);
        if (altResult.ok) {
          return altResult;
        }
      }
    }
    return result;
  }

  private async postTextViaEvolution(
    toWaId: string,
    body: string
  ): Promise<{ ok: boolean; status: number; errText: string }> {
    const baseUrl = this.config.get<string>("EVOLUTION_API_URL")?.trim().replace(/\/+$/, "");
    const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
    const instance = this.config.get<string>("EVOLUTION_INSTANCE_NAME")?.trim() || "energiv-bot";

    if (!baseUrl || !apiKey) {
      return {
        ok: false,
        status: 500,
        errText:
          "Evolution API not fully configured (missing EVOLUTION_API_URL or EVOLUTION_API_KEY)",
      };
    }

    const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
    return this.sendEvolutionWithNumberRetry(url, toWaId, { text: body });
  }

  async sendTextMessage(params: {
    phoneNumberId: string;
    toWaId: string;
    body: string;
  }): Promise<void> {
    const body = normalizeAssistantTextForWhatsapp(params.body);
    const to = formatToInternationalWhatsapp(params.toWaId);

    // 1. Envio via Evolution API (Custo ZERO por mensagem)
    if (this.isEvolutionProvider()) {
      const { ok, status, errText } = await this.postTextViaEvolution(to, body);
      if (ok) {
        const maxLen = 4000;
        const text = body.length > maxLen ? `${body.slice(0, maxLen)}…[truncado]` : body;
        this.logger.log(`[Evolution API] WhatsApp mensagem enviada: para=${to}\n---\n${text}\n---`);
        return;
      }
      this.logger.error(
        `[Evolution API] Falha no envio para ${to}: HTTP ${status} err=${errText.slice(0, 300)}`
      );
      // Se a Evolution falhar e não houver token da Meta, encerra aqui
      const token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim();
      if (!token) return;
      this.logger.warn(`Tentando fallback via Meta Cloud API para ${to}...`);
    }

    // 2. Envio via Meta Cloud API (Oficial)
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";
    if (!token) {
      this.logger.warn("Nenhum provedor de WhatsApp configurado (nem Evolution nem Meta).");
      return;
    }

    const primaryId = params.phoneNumberId.trim();
    let usedPhoneNumberId = primaryId;
    let { ok, status, errText } = await this.postTextOnce(primaryId, token, to, body);

    const sub = graphErrorSubcode(errText);
    const fallbackId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim();
    if (!ok && sub === 33 && fallbackId && fallbackId !== primaryId) {
      this.logger.warn(
        `WhatsApp send com phone_number_id do webhook (${primaryId}) falhou (100/33); retentando com WHATSAPP_PHONE_NUMBER_ID=${fallbackId}.`
      );
      usedPhoneNumberId = fallbackId;
      ({ ok, status, errText } = await this.postTextOnce(fallbackId, token, to, body));
    }

    if (ok) {
      const maxLen = 4000;
      const text = body.length > maxLen ? `${body.slice(0, maxLen)}…[truncado]` : body;
      this.logger.log(
        `[Meta Cloud] WhatsApp mensagem enviada: phone_number_id=${usedPhoneNumberId} para=${to}\n---\n${text}\n---`
      );
      return;
    }

    if (!ok) {
      const preview = body.length > 500 ? `${body.slice(0, 500)}…` : body;
      this.logger.warn(
        `WhatsApp envio falhou (texto que seria enviado, para=${params.toWaId.replace(/\D/g, "")}): ${preview}`
      );
      this.logger.error(`WhatsApp send failed: HTTP ${status} body=${errText.slice(0, 500)}`);
      if (graphErrorSubcode(errText) === 33) {
        this.logger.warn(
          "Meta 100/33: o WHATSAPP_ACCESS_TOKEN não tem permissão sobre esse phone_number_id. " +
            "No Meta for Developers → seu App → WhatsApp → Introdução / Configuração da API: gere o token no **mesmo** app que está inscrito na WABA deste número, " +
            "ou use um token de **usuário do sistema** (Business Settings → Users → System users) com acesso total a essa conta WhatsApp Business. " +
            "Token de outro app ou de Graph API Explorer costuma causar exatamente este erro."
        );
        if (!fallbackId || fallbackId === primaryId) {
          this.logger.warn(
            `Não houve retentativa com outro ID: defina WHATSAPP_PHONE_NUMBER_ID com o **Phone number ID** do número para o qual o token foi gerado (painel da API), ` +
              `se for diferente do ID do webhook (${primaryId}). Se forem iguais, só resolve trocando o token por um que tenha permissão nesse número/WABA.`
          );
        }
      }
    }
  }

  private async postPollViaEvolution(
    toWaId: string,
    question: string,
    options: string[]
  ): Promise<{ ok: boolean; status: number; errText: string }> {
    const baseUrl = this.config.get<string>("EVOLUTION_API_URL")?.trim().replace(/\/+$/, "");
    const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
    const instance = this.config.get<string>("EVOLUTION_INSTANCE_NAME")?.trim() || "energiv-bot";

    if (!baseUrl || !apiKey) {
      return {
        ok: false,
        status: 500,
        errText: "Evolution API not fully configured",
      };
    }

    const url = `${baseUrl}/message/sendPoll/${encodeURIComponent(instance)}`;
    const validValues = options.slice(0, 12).map((opt) => truncateSafe(opt, 32));
    const title = truncateSafe(question, 255);

    return this.sendEvolutionWithNumberRetry(url, toWaId, {
      name: title,
      values: validValues,
      selectableOptionsCount: 1,
      poll: {
        name: title,
        values: validValues,
        selectableOptionsCount: 1,
      },
    });
  }

  private async postInteractiveViaEvolution(
    toWaId: string,
    type: "list" | "button",
    dataPayload: Record<string, unknown>
  ): Promise<{ ok: boolean; status: number; errText: string }> {
    const baseUrl = this.config.get<string>("EVOLUTION_API_URL")?.trim().replace(/\/+$/, "");
    const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
    const instance = this.config.get<string>("EVOLUTION_INSTANCE_NAME")?.trim() || "energiv-bot";

    if (!baseUrl || !apiKey) {
      return {
        ok: false,
        status: 500,
        errText: "Evolution API not fully configured",
      };
    }

    const endpoint = type === "list" ? "sendList" : "sendButtons";
    const url = `${baseUrl}/message/${endpoint}/${encodeURIComponent(instance)}`;
    return this.sendEvolutionWithNumberRetry(url, toWaId, dataPayload);
  }

  async sendInteractiveListMessage(params: SendInteractiveListParams): Promise<void> {
    const to = formatToInternationalWhatsapp(params.toWaId);
    const rawBody = params.body || "";
    const cleanButtonText = truncateSafe(params.buttonText || "Ver Opções", 20);

    const metaSections = params.sections.map((sec, sIdx) => ({
      title: truncateSafe(sec.title || `Opções ${sIdx + 1}`, 24),
      rows: sec.rows.slice(0, 10).map((row) => ({
        id: truncateSafe(row.id, 200),
        title: truncateSafe(row.title, 24),
        description: row.description ? truncateSafe(row.description, 72) : undefined,
      })),
    }));

    let interactiveBody = rawBody;
    if (rawBody.length > 950) {
      const splitIdx = rawBody.lastIndexOf("\n\n");
      if (splitIdx > 0 && splitIdx < 950) {
        const mainBody = rawBody.slice(0, splitIdx).trim();
        interactiveBody = rawBody.slice(splitIdx).trim();
        await this.sendTextMessage({
          phoneNumberId: params.phoneNumberId,
          toWaId: params.toWaId,
          body: mainBody,
        });
      } else {
        await this.sendTextMessage({
          phoneNumberId: params.phoneNumberId,
          toWaId: params.toWaId,
          body: rawBody,
        });
        interactiveBody = "Por favor, selecione uma das opções abaixo:";
      }
    }

    const interactivePayload: Record<string, unknown> = {
      type: "list",
      header: params.title ? { type: "text", text: truncateSafe(params.title, 60) } : undefined,
      body: { text: normalizeAssistantTextForWhatsapp(interactiveBody) },
      footer: params.footer ? { text: truncateSafe(params.footer, 60) } : undefined,
      action: {
        button: cleanButtonText,
        sections: metaSections,
      },
    };

    // 1. Tentar Evolution API se configurada
    if (this.isEvolutionProvider()) {
      const evoSections = params.sections.map((sec, sIdx) => ({
        title: sec.title || `Opções ${sIdx + 1}`,
        rows: sec.rows.map((row) => ({
          title: row.title,
          description: row.description || "",
          rowId: row.id,
          id: row.id,
        })),
      }));

      // Tenta sendList primeiro
      const { ok, status, errText } = await this.postInteractiveViaEvolution(to, "list", {
        title: params.title || "EnergivIA",
        description: interactiveBody,
        buttonText: cleanButtonText,
        footerText: params.footer || "EnergivIA Solar",
        footer: params.footer || "EnergivIA Solar",
        sections: evoSections,
      });

      if (ok) {
        this.logger.log(`[Evolution API] Lista interativa enviada para ${to}`);
        return;
      }

      this.logger.warn(
        `[Evolution API] Falha no envio de lista (HTTP ${status} err=${errText.slice(0, 150)}). Tentando via Enquete (Poll)...`
      );

      // Se falhar (ex: Baileys/WhatsApp Web sem suporte a listas), envia Enquete interativa nativa!
      const pollOptions = params.sections.flatMap((s) => s.rows.map((r) => r.title));
      if (pollOptions.length > 0) {
        if (interactiveBody && interactiveBody.length > 0) {
          await this.sendTextMessage({
            phoneNumberId: params.phoneNumberId,
            toWaId: params.toWaId,
            body: interactiveBody,
          });
        }
        const pollRes = await this.postPollViaEvolution(
          to,
          params.title || "Selecione uma opção:",
          pollOptions
        );
        if (pollRes.ok) {
          this.logger.log(`[Evolution API] Enquete interativa enviada com sucesso para ${to}`);
          return;
        }
        this.logger.warn(
          `[Evolution API] Falha também no envio da enquete (HTTP ${pollRes.status} err=${pollRes.errText.slice(0, 150)}). Tentando Meta Cloud API...`
        );
      }
    }

    // 2. Meta Cloud API oficial
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";

    if (token) {
      const fallbackId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim();
      const primaryId = /^\d+$/.test(params.phoneNumberId.trim())
        ? params.phoneNumberId.trim()
        : fallbackId || params.phoneNumberId.trim();

      const { ok, errText } = await this.postInteractiveOnce(
        primaryId,
        token,
        to,
        interactivePayload
      );

      if (ok) {
        this.logger.log(
          `[Meta Cloud] Lista interativa enviada: phone_number_id=${primaryId} para=${to}`
        );
        return;
      }

      this.logger.warn(
        `[Meta Cloud] Falha ao enviar lista interativa (${errText.slice(0, 200)}). Acionando fallback textual...`
      );
    }

    // 3. Fallback Seguro textual
    const fallbackText = buildFallbackTextForList(rawBody, params.sections);
    await this.sendTextMessage({
      phoneNumberId: params.phoneNumberId,
      toWaId: params.toWaId,
      body: fallbackText,
    });
  }

  async sendInteractiveButtonMessage(params: SendInteractiveButtonParams): Promise<void> {
    const to = formatToInternationalWhatsapp(params.toWaId);
    const rawBody = params.body || "";

    const metaButtons = params.buttons.slice(0, 3).map((b) => ({
      type: "reply",
      reply: {
        id: truncateSafe(b.id, 256),
        title: truncateSafe(b.title, 20),
      },
    }));

    let interactiveBody = rawBody;
    if (rawBody.length > 950) {
      const splitIdx = rawBody.lastIndexOf("\n\n");
      if (splitIdx > 0 && splitIdx < 950) {
        const mainBody = rawBody.slice(0, splitIdx).trim();
        interactiveBody = rawBody.slice(splitIdx).trim();
        await this.sendTextMessage({
          phoneNumberId: params.phoneNumberId,
          toWaId: params.toWaId,
          body: mainBody,
        });
      } else {
        await this.sendTextMessage({
          phoneNumberId: params.phoneNumberId,
          toWaId: params.toWaId,
          body: rawBody,
        });
        interactiveBody = "Por favor, escolha uma das opções abaixo:";
      }
    }

    const interactivePayload: Record<string, unknown> = {
      type: "button",
      header: params.title ? { type: "text", text: truncateSafe(params.title, 60) } : undefined,
      body: { text: normalizeAssistantTextForWhatsapp(interactiveBody) },
      footer: params.footer ? { text: truncateSafe(params.footer, 60) } : undefined,
      action: {
        buttons: metaButtons,
      },
    };

    // 1. Tentar Evolution API se configurada
    if (this.isEvolutionProvider()) {
      const evoButtons = params.buttons.slice(0, 3).map((b) => ({
        buttonId: b.id,
        id: b.id,
        buttonText: { displayText: b.title },
        displayText: b.title,
        type: 1,
      }));

      const { ok, status, errText } = await this.postInteractiveViaEvolution(to, "button", {
        title: params.title || "EnergivIA",
        description: interactiveBody,
        footer: params.footer || "EnergivIA Solar",
        footerText: params.footer || "EnergivIA Solar",
        buttons: evoButtons,
      });

      if (ok) {
        this.logger.log(`[Evolution API] Botões interativos enviados para ${to}`);
        return;
      }

      this.logger.warn(
        `[Evolution API] Falha no envio de botões (HTTP ${status} err=${errText.slice(0, 150)}). Tentando via Enquete (Poll)...`
      );

      // Fallback para Enquete Interativa
      const pollOptions = params.buttons.map((b) => b.title);
      if (pollOptions.length > 0) {
        if (interactiveBody && interactiveBody.length > 0) {
          await this.sendTextMessage({
            phoneNumberId: params.phoneNumberId,
            toWaId: params.toWaId,
            body: interactiveBody,
          });
        }
        const pollRes = await this.postPollViaEvolution(
          to,
          params.title || "Selecione uma opção:",
          pollOptions
        );
        if (pollRes.ok) {
          this.logger.log(`[Evolution API] Enquete interativa de botões enviada para ${to}`);
          return;
        }
        this.logger.warn(
          `[Evolution API] Falha também na enquete (HTTP ${pollRes.status} err=${pollRes.errText.slice(0, 150)}). Tentando Meta Cloud API...`
        );
      }
    }

    // 2. Meta Cloud API oficial
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";

    if (token) {
      const fallbackId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim();
      const primaryId = /^\d+$/.test(params.phoneNumberId.trim())
        ? params.phoneNumberId.trim()
        : fallbackId || params.phoneNumberId.trim();

      const { ok, errText } = await this.postInteractiveOnce(
        primaryId,
        token,
        to,
        interactivePayload
      );

      if (ok) {
        this.logger.log(
          `[Meta Cloud] Botões interativos enviados: phone_number_id=${primaryId} para=${to}`
        );
        return;
      }

      this.logger.warn(
        `[Meta Cloud] Falha ao enviar botões interativos (${errText.slice(0, 200)}). Acionando fallback textual...`
      );
    }

    // 3. Fallback Seguro
    const fallbackText = buildFallbackTextForButtons(rawBody, params.buttons);
    await this.sendTextMessage({
      phoneNumberId: params.phoneNumberId,
      toWaId: params.toWaId,
      body: fallbackText,
    });
  }

  private graphVersion(): string {
    return this.config.get<string>("WHATSAPP_GRAPH_API_VERSION")?.trim() || "v21.0";
  }

  private withAppSecretProofOnGraphFacebook(urlString: string, token: string): string {
    const appSecret = this.config.get<string>("WHATSAPP_APP_SECRET")?.trim();
    if (!appSecret) return urlString;
    try {
      const u = new URL(urlString);
      if (u.hostname !== "graph.facebook.com") return urlString;
      u.searchParams.set("appsecret_proof", appSecretProof(token, appSecret));
      return u.toString();
    } catch {
      return urlString;
    }
  }

  async downloadWhatsappMedia(
    mediaId: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!mediaId) {
      this.logger.warn("downloadWhatsappMedia: missing mediaId");
      return null;
    }

    // 1. Checar se já temos a mídia registrada da Evolution API (via base64 do webhook)
    const cached = this.mediaCache.get(mediaId);
    if (cached) {
      this.logger.log(`WA media: recuperada do cache local mediaId=${mediaId}`);
      return { buffer: cached.buffer, mimeType: cached.mimeType };
    }

    // 2. Se for Evolution API e tiver URL, tentar buscar na Evolution
    if (this.isEvolutionProvider()) {
      const baseUrl = this.config.get<string>("EVOLUTION_API_URL")?.trim().replace(/\/+$/, "");
      const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
      const instance = this.config.get<string>("EVOLUTION_INSTANCE_NAME")?.trim() || "energiv-bot";

      if (baseUrl && apiKey) {
        try {
          const evoUrl = `${baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`;
          const evoRes = await fetch(evoUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
            },
            body: JSON.stringify({
              message: { key: { id: mediaId } },
              convertToMp4: false,
            }),
          });

          if (evoRes.ok) {
            const data = (await evoRes.json()) as { base64?: string; mimetype?: string };
            if (data.base64) {
              const buffer = Buffer.from(data.base64, "base64");
              const mimeType = data.mimetype || "application/octet-stream";
              this.registerMediaBuffer(mediaId, buffer, mimeType);
              return { buffer, mimeType };
            }
          }
        } catch (evoErr) {
          this.logger.warn(`WA media: falha ao buscar mídia na Evolution API: ${evoErr}`);
        }
      }
    }

    // 3. Fallback: Meta Cloud API
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";
    if (!token) {
      this.logger.warn(
        "downloadWhatsappMedia: missing WHATSAPP_ACCESS_TOKEN and not found in Evolution cache"
      );
      return null;
    }
    const timeoutMsRaw = this.config.get<string | number>("WHATSAPP_MEDIA_FETCH_TIMEOUT_MS");
    const timeoutMs = Math.min(
      300_000,
      Math.max(10_000, Number(timeoutMsRaw ?? 120_000) || 120_000)
    );
    const metaUrl = this.withAppSecretProofOnGraphFacebook(
      `https://graph.facebook.com/${this.graphVersion()}/${encodeURIComponent(mediaId)}`,
      token
    );
    this.logger.log(`WA media: fetching metadata mediaId=${mediaId.slice(0, 24)}…`);
    try {
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!metaRes.ok) {
        const t = await metaRes.text().catch(() => "");
        this.logger.error(`WA media metadata HTTP ${metaRes.status}: ${t.slice(0, 400)}`);
        return null;
      }
      const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
      if (!meta.url) {
        this.logger.error("WA media metadata: resposta sem url");
        return null;
      }
      const binUrl = meta.url.includes("graph.facebook.com")
        ? this.withAppSecretProofOnGraphFacebook(meta.url, token)
        : meta.url;
      let binaryHost = "unknown";
      try {
        binaryHost = new URL(binUrl).hostname;
      } catch {
        this.logger.error("WA media: invalid binary URL from metadata");
        return null;
      }
      this.logger.log(`WA media: downloading binary host=${binaryHost}`);
      const binRes = await fetch(binUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!binRes.ok) {
        const t = await binRes.text().catch(() => "");
        this.logger.error(`WA media binary HTTP ${binRes.status}: ${t.slice(0, 300)}`);
        return null;
      }
      const buffer = Buffer.from(await binRes.arrayBuffer());
      const mimeType =
        meta.mime_type?.trim() || binRes.headers.get("content-type") || "application/octet-stream";
      this.logger.log(`WA media: download ok bytes=${buffer.byteLength} mime=${mimeType}`);
      return { buffer, mimeType };
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "AbortError" || name === "TimeoutError") {
        this.logger.error(
          `WA media: download timed out or aborted (${timeoutMs}ms) mediaId=${mediaId.slice(0, 32)}`
        );
        return null;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`WA media: download failed: ${msg.slice(0, 400)}`);
      return null;
    }
  }
}
