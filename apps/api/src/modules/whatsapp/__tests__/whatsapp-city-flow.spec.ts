import { describe, it, expect } from "vitest";
import {
  getHsp,
  isLocationInput,
  parseLocationString,
  cleanLocationInput,
  normalizeTextSimple,
} from "../services/geo-irradiance.service";

describe("WhatsApp Bot - City and Location Flow Suite", () => {
  describe("Location String Sanitization & Parsing", () => {
    it("should clean invisible formatting and normalize text", () => {
      expect(cleanLocationInput("\u200EMaringá/PR\u200E")).toBe("Maringá/PR");
      expect(normalizeTextSimple("Maringá")).toBe("MARINGA");
    });
    it("should recognize Maringá/PR even with WhatsApp invisible LTR characters", () => {
      const input = "\u200EMaringá/PR\u200E";
      expect(isLocationInput(input)).toBe(true);
      const res = getHsp(input);
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });

    it("should recognize Maringá/PR with trailing period from mobile double-space", () => {
      const input = "Maringá/PR.";
      expect(isLocationInput(input)).toBe(true);
      const res = getHsp(input);
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });

    it("should recognize variations of separators: hyphen, space, comma, slash", () => {
      const variations = [
        "Maringá/PR",
        "Maringá / PR",
        "Maringá - PR",
        "Maringá, PR",
        "Maringá PR",
        "maringa/pr",
        "Maringa - PR",
        "Cuiabá/MT",
        "Presidente Prudente/SP",
        "Presidente Prudente - SP",
      ];

      for (const v of variations) {
        expect(isLocationInput(v)).toBe(true);
        const hsp = getHsp(v);
        expect(hsp.exact).toBe(true);
        expect(hsp.hsp).toBeGreaterThan(4.0);
      }
    });

    it("should recognize city with full state name", () => {
      expect(parseLocationString("Maringá - Paraná")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Maringá/Paraná")).toEqual({ city: "Maringá", uf: "PR" });
      expect(isLocationInput("Maringá - Paraná")).toBe(true);
      const res = getHsp("Maringá - Paraná");
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });

    it("should recognize city without UF when city is unique or known in database", () => {
      expect(isLocationInput("Maringá")).toBe(true);
      const res = getHsp("Maringá");
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });
  });

  describe("Context extraction regexes from bot messages", () => {
    it("should correctly extract consumption from formatted bot messages (*_Consumo Registrado:_*)", () => {
      const botMsg =
        "*_Consumo Registrado:_* `400 kWh/mês` ☀️\n\nPara qual cidade e estado será a instalação? (Ex: `Maringá/PR`, `Presidente Prudente/SP`)";
      const consM = botMsg.match(
        /(?:Consumo Registrado|Consumo m[ée]dio(?: de)?):?[_*\s]*`?(\d+[\d.,]*)`?\s*kWh/i
      );
      expect(consM).not.toBeNull();
      expect(consM![1]).toBe("400");
    });

    it("should correctly extract power from formatted bot messages (*_Potência Registrada:_*)", () => {
      const botMsg =
        "*_Potência Registrada:_* `5.2 kWp` ☀️\n\nPara qual cidade e estado será a instalação?";
      const potM = botMsg.match(
        /(?:Potência Solicitada|Potência Registrada):?[_*\s]*`?([\d.,]+)`?\s*kWp/i
      );
      expect(potM).not.toBeNull();
      expect(potM![1]).toBe("5.2");
    });

    it("should correctly extract modules from formatted bot messages (*_Módulos Registrados:_*)", () => {
      const botMsg =
        "*_Módulos Registrados:_* `12 placas` (590W) ☀️\n\nPara qual cidade e estado será a instalação?";
      const qtyM = botMsg.match(
        /(?:Quantidade Solicitada|Módulos Registrados):?[_*\s]*`?(\d+)`?\s*(?:placas|m[oó]dulos)/i
      );
      expect(qtyM).not.toBeNull();
      expect(qtyM![1]).toBe("12");
    });

    it("should correctly extract location from formatted bot messages", () => {
      const botMsg1 =
        "*_Localização Identificada!_* 📍☀️\n\n> Cidade: `Maringá/PR`\n> Irradiação Solar: `4.89 kWh/m²/dia`";
      const locM1 =
        botMsg1.match(
          /(?:Localização Identificada|Localização Corrigida|Localização Mantida|Cidade):?[_*\s!]*`?\*?([^*\/`\n]+)\/([A-Za-z]{2})\*?`?/i
        ) ||
        botMsg1.match(/(?:em|para)\s+`?\*?([^*\/`\n]{3,40})\/([A-Za-z]{2})\*?`?\s*(?:☀️|📍|\n|$)/i);
      expect(locM1).not.toBeNull();
      expect(locM1![1]?.trim()).toBe("Maringá");
      expect(locM1![2]?.trim()).toBe("PR");

      const botMsg2 = "*_Consumo Registrado:_* `400 kWh/mês` em `Maringá/PR` ☀️📍\n\n";
      const locM2 =
        botMsg2.match(
          /(?:Localização Identificada|Localização Corrigida|Localização Mantida|Cidade):?[_*\s!]*`?\*?([^*\/`\n]+)\/([A-Za-z]{2})\*?`?/i
        ) ||
        botMsg2.match(/(?:em|para)\s+`?\*?([^*\/`\n]{3,40})\/([A-Za-z]{2})\*?`?\s*(?:☀️|📍|\n|$)/i);
      expect(locM2).not.toBeNull();
      expect(locM2![1]?.trim()).toBe("Maringá");
      expect(locM2![2]?.trim()).toBe("PR");
    });
  });

  describe("State continuity after unrecognized city message", () => {
    it("should keep city state active when last bot message is error prompt", () => {
      const errorMsg =
        'Não identifiquei o município "*Maringá/PR*". 📍\n\nPor favor, informe a cidade e a sigla do estado onde será a instalação:\n> Exemplo: `Cuiabá/MT`, `Maringá/PR` ou `São Paulo/SP`\n\n_(Ou envie 0️⃣ para voltar ao menu inicial)_';

      const isAskingCity =
        errorMsg.includes("Para qual cidade e estado será a instalação") ||
        errorMsg.includes("Vamos alterar a localização") ||
        errorMsg.includes("Vamos corrigir a localização") ||
        errorMsg.includes("Não identifiquei o município") ||
        errorMsg.includes("Não identifiquei a cidade") ||
        errorMsg.includes("informe a cidade e a sigla do estado") ||
        errorMsg.includes("informe a cidade e estado") ||
        errorMsg.includes("cidade e a sigla do estado onde será a instalação") ||
        errorMsg.includes("cidade e estado da instalação solar");

      expect(isAskingCity).toBe(true);
    });
  });
});
