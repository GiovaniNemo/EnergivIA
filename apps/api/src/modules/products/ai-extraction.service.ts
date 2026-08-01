import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import pdfParse from "pdf-parse";

@Injectable()
export class AiExtractionService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GOOGLE_GEMINI_API_KEY") || "";
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async extractSpecsFromDatasheetUrl(datasheetUrl: string) {
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
        "Nenhum texto encontrado no PDF (pode ser um PDF com imagens apenas)."
      );
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
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
                  description: "Potência Nominal CA em Watts (W)",
                },
                max_dc_power: {
                  type: SchemaType.NUMBER,
                  description: "Potência Máxima CC Recomendada em Watts (W)",
                },
                max_dc_voltage: {
                  type: SchemaType.NUMBER,
                  description: "Tensão Máxima de Entrada CC (V)",
                },
                mppt_voltage_min: {
                  type: SchemaType.NUMBER,
                  description: "Tensão Mínima de MPPT (V)",
                },
                mppt_voltage_max: {
                  type: SchemaType.NUMBER,
                  description: "Tensão Máxima de MPPT (V)",
                },
                max_input_current: {
                  type: SchemaType.NUMBER,
                  description: "Corrente Máxima de Entrada CC por MPPT (A)",
                },
                max_short_circuit_current_a: {
                  type: SchemaType.NUMBER,
                  description: "Corrente Máxima de Curto-Circuito (A)",
                },
                mppt_count: {
                  type: SchemaType.NUMBER,
                  description: "Número de MPPTs (rastreadores)",
                },
                max_strings_per_mppt: {
                  type: SchemaType.NUMBER,
                  description: "Strings por MPPT",
                },
                recommended_dc_ac_ratio_min: {
                  type: SchemaType.NUMBER,
                  description: "Ratio DC/AC mín. recomendado",
                },
                recommended_dc_ac_ratio_max: {
                  type: SchemaType.NUMBER,
                  description: "Ratio DC/AC máx. recomendado",
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
        },
      },
    });

    const prompt = `Você é um engenheiro de sistemas fotovoltaicos. Leia o conteúdo do datasheet a seguir (texto extraído de um PDF) e extraia todas as especificações técnicas encontradas. Retorne APENAS o JSON de acordo com o Schema solicitado.
Texto do Datasheet:
${textContent}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const specs = JSON.parse(cleaned);
      return { specs };
    } catch (error) {
      console.error("Erro na extração com IA:", error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      throw new BadRequestException(`Falha ao extrair especificações com a IA: ${msg}`);
    }
  }
}
