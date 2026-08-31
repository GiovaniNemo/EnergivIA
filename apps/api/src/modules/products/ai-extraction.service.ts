import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import pdfParse from "pdf-parse";

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>("GOOGLE_GEMINI_API_KEY") ||
      this.configService.get<string>("GEMINI_API_KEY") ||
      this.configService.get<string>("GOOGLE_GENERATIVE_AI_API_KEY") ||
      process.env["GOOGLE_GEMINI_API_KEY"] ||
      process.env["GEMINI_API_KEY"] ||
      "";
    this.genAI = new GoogleGenerativeAI(apiKey);
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
      textContent = pdfData.text;
    } catch {
      throw new BadRequestException(
        "Falha ao extrair texto do PDF. O arquivo pode estar corrompido ou protegido."
      );
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new BadRequestException(
        "Nenhum texto encontrado no PDF (pode ser um PDF escaneado/com imagens apenas)."
      );
    }

    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        detectedCategory: {
          type: SchemaType.STRING,
          description: "Deve ser 'module' (para Painel Solar) ou 'inverter' (para Inversor)",
          enum: ["module", "inverter", "unknown"],
          format: "enum",
        },
        specs: {
          type: SchemaType.OBJECT,
          description:
            "Preencha APENAS as propriedades correspondentes à categoria detectada. Deixe as outras nulas ou omitidas.",
          properties: {
            // Especificações do Módulo
            power_w: {
              type: SchemaType.NUMBER,
              description: "Potência Nominal Pmax em Watts (W)",
            },
            warranty_years: {
              type: SchemaType.NUMBER,
              description:
                "Tempo de garantia de fábrica do equipamento (módulo ou inversor) em anos (ex: 25, 30 para módulos; 5, 10, 15 para inversores). Extraia apenas o número de anos.",
            },
            voc: {
              type: SchemaType.NUMBER,
              description: "Tensão de Circuito Aberto Voc em Volts (V)",
            },
            vmp: {
              type: SchemaType.NUMBER,
              description: "Tensão de Máxima Potência Vmp em Volts (V)",
            },
            isc: {
              type: SchemaType.NUMBER,
              description: "Corrente de Curto-Circuito Isc em Amperes (A)",
            },
            imp: {
              type: SchemaType.NUMBER,
              description: "Corrente de Máxima Potência Imp em Amperes (A)",
            },
            max_system_voltage: {
              type: SchemaType.NUMBER,
              description: "Tensão Máxima do Sistema em Volts (ex: 1000 ou 1500)",
            },
            efficiency: {
              type: SchemaType.NUMBER,
              description: "Eficiência do módulo em porcentagem (%)",
            },
            width_mm: { type: SchemaType.NUMBER, description: "Largura do módulo em mm" },
            height_mm: { type: SchemaType.NUMBER, description: "Altura do módulo em mm" },
            temperature_coefficient_pmax: {
              type: SchemaType.NUMBER,
              description: "Coeficiente de Temperatura de Pmax (%/°C)",
            },
            temperature_coefficient_voc: {
              type: SchemaType.NUMBER,
              description: "Coeficiente de Temperatura de Voc (%/°C)",
            },
            // Especificações do Inversor
            nominal_power_w: {
              type: SchemaType.NUMBER,
              description:
                "Potência Nominal CA em Watts (W). Geralmente listada como 'Nominal AC Power', 'Potência de saída nominal', 'Rated output power'.",
            },
            max_dc_power: {
              type: SchemaType.NUMBER,
              description:
                "Potência Máxima CC Recomendada em Watts (W). Geralmente listada como 'Max. PV Power', 'Potência máxima do gerador', 'Max. recommended PV power'.",
            },
            max_dc_voltage: {
              type: SchemaType.NUMBER,
              description:
                "Tensão Máxima de Entrada CC (V). Geralmente descrita como 'Max. input voltage', 'Tensão máxima de entrada'.",
            },
            mppt_voltage_min: {
              type: SchemaType.NUMBER,
              description:
                "Tensão Mínima de MPPT (V). Geralmente é o valor mínimo da faixa de tensão MPPT (MPPT range) ou tensão de partida (startup voltage).",
            },
            mppt_voltage_max: {
              type: SchemaType.NUMBER,
              description:
                "Tensão Máxima de MPPT (V). Geralmente é o valor máximo da faixa de tensão MPPT (MPPT range). Por exemplo, em 180V-1000V, o máximo é 1000.",
            },
            max_input_current: {
              type: SchemaType.NUMBER,
              description:
                "Corrente Máxima de Entrada CC por MPPT (A). Geralmente descrita como 'Max. input current per MPPT', 'Corrente máxima de entrada', 'Max. input current (A/B)'. Extraia apenas o número (ex: se for 32A/32A, retorne 32).",
            },
            max_short_circuit_current_a: {
              type: SchemaType.NUMBER,
              description:
                "Corrente Máxima de Curto-Circuito por MPPT (A). Geralmente descrita como 'Max. short-circuit current', 'Isc do inversor'. Extraia apenas o número.",
            },
            mppt_count: {
              type: SchemaType.NUMBER,
              description:
                "Número de MPPTs (rastreadores/trackers). Procure por 'Number of MPPTs', 'MPPT trackers', 'Número de MPPT'.",
            },
            max_strings_per_mppt: {
              type: SchemaType.NUMBER,
              description:
                "Número máximo de strings (entradas/inputs/conexões) por MPPT. Geralmente está no datasheet como 'Number of inputs per MPPT', 'Entradas por MPPT', 'Strings por MPPT'. Se disser '1/1' ou '1/2', retorne a maior quantidade de entradas por MPPT (ex: 2 ou 1).",
            },
            recommended_dc_ac_ratio_min: {
              type: SchemaType.NUMBER,
              description:
                "Ratio/Relação DC/AC mínima recomendada (normalmente entre 1.0 e 1.2). Se não encontrada, deixe omitida.",
            },
            recommended_dc_ac_ratio_max: {
              type: SchemaType.NUMBER,
              description:
                "Ratio/Relação DC/AC máxima recomendada (normalmente entre 1.3 e 1.6). Se não encontrada, deixe omitida.",
            },
            phase: {
              type: SchemaType.STRING,
              description: "'monophasic', 'biphasic' ou 'triphasic'",
              enum: ["monophasic", "biphasic", "triphasic"],
              format: "enum",
            },
            voltage_v: {
              type: SchemaType.NUMBER,
              description: "Tensão de Saída CA Nominal (ex: 220, 380)",
            },
          },
        },
      },
      required: ["detectedCategory", "specs"],
    };

    const modelInstruction = productName
      ? `ATENÇÃO: Este PDF contém vários modelos. Extraia as especificações EXCLUSIVAMENTE para o modelo: "${productName}". Ignore os dados de outros modelos.`
      : `Extraia as especificações técnicas gerais encontradas no datasheet.`;

    const prompt = `Você é um engenheiro de sistemas fotovoltaicos. Leia o conteúdo do datasheet a seguir (texto extraído de um PDF).
${modelInstruction}
Retorne APENAS um objeto JSON com as chaves "detectedCategory" ('module', 'inverter' ou 'unknown') e "specs" com os parâmetros numéricos elétricos e mecânicos.
Texto do Datasheet:
${textContent}`;

    // Candidate models to try in order of preference
    const candidateModels = [
      process.env["GEMINI_TEXT_MODEL"],
      "gemini-2.0-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-pro-latest",
      "gemini-1.5-pro",
      "gemini-pro",
    ].filter(Boolean) as string[];

    let lastError: unknown = null;

    for (const modelCandidate of candidateModels) {
      try {
        this.logger.log(`Tentando extrair datasheet com modelo Gemini: ${modelCandidate}`);
        const model = this.genAI.getGenerativeModel({
          model: modelCandidate,
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: modelCandidate.includes("1.5") || modelCandidate.includes("2.0") ? responseSchema : undefined,
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(cleaned);

        return {
          detectedCategory: parsed.detectedCategory,
          specs: parsed.specs || {},
        };
      } catch (err: unknown) {
        lastError = err;
        this.logger.warn(`Modelo ${modelCandidate} falhou ou não encontrado: ${err instanceof Error ? err.message : String(err)}`);
        // Continue to next model in cascade
      }
    }

    this.logger.error("Todos os modelos Gemini falharam na extração:", lastError);
    const msg = lastError instanceof Error ? lastError.message : "Erro desconhecido";
    throw new BadRequestException(`Falha ao extrair especificações com a IA: ${msg}`);
  }
}

