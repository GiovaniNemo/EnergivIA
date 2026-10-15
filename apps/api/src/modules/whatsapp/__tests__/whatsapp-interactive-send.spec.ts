/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappCloudService } from "../whatsapp-cloud.service";
import { ConfigService } from "@nestjs/config";

describe("WhatsappCloudService - Interactive Buttons and Lists", () => {
  let service: WhatsappCloudService;
  let configService: ConfigService;

  beforeEach(() => {
    vi.restoreAllMocks();
    configService = new ConfigService({
      WHATSAPP_ACCESS_TOKEN: "mock-token",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_GRAPH_API_VERSION: "v21.0",
      WHATSAPP_PROVIDER: "meta",
    });
    service = new WhatsappCloudService(configService);
  });

  it("should send interactive buttons via Meta Cloud API with correct payload structure", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: "wamid.123" }] }),
    } as any);

    await service.sendInteractiveButtons({
      phoneNumberId: "123456789",
      toWaId: "5544999998888",
      body: "Escolha uma opção de kit para o cliente:",
      buttons: [
        { id: "1", title: "1️⃣ Standard" },
        { id: "2", title: "2️⃣ Elite" },
        { id: "3", title: "3️⃣ Premium" },
      ],
      footer: "EnergivIA Solar",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://graph.facebook.com/v21.0/123456789/messages");

    const payload = JSON.parse(options.body as string);
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.to).toBe("5544999998888");
    expect(payload.type).toBe("interactive");
    expect(payload.interactive.type).toBe("button");
    expect(payload.interactive.body.text).toContain("Escolha uma opção de kit");
    expect(payload.interactive.footer.text).toBe("EnergivIA Solar");
    expect(payload.interactive.action.buttons).toHaveLength(3);
    expect(payload.interactive.action.buttons[0]).toEqual({
      type: "reply",
      reply: { id: "1", title: "1️⃣ Standard" },
    });
  });

  it("should truncate and sanitize Meta Cloud API interactive buttons when payload exceeds strict limits", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: "wamid.124" }] }),
    } as any);

    const overlyLongBody = "Texto longo sobre proposta solar ".repeat(40); // > 1200 chars
    const overlyLongFooter = "Rodapé institucional longo da empresa de energia solar ".repeat(2); // > 100 chars

    await service.sendInteractiveButtons({
      phoneNumberId: "123456789",
      toWaId: "5544999998888",
      body: overlyLongBody,
      buttons: [
        { id: "1", title: "Kit Standard Econômico com Inversor Monofásico 5kW" }, // > 20 chars
        { id: "2", title: "Kit Elite Premium Alta Performance 10kWp" }, // > 20 chars
      ],
      footer: overlyLongFooter,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string);

    // Body não pode ultrapassar 1024 caracteres
    expect(payload.interactive.body.text.length).toBeLessThanOrEqual(1024);
    expect(payload.interactive.body.text.endsWith("...")).toBe(true);

    // Footer não pode ultrapassar 60 caracteres
    expect(payload.interactive.footer.text.length).toBeLessThanOrEqual(60);

    // Cada botão não pode ultrapassar 20 caracteres
    for (const btn of payload.interactive.action.buttons) {
      expect(btn.reply.title.length).toBeLessThanOrEqual(20);
    }
    expect(payload.interactive.action.buttons[0].reply.title.length).toBeLessThanOrEqual(20);
  });

  it("should send interactive list via Meta Cloud API with correct payload structure", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: "wamid.123" }] }),
    } as any);

    await service.sendInteractiveList({
      phoneNumberId: "123456789",
      toWaId: "5544999998888",
      body: "Qual a estrutura do telhado?",
      buttonText: "Ver Telhados",
      sections: [
        {
          title: "Opções de Telhado",
          rows: [
            { id: "1", title: "Cerâmica (Colonial)", description: "Telhas convencionais" },
            { id: "2", title: "Fibrocimento", description: "Ondulada em madeira" },
          ],
        },
      ],
      footer: "Selecione uma opção",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://graph.facebook.com/v21.0/123456789/messages");

    const payload = JSON.parse(options.body as string);
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.type).toBe("interactive");
    expect(payload.interactive.type).toBe("list");
    expect(payload.interactive.action.button).toBe("Ver Telhados");
    expect(payload.interactive.action.sections[0].rows).toHaveLength(2);
    expect(payload.interactive.action.sections[0].rows[0].id).toBe("1");
    expect(payload.interactive.action.sections[0].rows[0].title).toBe("Cerâmica (Colonial)");
  });

  it("should fallback to sendTextMessage if sending interactive buttons fails", async () => {
    // First call (interactive button) fails with 400
    // Second call (fallback sendTextMessage) succeeds with 200
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: "Unsupported interactive message" } }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ messages: [{ id: "wamid.text123" }] }),
      } as any);

    await service.sendInteractiveButtons({
      phoneNumberId: "123456789",
      toWaId: "5544999998888",
      body: "Escolha seu kit:\n1. Standard\n2. Elite",
      buttons: [
        { id: "1", title: "Standard" },
        { id: "2", title: "Elite" },
      ],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const fallbackCall = fetchSpy.mock.calls[1] as [string, RequestInit];
    const fallbackPayload = JSON.parse(fallbackCall[1].body as string);
    expect(fallbackPayload.type).toBe("text");
    expect(fallbackPayload.text.body).toContain("Escolha seu kit");
  });

  it("should send interactive buttons via Evolution API with v2 payload format when EVOLUTION_INTERACTIVE_ENABLED is true", async () => {
    const evoConfig = new ConfigService({
      WHATSAPP_PROVIDER: "evolution",
      EVOLUTION_API_URL: "https://evo.example.com",
      EVOLUTION_API_KEY: "secret-key",
      EVOLUTION_INSTANCE_NAME: "test-bot",
      EVOLUTION_INTERACTIVE_ENABLED: "true",
    });
    const evoService = new WhatsappCloudService(evoConfig);

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ key: { id: "evo-msg-123" } }),
    } as any);

    await evoService.sendInteractiveButtons({
      phoneNumberId: "ignored",
      toWaId: "5544999998888",
      body: "Escolha uma opção de kit:",
      buttons: [
        { id: "1", title: "1️⃣ Standard" },
        { id: "2", title: "2️⃣ Elite" },
      ],
      footer: "EnergivIA",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://evo.example.com/message/sendButtons/test-bot");
    expect(options.headers).toMatchObject({
      apikey: "secret-key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(options.body as string);
    expect(body.number).toBe("5544999998888");
    expect(body.buttons).toEqual([
      { type: "reply", displayText: "1️⃣ Standard", id: "1" },
      { type: "reply", displayText: "2️⃣ Elite", id: "2" },
    ]);
  });

  it("should send interactive list via Evolution API with correct payload structure when EVOLUTION_INTERACTIVE_ENABLED is true", async () => {
    const evoConfig = new ConfigService({
      WHATSAPP_PROVIDER: "evolution",
      EVOLUTION_API_URL: "https://evo.example.com",
      EVOLUTION_API_KEY: "secret-key",
      EVOLUTION_INSTANCE_NAME: "test-bot",
      EVOLUTION_INTERACTIVE_ENABLED: "true",
    });
    const evoService = new WhatsappCloudService(evoConfig);

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ key: { id: "evo-list-123" } }),
    } as any);

    await evoService.sendInteractiveList({
      phoneNumberId: "ignored",
      toWaId: "5544999998888",
      body: "Qual a estrutura do telhado?",
      buttonText: "Ver Opções",
      sections: [
        {
          title: "Telhados",
          rows: [{ id: "1", title: "Cerâmica", description: "Telhas coloniais" }],
        },
      ],
      footer: "EnergivIA",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://evo.example.com/message/sendList/test-bot");
    const body = JSON.parse(options.body as string);
    expect(body.sections[0].rows[0]).toEqual({
      rowId: "1",
      title: "Cerâmica",
      description: "Telhas coloniais",
    });
  });

  it("should safely default to text messages for Evolution API to prevent Baileys/WhatsApp Web load errors", async () => {
    const evoConfig = new ConfigService({
      WHATSAPP_PROVIDER: "evolution",
      EVOLUTION_API_URL: "https://evo.example.com",
      EVOLUTION_API_KEY: "secret-key",
      EVOLUTION_INSTANCE_NAME: "test-bot",
      // EVOLUTION_INTERACTIVE_ENABLED is not set (defaults to false)
    });
    const evoService = new WhatsappCloudService(evoConfig);

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ key: { id: "evo-text-123" } }),
    } as any);

    await evoService.sendInteractiveButtons({
      phoneNumberId: "ignored",
      toWaId: "5544999998888",
      body: "Escolha uma opção de kit:\n1. Standard\n2. Elite",
      buttons: [
        { id: "1", title: "1️⃣ Standard" },
        { id: "2", title: "2️⃣ Elite" },
      ],
      footer: "EnergivIA",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://evo.example.com/message/sendText/test-bot");
    const body = JSON.parse(options.body as string);
    expect(body.text).toContain("Escolha uma opção de kit");
  });
});
