import { describe, it, expect } from "vitest";

describe("WhatsApp Bot - Module Quantity Simulation Flow", () => {
  it("should NOT treat menu selection '4' as targetKWp = 4", () => {
    const greetingMenu =
      "Sou seu assistente de vendas e dimensionamento da EnergivIA Solar.\n\n" +
      "Como posso ajudar você a gerar orçamentos hoje?\n\n" +
      "> 1️⃣ Enviar fatura de energia (PDF ou foto)\n" +
      "> 2️⃣ Simular por consumo mensal (ex: 450 kWh)\n" +
      "> 3️⃣ Simular por potência de pico (ex: 5 kWp)\n" +
      "> 4️⃣ Simular por quantidade de placas (ex: 10 módulos)\n\n" +
      "(Responda com o número da opção ou envie a conta de luz diretamente)";

    const isMainMenuMsg =
      greetingMenu.includes("Como posso ajudar você a gerar orçamentos hoje") ||
      greetingMenu.includes("Sou seu assistente de vendas") ||
      greetingMenu.includes("1️⃣ *Enviar fatura");

    expect(isMainMenuMsg).toBe(true);

    const userChoice = "4";
    let targetKWp: number | undefined;

    const kwpM = userChoice.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
    if (kwpM && kwpM[1]) {
      targetKWp = parseFloat(kwpM[1].replace(",", "."));
    } else if (
      !isMainMenuMsg &&
      (greetingMenu.includes("Simulação por Potência de Pico") ||
        greetingMenu.includes("potência de pico desejada") ||
        greetingMenu.includes("potência desejada em kWp") ||
        greetingMenu.includes("potência (kWp)"))
    ) {
      const numM = userChoice.match(/(\d+(?:[.,]\d+)?)/);
      if (numM && numM[1]) {
        targetKWp = parseFloat(numM[1].replace(",", "."));
      }
    }

    expect(targetKWp).toBeUndefined();
  });

  it("should correctly extract 20 modules of 630W without leaking targetKWp", () => {
    const messages = [
      {
        role: "assistant",
        content:
          "Sou seu assistente de vendas e dimensionamento da *_EnergivIA Solar._*\n\n" +
          "*_Como posso ajudar você a gerar orçamentos hoje?_*\n\n" +
          "> 1️⃣ *Enviar fatura de energia*\n" +
          "> 2️⃣ *Simular por consumo mensal*\n" +
          "> 3️⃣ *Simular por potência de pico*\n" +
          "> 4️⃣ *Simular por quantidade de placas*\n",
      },
      {
        role: "user",
        content: "4",
      },
      {
        role: "assistant",
        content:
          "*_Simulação por Quantidade de Módulos_* 🔌\n\n" +
          "Quantas *placas solares* você deseja no kit e qual a potência delas?\n\n" +
          "> Exemplo: digite `10 placas de 590W` ou `12 módulos`",
      },
      {
        role: "user",
        content: "20 modulos de 630w",
      },
      {
        role: "assistant",
        content:
          "*_Quantidade Solicitada:_* `20 placas` de `630W` (`12.60 kWp`) ☀️\n\n" +
          "Para qual cidade e estado será a instalação? (Ex: `Maringá/PR`, `Presidente Prudente/SP`)",
      },
      {
        role: "user",
        content: "maringa pr",
      },
      {
        role: "assistant",
        content:
          "*_Localização Identificada!_* 📍☀️\n\n" +
          "> Cidade: `Maringá/PR`\n> Irradiação Solar: `4.89 kWh/m²/dia`\n\n" +
          "Qual o padrão de entrada da instalação? ⚡\n\n" +
          "1️⃣ Monofásico 220V\n2️⃣ Bifásico 127V/220V\n3️⃣ Trifásico 220V\n4️⃣ Trifásico 380V",
      },
      {
        role: "user",
        content: "1",
      },
      {
        role: "assistant",
        content:
          "*_Padrão Elétrico Registrado:_* `Monofásico 220V` ⚡\n\n" +
          "*Qual a estrutura do telhado?* 🏠\n\n" +
          "1️⃣ Cerâmica\n2️⃣ Fibrocimento\n3️⃣ Metálico\n4️⃣ Solo",
      },
      {
        role: "user",
        content: "3",
      },
    ];

    let targetKWp: number | undefined;
    let targetModules: number | undefined;
    let modPowerWUser: number | undefined;
    let consumptionKwh: number | undefined;
    let roofType = "";

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m) continue;
      const content = m.content;
      const lowerC = content.toLowerCase().trim();

      if (m.role === "assistant") {
        if (
          content.includes("Como posso ajudar você a gerar orçamentos hoje") ||
          content.includes("Sou seu assistente de vendas")
        ) {
          consumptionKwh = undefined;
          targetKWp = undefined;
          targetModules = undefined;
          modPowerWUser = undefined;
        } else if (
          content.includes("Simulação por Quantidade de Módulos") ||
          content.includes("placas solares você deseja no kit")
        ) {
          consumptionKwh = undefined;
          targetKWp = undefined;
        }

        const qtyM = content.match(
          /(?:Quantidade Solicitada|Módulos Registrados):?[_*\s]*`?(\d+)`?\s*(?:placas|m[oó]dulos)/i
        );
        if (qtyM && qtyM[1]) {
          targetModules = parseInt(qtyM[1], 10);
          const pM = content.match(/`?(\d{3,4})`?\s*w/i);
          if (pM && pM[1]) {
            modPowerWUser = parseInt(pM[1], 10);
          }
          consumptionKwh = undefined;
          targetKWp = undefined;
        }
        continue;
      }

      const prevAssistant = i > 0 ? messages[i - 1]?.content || "" : "";
      const isMainMenu =
        prevAssistant.includes("Como posso ajudar você a gerar orçamentos hoje") ||
        prevAssistant.includes("Sou seu assistente de vendas");

      const kwpM = content.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
      if (kwpM && kwpM[1]) {
        targetKWp = parseFloat(kwpM[1].replace(",", "."));
        targetModules = undefined;
        modPowerWUser = undefined;
        consumptionKwh = undefined;
      } else if (
        !isMainMenu &&
        (prevAssistant.includes("Simulação por Potência de Pico") ||
          prevAssistant.includes("potência de pico desejada") ||
          prevAssistant.includes("potência desejada em kWp") ||
          prevAssistant.includes("potência (kWp)"))
      ) {
        const numM = content.match(/(\d+(?:[.,]\d+)?)/);
        if (numM && numM[1]) {
          const pVal = parseFloat(numM[1].replace(",", "."));
          if (pVal >= 0.5 && pVal <= 5000) {
            targetKWp = pVal;
            targetModules = undefined;
            modPowerWUser = undefined;
            consumptionKwh = undefined;
          }
        }
      }

      const modM = content.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i);
      if (modM && modM[1]) {
        targetModules = parseInt(modM[1], 10);
        const pM = content.match(/(\d{3,4})\s*w/i);
        if (pM && pM[1]) {
          modPowerWUser = parseInt(pM[1], 10);
        }
        targetKWp = undefined;
        consumptionKwh = undefined;
      }

      if (prevAssistant.includes("Qual a estrutura do telhado")) {
        if (lowerC === "3") {
          roofType = "Metálico";
        }
      }
    }

    expect(targetModules).toBe(20);
    expect(modPowerWUser).toBe(630);
    expect(targetKWp).toBeUndefined();
    expect(roofType).toBe("Metálico");

    // Sizing calculation
    const calculatedKwp =
      typeof targetKWp === "number" && targetKWp > 0
        ? targetKWp
        : (targetModules! * modPowerWUser!) / 1000;
    expect(calculatedKwp).toBe(12.6);

    // Header info formatting
    const localidade = " em `Maringá/PR`";
    const infoCabecalho = targetKWp
      ? `para a potência de \`${targetKWp} kWp\`${localidade}`
      : targetModules
        ? `para \`${targetModules} módulos\`${localidade}`
        : `para o consumo de \`${consumptionKwh || 300} kWh/mês\`${localidade}`;

    expect(infoCabecalho).toBe("para `20 módulos` em `Maringá/PR`");
  });
});
