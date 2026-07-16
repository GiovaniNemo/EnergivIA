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
    const res = await fetch(this.buildMessagesUrl(phoneNumberId, token), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWaId.replace(/\D/g, ""),
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    const errText = res.ok ? "" : await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, errText };
  }

  async sendTextMessage(params: {
    phoneNumberId: string;
    toWaId: string;
    body: string;
  }): Promise<void> {
    const token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim();
    if (!token) {
      this.logger.warn("WHATSAPP_ACCESS_TOKEN not set; skipping outbound WhatsApp message.");
      return;
    }

    const body = normalizeAssistantTextForWhatsapp(params.body);

    const primaryId = params.phoneNumberId.trim();
    let usedPhoneNumberId = primaryId;
    let { ok, status, errText } = await this.postTextOnce(primaryId, token, params.toWaId, body);

    const sub = graphErrorSubcode(errText);
    const fallbackId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim();
    if (!ok && sub === 33 && fallbackId && fallbackId !== primaryId) {
      this.logger.warn(
        `WhatsApp send com phone_number_id do webhook (${primaryId}) falhou (100/33); retentando com WHATSAPP_PHONE_NUMBER_ID=${fallbackId}.`
      );
      usedPhoneNumberId = fallbackId;
      ({ ok, status, errText } = await this.postTextOnce(fallbackId, token, params.toWaId, body));
    }

    if (ok) {
      const to = params.toWaId.replace(/\D/g, "");
      const maxLen = 4000;
      const text = body.length > maxLen ? `${body.slice(0, maxLen)}…[truncado]` : body;
      this.logger.log(
        `WhatsApp mensagem enviada: phone_number_id=${usedPhoneNumberId} para=${to}\n---\n${text}\n---`
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
    const token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN")?.trim();
    if (!token || !mediaId) {
      this.logger.warn("downloadWhatsappMedia: missing WHATSAPP_ACCESS_TOKEN or mediaId");
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
