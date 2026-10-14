/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsappBotService - Interactive Dispatch Flow", () => {
  let service: WhatsappBotService;
  let mockWhatsappCloud: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(undefined),
      sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
      sendInteractiveList: vi.fn().mockResolvedValue(undefined),
    };

    service = new WhatsappBotService(
      { get: vi.fn().mockReturnValue("") } as any,
      {} as any,
      mockWhatsappCloud,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it("should dispatch sendInteractiveList for roof structure question", async () => {
    const roofMsg =
      "*_Qual a estrutura do telhado?_* 🏠\n\n> 1️⃣ *Cerâmica (Colonial)*\n> 2️⃣ *Fibrocimento*\n";

    await (service as any).dispatchWhatsappReply({
      phoneNumberId: "phone_123",
      toWaId: "5544999998888",
      replyText: roofMsg,
      organizationId: "org_1",
    });

    expect(mockWhatsappCloud.sendInteractiveList).toHaveBeenCalledTimes(1);
    const callArgs = mockWhatsappCloud.sendInteractiveList.mock.calls[0][0];
    expect(callArgs.buttonText).toBe("Selecionar Telhado");
    expect(callArgs.sections[0].rows).toHaveLength(7);
    expect(callArgs.sections[0].rows[0].id).toBe("1");
    expect(callArgs.sections[0].rows[0].title).toContain("Cerâmica");
  });

  it("should dispatch sendInteractiveButtons for kit selection", async () => {
    const kitMsg =
      "Opção 1 — Standard 🏆\nOpção 2 — Elite\nOpção 3 — Premium\nQual opção você prefere para o seu cliente?\n";

    await (service as any).dispatchWhatsappReply({
      phoneNumberId: "phone_123",
      toWaId: "5544999998888",
      replyText: kitMsg,
      organizationId: "org_1",
    });

    expect(mockWhatsappCloud.sendInteractiveButtons).toHaveBeenCalledTimes(1);
    const callArgs = mockWhatsappCloud.sendInteractiveButtons.mock.calls[0][0];
    expect(callArgs.buttons).toHaveLength(3);
    expect(callArgs.buttons[0]).toEqual({ id: "1", title: "1️⃣ Standard" });
    expect(callArgs.buttons[1]).toEqual({ id: "2", title: "2️⃣ Elite" });
    expect(callArgs.buttons[2]).toEqual({ id: "3", title: "3️⃣ Premium" });
  });

  it("should dispatch sendInteractiveButtons for price decision", async () => {
    const priceMsg =
      "Como você deseja prosseguir para esta cotação?\n> 1️⃣ Seguir com o preço padrão\n> 2️⃣ Informar outro preço\n";

    await (service as any).dispatchWhatsappReply({
      phoneNumberId: "phone_123",
      toWaId: "5544999998888",
      replyText: priceMsg,
      organizationId: "org_1",
    });

    expect(mockWhatsappCloud.sendInteractiveButtons).toHaveBeenCalledTimes(1);
    const callArgs = mockWhatsappCloud.sendInteractiveButtons.mock.calls[0][0];
    expect(callArgs.buttons).toHaveLength(2);
    expect(callArgs.buttons[0]).toEqual({ id: "1", title: "1️⃣ Preço Padrão" });
    expect(callArgs.buttons[1]).toEqual({ id: "2", title: "2️⃣ Outro Valor" });
  });

  it("should dispatch sendTextMessage for standard text response (fallback)", async () => {
    const plainMsg = "Cliente Carlos Silva registrado com sucesso! 👤✨\n";

    await (service as any).dispatchWhatsappReply({
      phoneNumberId: "phone_123",
      toWaId: "5544999998888",
      replyText: plainMsg,
      organizationId: "org_1",
    });

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledTimes(1);
    expect(mockWhatsappCloud.sendInteractiveButtons).not.toHaveBeenCalled();
    expect(mockWhatsappCloud.sendInteractiveList).not.toHaveBeenCalled();
  });
});
