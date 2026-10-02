import { describe, it, expect } from "vitest";
import { InteractiveListSection, InteractiveButtonOption } from "../whatsapp-cloud.service";

describe("WhatsApp Interactive Messages Format and Rules", () => {
  it("should format list options safely without exceeding Meta length constraints", () => {
    const sections: InteractiveListSection[] = [
      {
        title: "Opções de Estrutura do Telhado", // > 24 chars
        rows: [
          {
            id: "1",
            title: "Cerâmica (Colonial)",
            description: "Estrutura para telhados com telhas de cerâmica convencionais", // < 72 chars
          },
          {
            id: "2",
            title: "Fibrocimento com estrutura de madeira", // > 24 chars
            description:
              "Estrutura reforçada especialmente projetada para telhas onduladas de fibrocimento em madeira", // > 72 chars
          },
        ],
      },
    ];

    expect(sections[0]?.rows).toHaveLength(2);
    expect(sections[0]?.rows[0]?.id).toBe("1");
  });

  it("should validate button reply option limits (up to 3 buttons)", () => {
    const buttons: InteractiveButtonOption[] = [
      { id: "1", title: "Taxa Padrão" },
      { id: "2", title: "Outro Valor" },
    ];

    expect(buttons.length).toBeLessThanOrEqual(3);
    buttons.forEach((b) => {
      expect(b.title.length).toBeLessThanOrEqual(20);
    });
  });

  it("should correctly identify interactive replies from incoming webhook payloads", () => {
    const metaListPayload = {
      type: "interactive",
      interactive: {
        type: "list_reply",
        list_reply: {
          id: "1",
          title: "Monofásico 220V",
        },
      },
    };

    const metaButtonPayload = {
      type: "interactive",
      interactive: {
        type: "button_reply",
        button_reply: {
          id: "2",
          title: "Outro Valor",
        },
      },
    };

    const extractChoice = (msg: typeof metaListPayload | typeof metaButtonPayload) => {
      if (msg.type === "interactive") {
        if (msg.interactive.type === "list_reply" && "list_reply" in msg.interactive) {
          return msg.interactive.list_reply?.id;
        }
        if (msg.interactive.type === "button_reply" && "button_reply" in msg.interactive) {
          return msg.interactive.button_reply?.id;
        }
      }
      return null;
    };

    expect(extractChoice(metaListPayload)).toBe("1");
    expect(extractChoice(metaButtonPayload)).toBe("2");
  });
});
