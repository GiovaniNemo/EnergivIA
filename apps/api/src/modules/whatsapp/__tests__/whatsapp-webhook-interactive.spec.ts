/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsappBotService - Webhook Interactive Normalization", () => {
  let service: WhatsappBotService;
  let mockProcessSingleMessage: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new WhatsappBotService(
      { get: vi.fn().mockReturnValue("") } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    mockProcessSingleMessage = vi
      .spyOn(service as any, "processSingleMessage")
      .mockResolvedValue(undefined);
  });

  it("should parse Meta Cloud API button_reply into incomingText", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "phone_123" },
                contacts: [{ profile: { name: "Carlos Integrador" } }],
                messages: [
                  {
                    id: "msg_btn_1",
                    from: "5544999998888",
                    type: "interactive",
                    interactive: {
                      type: "button_reply",
                      button_reply: {
                        id: "1",
                        title: "1️⃣ Standard",
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    await service.handleWebhookPayload(payload);

    expect(mockProcessSingleMessage).toHaveBeenCalledTimes(1);
    const arg = mockProcessSingleMessage.mock.calls[0][0];
    expect(arg.message.type).toBe("interactive");
    expect(arg.message.interactive.button_reply.id).toBe("1");
  });

  it("should parse Evolution API buttonsResponseMessage into text message", async () => {
    const payload = {
      event: "messages.upsert",
      data: {
        key: {
          id: "evo_msg_btn_1",
          remoteJid: "5544999998888@s.whatsapp.net",
          fromMe: false,
        },
        pushName: "Carlos Integrador",
        message: {
          buttonsResponseMessage: {
            selectedButtonId: "standard",
            selectedDisplayText: "1️⃣ Standard",
          },
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockProcessSingleMessage).toHaveBeenCalledTimes(1);
    const arg = mockProcessSingleMessage.mock.calls[0][0];
    expect(arg.message.type).toBe("text");
    expect(arg.message.text.body).toBe("standard");
  });

  it("should parse Evolution API listResponseMessage into text message", async () => {
    const payload = {
      event: "messages.upsert",
      data: {
        key: {
          id: "evo_msg_list_1",
          remoteJid: "5544999998888@s.whatsapp.net",
          fromMe: false,
        },
        pushName: "Carlos Integrador",
        message: {
          listResponseMessage: {
            title: "Cerâmica (Colonial)",
            singleSelectReply: {
              selectedRowId: "1",
            },
          },
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockProcessSingleMessage).toHaveBeenCalledTimes(1);
    const arg = mockProcessSingleMessage.mock.calls[0][0];
    expect(arg.message.type).toBe("text");
    expect(arg.message.text.body).toBe("1");
  });
});
