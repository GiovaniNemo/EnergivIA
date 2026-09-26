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
Retorne APENAS um objeto JSON com as chaves "detectedCategory" ('module', 'inverter' ou 'unknown') e "specs" com os parâmetros numéricos elétricos e mecânicos correspondentes.`;

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
            return {
              detectedCategory: parsed.detectedCategory || "unknown",
              specs: parsed.specs || {},
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
            return {
              detectedCategory: parsed.detectedCategory || "unknown",
              specs: parsed.specs || {},
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
