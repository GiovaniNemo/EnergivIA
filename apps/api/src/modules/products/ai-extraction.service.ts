import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import pdfParse from "pdf-parse";

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>("GOOGLE_GEMINI_API_KEY") ||
      this.configService.get<string>("GEMINI_API_KEY") ||
      this.configService.get<string>("GOOGLE_GENERATIVE_AI_API_KEY") ||
      process.env["GOOGLE_GEMINI_API_KEY"] ||
      process.env["GEMINI_API_KEY"] ||
      "";
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async extractSpecsFromDatasheetUrl(datasheetUrl: string, productName?: string) {
    const urlWithoutQuery = (datasheetUrl.split("?")[0] ?? "").toLowerCase();
    if (!urlWithoutQuery.endsWith(".pdf")) {
      throw new BadRequestException("O arquivo fornecido não parece ser um PDF.");
    }

    let pdfBuffer: Buffer;
    try {
      const response = await fetch(datasheetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    } catch {
      throw new BadRequestException(
        "Não foi possível fazer o download do PDF do Datasheet para leitura."
      );
    }

    let textContent = "";
    try {
      const pdfData = await pdfParse(pdfBuffer);
      textContent = pdfData.text || "";
    } catch (parseErr) {
      this.logger.warn(
        `pdf-parse não conseguiu extrair texto do PDF (${
          parseErr instanceof Error ? parseErr.message : String(parseErr)
        }). O arquivo será processado visualmente pela IA multimodal.`
      );
      textContent = "";
    }

    const hasDigitalText = Boolean(textContent && textContent.trim().length > 30);
    // Gemini suporta inlineData de até 20MB
    const pdfBase64 = pdfBuffer.length <= 20 * 1024 * 1024 ? pdfBuffer.toString("base64") : null;

    if (!hasDigitalText && !pdfBase64) {
      throw new BadRequestException(
        "Nenhum texto encontrado no PDF e o arquivo excede o limite de tamanho para análise visual direta."
      );
    }

    const modelInstruction = productName
      ? `ATENÇÃO: Este documento/datasheet pode conter múltiplos modelos ou colunas comparativas. Extraia as especificações EXCLUSIVAMENTE para o modelo mais aderente a: "${productName}". Ignore os dados dos outros modelos.`
      : `Extraia as especificações técnicas gerais encontradas no datasheet.`;

    const prompt = `Você é um engenheiro sênior de sistemas fotovoltaicos. Analise com atenção o documento de datasheet fornecido (PDF com dados técnicos, tabelas elétricas e mecânicas).
${modelInstruction}
${
  hasDigitalText
    ? `Texto auxiliar extraído do documento:\n${textContent}\n`
    : "Nota: O PDF não possui camada de texto selecionável (é um documento escaneado/com imagens). Examine visualmente as tabelas, colunas de especificações e valores numéricos."
}
Retorne APENAS um objeto JSON com as chaves "detectedCategory" ('module', 'inverter' ou 'unknown') e "specs" com os parâmetros numéricos elétricos e mecânicos correspondentes.
Para Inversores, procure com máxima atenção:
- "nominal_power_w": Potência nominal de saída CA (Rated output power) em Watts (ex: 25000 para 25kW).
- "max_dc_power": Máxima potência fotovoltaica recomendada de entrada CC em Watts (ex: 32500 para 32.5kW).
- "recommended_dc_ac_ratio_max": Relação CC/CA (Ratio DC/AC / Overloading) máxima se informada explicitamente no documento (ex: 1.30 ou 1.50).
- "recommended_dc_ac_ratio_min": Relação CC/CA mínima recomendada se informada no documento.
- "mppt_count", "max_strings_per_mppt", "mppt_voltage_min", "mppt_voltage_max", "max_input_current", "max_short_circuit_current_a", "voltage_v", "phase", "efficiency", "warranty_years".`;

    const attemptErrors: string[] = [];

    // Consulta os modelos habilitados dinamicamente para esta chave de API
    const { models: dynamicallyAvailable, apiError: geminiDiscoveryError } =
      await this.getAvailableGeminiModels();

    if (geminiDiscoveryError) {
      attemptErrors.push(`[Google Generative Language API]: ${geminiDiscoveryError}`);
    }

    let candidateModels: string[] = [];

    if (dynamicallyAvailable.length > 0) {
      const preferred = [
        process.env["GEMINI_MULTIMODAL_MODEL"],
        process.env["GEMINI_MODEL"],
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-pro",
        "gemini-1.5-pro-001",
        "gemini-2.0-flash-exp",
      ].filter(Boolean) as string[];

      // Adiciona na ordem de preferência os modelos que realmente existem na chave
      for (const pref of preferred) {
        if (dynamicallyAvailable.includes(pref) && !candidateModels.includes(pref)) {
          candidateModels.push(pref);
        }
      }

      // Adiciona quaisquer outros modelos que suportem generateContent
      for (const avail of dynamicallyAvailable) {
        if (!candidateModels.includes(avail)) {
          candidateModels.push(avail);
        }
      }
    } else {
      // Fallback estático caso a descoberta de modelos falhe
      candidateModels = [
        process.env["GEMINI_MULTIMODAL_MODEL"],
        process.env["GEMINI_MODEL"],
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
      ].filter(Boolean) as string[];
    }

    // 1. Tenta extrair usando a lista de modelos Gemini (com suporte multimodal ao PDF)
    if (this.genAI && this.apiKey) {
      for (const modelCandidate of candidateModels) {
        try {
          this.logger.log(`Tentando extrair datasheet com modelo Gemini: ${modelCandidate}`);

          const model = this.genAI.getGenerativeModel({
            model: modelCandidate,
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
            },
          });

          // Monta o payload multimodal se houver base64 do PDF
          const contentParts: (string | Part)[] = [prompt];
          if (pdfBase64) {
            contentParts.push({
              inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf",
              },
            });
          }

          const result = await model.generateContent(contentParts);
          const text = result.response.text();
          const parsed = this.parseJsonSafely(text);

          if (parsed && typeof parsed === "object") {
            const detectedCategory = parsed.detectedCategory || "unknown";
            const sanitizedSpecs = this.sanitizeAndEnrichSpecs(
              detectedCategory,
              parsed.specs || {}
            );
            return {
              detectedCategory,
              specs: sanitizedSpecs,
            };
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          attemptErrors.push(`[${modelCandidate}]: ${errMsg}`);
          this.logger.warn(`Modelo ${modelCandidate} falhou: ${errMsg}`);
          // Continue to next model in cascade
        }
      }
    }

    // 2. Fallback para OpenAI (gpt-4o-mini / gpt-4o) caso Gemini falhe ou chave Google esteja inativa
    const openAiApiKey =
      this.configService.get<string>("OPENAI_API_KEY") || process.env["OPENAI_API_KEY"];

    if (openAiApiKey && hasDigitalText) {
      try {
        this.logger.log("Acionando fallback OpenAI (gpt-4o-mini) para extração do datasheet...");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0,
            messages: [
              {
                role: "system",
                content: `Você é um engenheiro sênior de sistemas fotovoltaicos. Analise o texto do datasheet e extraia as especificações técnicas em JSON com formato:
{
  "detectedCategory": "module" | "inverter" | "unknown",
  "specs": {
    "power_w": number,
    "warranty_years": number,
    "voc": number,
    "vmp": number,
    "isc": number,
    "imp": number,
    "max_system_voltage": number,
    "efficiency": number,
    "width_mm": number,
    "height_mm": number,
    "nominal_power_w": number,
    "max_dc_power": number,
    "max_dc_voltage": number,
    "mppt_voltage_min": number,
    "mppt_voltage_max": number,
    "max_input_current": number,
    "max_short_circuit_current_a": number,
    "mppt_count": number,
    "max_strings_per_mppt": number,
    "recommended_dc_ac_ratio_max": number,
    "recommended_dc_ac_ratio_min": number,
    "phase": "monophasic" | "biphasic" | "triphasic",
    "voltage_v": number
  }
}`,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            this.logger.log("Especificações extraídas com sucesso via OpenAI (gpt-4o-mini).");
            const detectedCategory = parsed.detectedCategory || "unknown";
            const sanitizedSpecs = this.sanitizeAndEnrichSpecs(
              detectedCategory,
              parsed.specs || {}
            );
            return {
              detectedCategory,
              specs: sanitizedSpecs,
            };
          }
        } else {
          const errText = await response.text();
          this.logger.warn(`OpenAI retornou erro HTTP ${response.status}: ${errText}`);
        }
      } catch (openAiErr) {
        this.logger.warn(
          `Falha ao tentar extração com OpenAI: ${
            openAiErr instanceof Error ? openAiErr.message : String(openAiErr)
          }`
        );
      }
    }

    this.logger.error(
      `Todos os provedores de IA falharam na extração do datasheet. Erros: ${attemptErrors.join(" | ")}`
    );
    const primaryError = attemptErrors[0] ?? "Nenhum modelo de IA conseguiu processar o documento.";
    throw new BadRequestException(`Falha ao extrair especificações com a IA: ${primaryError}`);
  }

  /**
   * Sanitiza e valida matematicamente as especificações do equipamento,
   * prevenindo alucinações da IA e calculando determinísticamente grandezas
   * elétricas como a Relação CC/CA (Ratio DC/AC).
   */
  private sanitizeAndEnrichSpecs(
    detectedCategory: string,
    rawSpecs: Record<string, unknown>
  ): Record<string, unknown> {
    const specs = { ...rawSpecs };

    // Tratamento e cálculo determinístico para Inversores
    if (detectedCategory === "inverter" || specs["nominal_power_w"] !== undefined) {
      let nominalPower =
        typeof specs["nominal_power_w"] === "number" ? specs["nominal_power_w"] : null;
      let maxDcPower = typeof specs["max_dc_power"] === "number" ? specs["max_dc_power"] : null;

      // 1. Normalização de unidades (kW para Watts se veio número menor que 300)
      if (nominalPower !== null && nominalPower > 0 && nominalPower < 300) {
        nominalPower = Math.round(nominalPower * 1000);
        specs["nominal_power_w"] = nominalPower;
      }
      if (maxDcPower !== null && maxDcPower > 0 && maxDcPower < 500) {
        maxDcPower = Math.round(maxDcPower * 1000);
        specs["max_dc_power"] = maxDcPower;
      }

      // 2. Extração e sanitização do Ratio Máximo com proteção anti-alucinação
      let ratioMax: number | null = null;
      const rawRatioMax = specs["recommended_dc_ac_ratio_max"];
      if (typeof rawRatioMax === "number" && !isNaN(rawRatioMax)) {
        // Normaliza se a IA tiver trazido em porcentagem (ex: 130 em vez de 1.30)
        const normalized = rawRatioMax > 10 ? rawRatioMax / 100 : rawRatioMax;
        // Limites físicos de engenharia: relação CC/CA de inversores comerciais fica entre 1.05 e 1.70
        if (normalized >= 1.05 && normalized <= 1.7) {
          ratioMax = Number(normalized.toFixed(2));
        } else {
          this.logger.warn(
            `Ratio máximo da IA (${rawRatioMax}) descartado por violar os limites físicos fotovoltaicos.`
          );
        }
      }

      // 3. Cálculo matemático determinístico se não veio ratio explícito ou foi descartado:
      // Ratio Máximo = Potência CC Máxima / Potência CA Nominal
      if (ratioMax === null && maxDcPower && nominalPower && nominalPower > 0) {
        const calculated = Number((maxDcPower / nominalPower).toFixed(2));
        if (calculated >= 1.05 && calculated <= 1.7) {
          ratioMax = calculated;
          this.logger.log(
            `Ratio CC/CA máximo calculado matematicamente: ${maxDcPower}W / ${nominalPower}W = ${ratioMax}`
          );
        }
      }

      // 4. Se o datasheet não especifica max_dc_power, aplica o padrão seguro do mercado (1.30)
      if (ratioMax === null) {
        ratioMax = 1.3;
      }

      // 5. Sanitização do Ratio Mínimo
      let ratioMin: number | null = null;
      const rawRatioMin = specs["recommended_dc_ac_ratio_min"];
      if (typeof rawRatioMin === "number" && !isNaN(rawRatioMin)) {
        const normalized = rawRatioMin > 10 ? rawRatioMin / 100 : rawRatioMin;
        if (normalized >= 1.0 && normalized < ratioMax) {
          ratioMin = Number(normalized.toFixed(2));
        }
      }

      // Padrão de engenharia: 1.05 (mínimo de sobrecarregamento para evitar ociosidade do inversor)
      if (ratioMin === null) {
        ratioMin = 1.05;
      }

      // Garantir coerência relacional estrita: ratioMin <= ratioMax
      if (ratioMin > ratioMax) {
        ratioMin = Number(Math.max(1.0, ratioMax - 0.2).toFixed(2));
      }

      specs["recommended_dc_ac_ratio_max"] = ratioMax;
      specs["recommended_dc_ac_ratio_min"] = ratioMin;
    }

    return specs;
  }

  private parseJsonSafely(rawText: string): {
    detectedCategory?: string;
    specs?: Record<string, unknown>;
  } {
    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned) as {
        detectedCategory?: string;
        specs?: Record<string, unknown>;
      };
    } catch {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSub) as {
          detectedCategory?: string;
          specs?: Record<string, unknown>;
        };
      }
      throw new Error("Não foi possível interpretar a resposta da IA como JSON.");
    }
  }

  private async getAvailableGeminiModels(): Promise<{
    models: string[];
    apiError?: string;
  }> {
    if (!this.apiKey) {
      return { models: [], apiError: "Chave de API do Gemini não configurada no servidor." };
    }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          error?: { message?: string; status?: string };
        } | null;
        const msg = errorData?.error?.message || `Status HTTP ${res.status}: ${res.statusText}`;
        this.logger.warn(`Google AI Studio / Generative Language API retornou erro: ${msg}`);
        return { models: [], apiError: msg };
      }
      const data = (await res.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      const models = (data.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      this.logger.log(`Modelos disponíveis para esta chave Gemini: ${models.join(", ")}`);
      return { models };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Erro de conexão ao consultar modelos do Gemini: ${msg}`);
      return { models: [], apiError: msg };
    }
  }
}
