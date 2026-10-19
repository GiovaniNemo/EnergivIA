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

export function sanitizeMetaInteractiveText(text: string, maxLen = 1024): string {
  const normalized = normalizeAssistantTextForWhatsapp(text || "").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 3)}...`;
}

export function sanitizeMetaButtonTitle(title: string): string {
  const clean = (title || "").trim().replace(/[\r\n\t]+/g, " ");
  return clean.slice(0, 20).trim() || "Opção";
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
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

  private isEvolutionInteractiveEnabled(): boolean {
    const val = this.config.get<string>("EVOLUTION_INTERACTIVE_ENABLED")?.trim().toLowerCase();
    return val === "true" || val === "1";
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

    const cleanNumber = formatToInternationalWhatsapp(toWaId);
    const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;

    const sendToNumber = async (num: string) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: num,
            text: body,
          }),
        });

        const errText = res.ok ? "" : await res.text().catch(() => "");
        return { ok: res.ok, status: res.status, errText };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, status: 500, errText: msg };
      }
    };

    let result = await sendToNumber(cleanNumber);
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
        const altResult = await sendToNumber(altNumber);
        if (altResult.ok) {
          return altResult;
        }
      }
    }
    return result;
  }

  async sendTextMessage(params: {
    phoneNumberId: string;
    toWaId: string;
    body: string;
  }): Promise<boolean> {
    const body = normalizeAssistantTextForWhatsapp(params.body);
    const to = formatToInternationalWhatsapp(params.toWaId);

    // 1. Envio via Evolution API (Custo ZERO por mensagem)
    if (this.isEvolutionProvider()) {
      const { ok, status, errText } = await this.postTextViaEvolution(to, body);
      if (ok) {
        const maxLen = 4000;
        const text = body.length > maxLen ? `${body.slice(0, maxLen)}…[truncado]` : body;
        this.logger.log(`[Evolution API] WhatsApp mensagem enviada: para=${to}\n---\n${text}\n---`);
        return true;
      }
      this.logger.error(
        `[Evolution API] Falha no envio para ${to}: HTTP ${status} err=${errText.slice(0, 300)}`
      );
      // Se a Evolution falhar e não houver token da Meta, encerra aqui
      const token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim();
      if (!token) return false;
      this.logger.warn(`Tentando fallback via Meta Cloud API para ${to}...`);
    }

    // 2. Envio via Meta Cloud API (Oficial)
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";
    if (!token) {
      this.logger.warn("Nenhum provedor de WhatsApp configurado (nem Evolution nem Meta).");
      return false;
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
      return true;
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
    return false;
  }

  async sendInteractiveButtons(params: {
    phoneNumberId: string;
    toWaId: string;
    body: string;
    buttons: InteractiveButton[];
    footer?: string;
  }): Promise<void> {
    const to = formatToInternationalWhatsapp(params.toWaId);
    const body = normalizeAssistantTextForWhatsapp(params.body);
    const buttons = (params.buttons || []).slice(0, 3);

    if (buttons.length === 0) {
      await this.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body,
      });
      return;
    }

    // 1. Provedor Evolution API
    if (this.isEvolutionProvider()) {
      if (!this.isEvolutionInteractiveEnabled()) {
        await this.sendTextMessage({
          phoneNumberId: params.phoneNumberId,
          toWaId: params.toWaId,
          body,
        });
        return;
      }

      const baseUrl = this.config.get<string>("EVOLUTION_API_URL")?.trim().replace(/\/+$/, "");
      const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
      const instance = this.config.get<string>("EVOLUTION_INSTANCE_NAME")?.trim() || "energiv-bot";

      if (baseUrl && apiKey) {
        const url = `${baseUrl}/message/sendButtons/${encodeURIComponent(instance)}`;
        const sendButtonsToNumber = async (num: string) => {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: apiKey,
              },
              body: JSON.stringify({
                number: num,
                title: "EnergivIA",
                description: body,
                footer: params.footer || "Selecione uma opção",
                buttons: buttons.map((b) => ({
                  type: "reply",
                  displayText: b.title.slice(0, 20),
                  id: b.id,
                })),
              }),
            });
            const text = await res.text().catch(() => "");
            return { ok: res.ok, status: res.status, errText: text };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, status: 500, errText: msg };
          }
        };

        let result = await sendButtonsToNumber(to);
        if (!result.ok && to.startsWith("55")) {
          let altNumber: string | null = null;
          if (to.length === 12) {
            altNumber = `${to.slice(0, 4)}9${to.slice(4)}`;
          } else if (to.length === 13 && to.charAt(4) === "9") {
            altNumber = `${to.slice(0, 4)}${to.slice(5)}`;
          }
          if (altNumber) {
            const altResult = await sendButtonsToNumber(altNumber);
            if (altResult.ok) result = altResult;
          }
        }

        if (result.ok) {
          this.logger.log(`[Evolution API] Botões interativos enviados para ${to}`);
          return;
        }

        this.logger.warn(
          `[Evolution API] Falha no envio de botões (${result.status}): ${result.errText.slice(0, 300)}. Executando fallback para texto.`
        );
      }
      await this.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body,
      });
      return;
    }

    // 2. Provedor Meta Cloud API
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";

    if (!token) {
      await this.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body,
      });
      return;
    }

    const sanitizedButtons = buttons
      .map((b, idx) => ({
        id: (b.id || `btn_${idx}`).trim().slice(0, 256),
        title: sanitizeMetaButtonTitle(b.title),
      }))
      .filter((b) => b.title.length > 0);

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: sanitizeMetaInteractiveText(body, 1024),
        },
        ...(params.footer ? { footer: { text: params.footer.trim().slice(0, 60) } } : {}),
        action: {
          buttons: sanitizedButtons.map((b) => ({
            type: "reply",
            reply: {
              id: b.id,
              title: b.title,
            },
          })),
        },
      },
    };

    try {
      const primaryId = params.phoneNumberId.trim();
      const res = await fetch(this.buildMessagesUrl(primaryId, token), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.logger.log(`[Meta Cloud] Botões interativos enviados para ${to}`);
        return;
      }

      const errText = await res.text().catch(() => "");
      this.logger.warn(
        `[Meta Cloud] Falha no envio de botões interativos HTTP ${res.status}: ${errText.slice(0, 300)}. Executando fallback para texto.`
      );
    } catch (err) {
      this.logger.error(`[Meta Cloud] Erro no envio de botões interativos: ${err}`);
    }

    await this.sendTextMessage({
      phoneNumberId: params.phoneNumberId,
      toWaId: params.toWaId,
      body,
    });
  }

  async sendInteractiveList(params: {
    phoneNumberId: string;
    toWaId: string;
    body: string;
    buttonText: string;
    sections: InteractiveListSection[];
    footer?: string;
  }): Promise<void> {
    const to = formatToInternationalWhatsapp(params.toWaId);
    const body = normalizeAssistantTextForWhatsapp(params.body);

    // 1. Provedor Evolution API
    if (this.isEvolutionProvider()) {
      if (!this.isEvolutionInteractiveEnabled()) {
        await this.sendTextMessage({
          phoneNumberId: params.phoneNumberId,
          toWaId: params.toWaId,
          body,
        });
        return;
      }

      const baseUrl = this.config.get<string>("EVOLUTION_API_URL")?.trim().replace(/\/+$/, "");
      const apiKey = this.config.get<string>("EVOLUTION_API_KEY")?.trim();
      const instance = this.config.get<string>("EVOLUTION_INSTANCE_NAME")?.trim() || "energiv-bot";

      if (baseUrl && apiKey) {
        const url = `${baseUrl}/message/sendList/${encodeURIComponent(instance)}`;
        const sendListToNumber = async (num: string) => {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: apiKey,
              },
              body: JSON.stringify({
                number: num,
                title: "EnergivIA",
                description: body,
                buttonText: params.buttonText.slice(0, 20),
                footerText: params.footer || "Selecione uma opção",
                sections: params.sections.map((s) => ({
                  title: s.title.slice(0, 24),
                  rows: s.rows.slice(0, 10).map((r) => ({
                    rowId: r.id,
                    title: r.title.slice(0, 24),
                    ...(r.description ? { description: r.description.slice(0, 72) } : {}),
                  })),
                })),
              }),
            });
            const text = await res.text().catch(() => "");
            return { ok: res.ok, status: res.status, errText: text };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, status: 500, errText: msg };
          }
        };

        let result = await sendListToNumber(to);
        if (!result.ok && to.startsWith("55")) {
          let altNumber: string | null = null;
          if (to.length === 12) {
            altNumber = `${to.slice(0, 4)}9${to.slice(4)}`;
          } else if (to.length === 13 && to.charAt(4) === "9") {
            altNumber = `${to.slice(0, 4)}${to.slice(5)}`;
          }
          if (altNumber) {
            const altResult = await sendListToNumber(altNumber);
            if (altResult.ok) result = altResult;
          }
        }

        if (result.ok) {
          this.logger.log(`[Evolution API] Lista interativa enviada para ${to}`);
          return;
        }

        this.logger.warn(
          `[Evolution API] Falha no envio de lista (${result.status}): ${result.errText.slice(0, 300)}. Executando fallback para texto.`
        );
      }
      await this.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body,
      });
      return;
    }

    // 2. Provedor Meta Cloud API
    const token =
      this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim() ||
      "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";

    if (!token) {
      await this.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body,
      });
      return;
    }

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: sanitizeMetaInteractiveText(body, 1024),
        },
        ...(params.footer ? { footer: { text: params.footer.trim().slice(0, 60) } } : {}),
        action: {
          button: (params.buttonText || "Opções").trim().slice(0, 20),
          sections: params.sections.map((s) => ({
            title: (s.title || "Opções").trim().slice(0, 24),
            rows: s.rows.slice(0, 10).map((r) => ({
              id: (r.id || "").trim().slice(0, 200),
              title: (r.title || "Item").trim().slice(0, 24),
              ...(r.description ? { description: r.description.trim().slice(0, 72) } : {}),
            })),
          })),
        },
      },
    };

    try {
      const primaryId = params.phoneNumberId.trim();
      const res = await fetch(this.buildMessagesUrl(primaryId, token), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.logger.log(`[Meta Cloud] Lista interativa enviada para ${to}`);
        return;
      }

      const errText = await res.text().catch(() => "");
      this.logger.warn(
        `[Meta Cloud] Falha no envio de lista interativa HTTP ${res.status}: ${errText.slice(0, 300)}. Executando fallback para texto.`
      );
    } catch (err) {
      this.logger.error(`[Meta Cloud] Erro no envio de lista interativa: ${err}`);
    }

    await this.sendTextMessage({
      phoneNumberId: params.phoneNumberId,
      toWaId: params.toWaId,
      body,
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

  private async postDocumentViaEvolution(
    toWaId: string,
    params: {
      fileName: string;
      media: string;
      caption?: string;
      mimetype?: string;
    }
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

    const cleanNumber = formatToInternationalWhatsapp(toWaId);
    const url = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;

    const sendToNumber = async (num: string) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: num,
            mediatype: "document",
            mimetype: params.mimetype || "application/pdf",
            caption: params.caption || "",
            media: params.media,
            fileName: params.fileName,
          }),
        });

        const errText = res.ok ? "" : await res.text().catch(() => "");
        return { ok: res.ok, status: res.status, errText };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, status: 500, errText: msg };
      }
    };

    let result = await sendToNumber(cleanNumber);
    if (!result.ok && cleanNumber.startsWith("55")) {
      let altNumber: string | null = null;
      if (cleanNumber.length === 12) {
        altNumber = `${cleanNumber.slice(0, 4)}9${cleanNumber.slice(4)}`;
      } else if (cleanNumber.length === 13 && cleanNumber.charAt(4) === "9") {
        altNumber = `${cleanNumber.slice(0, 4)}${cleanNumber.slice(5)}`;
      }
      if (altNumber) {
        this.logger.warn(
          `[Evolution API] Falha no envio de documento para ${cleanNumber} (${result.status}). Tentando variante ${altNumber}...`
        );
        const altResult = await sendToNumber(altNumber);
        if (altResult.ok) {
          return altResult;
        }
      }
    }
    return result;
  }

  async sendDocumentMessage(params: {
    phoneNumberId: string;
    toWaId: string;
    fileName: string;
    documentBase64?: string;
    documentUrl?: string;
    caption?: string;
    mimetype?: string;
  }): Promise<boolean> {
    const to = formatToInternationalWhatsapp(params.toWaId);
    const media = params.documentBase64 || params.documentUrl;
    if (!media) {
      this.logger.error("sendDocumentMessage chamado sem documentBase64 ou documentUrl");
      return false;
    }

    // 1. Envio via Evolution API
    if (this.isEvolutionProvider()) {
      const { ok, status, errText } = await this.postDocumentViaEvolution(to, {
        fileName: params.fileName,
        media,
        caption: params.caption,
        mimetype: params.mimetype,
      });

      if (ok) {
        this.logger.log(
          `[Evolution API] WhatsApp documento enviado com sucesso: para=${to} file=${params.fileName}`
        );
        return true;
      }
      this.logger.error(
        `[Evolution API] Falha no envio de documento para ${to}: HTTP ${status} err=${errText.slice(0, 300)}`
      );
      const token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim();
      if (!token) return false;
      this.logger.warn(`Tentando fallback de documento via Meta Cloud API para ${to}...`);
    }

    // 2. Envio via Meta Cloud API (se houver token e URL pública)
    const token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim();
    if (token && params.documentUrl) {
      const primaryId =
        params.phoneNumberId.trim() ||
        this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() ||
        "";
      const url = `https://graph.facebook.com/v21.0/${primaryId}/messages`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "document",
            document: {
              link: params.documentUrl,
              caption: params.caption,
              filename: params.fileName,
            },
          }),
        });
        if (res.ok) {
          this.logger.log(
            `[Meta Cloud] WhatsApp documento enviado: para=${to} file=${params.fileName}`
          );
          return true;
        }
      } catch (err) {
        this.logger.error("Falha no envio de documento via Meta Cloud:", err);
      }
    }

    return false;
  }
}
