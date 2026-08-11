// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import pdfParse from "pdf-parse";
import { generateSolarKits } from "@energivia/solar-engine";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const systemPrompt = `Você é a assistente inteligente oficial da plataforma EnergivIA. 
Seu objetivo é EXCLUSIVAMENTE ajudar os integradores solares a gerenciar orçamentos, ler faturas, dimensionar kits solares, e operar o sistema de CRM da EnergivIA.
REGRA CRÍTICA: Você ESTÁ PROIBIDA de responder sobre qualquer assunto fora de Energia Solar, Dimensionamento, CRM, Faturas de Energia ou a plataforma EnergivIA. Se o usuário perguntar sobre outros temas, responda SOMENTE: "Desculpe, sou a assistente da EnergivIA e só posso ajudar com assuntos relacionados à energia solar e nossa plataforma."
Sempre seja objetiva nas suas respostas, pareça uma especialista sênior.

Quando o usuário pedir para dimensionar ou citar consumo (kWh) / potência (kWp), você DEVE sempre usar a ferramenta 'dimensionar_kit'.
- Se ele não passar a cidade/estado, assuma "sao paulo, sp" ou a localidade da fatura.
- Se ele não passar tipo de telhado, assuma 'metal'.
- Se ele passar potência (kWp) em vez de consumo, calcule o consumo aproximado multiplicando o kWp por 130 e use na ferramenta.`;

        const formattedMessages = await Promise.all(
            messages.map(async (m: any) => {
                if (m.imageUrl) {
                    if (m.imageUrl.startsWith("data:application/pdf")) {
                        const base64Data = m.imageUrl.split(',')[1];
                        const buffer = Buffer.from(base64Data, "base64");
                        let pdfText = "Fatura/PDF Extraído:\n";
                        try {
                            const data = await pdfParse(buffer);
                            pdfText += data.text;
                        } catch (e) {
                            pdfText += "(Falha ao extrair PDF)";
                        }
                        return { role: m.role, content: `${m.content || "Anexo:"}\n\n${pdfText}` };
                    }

                    return {
                        role: m.role,
                        content: [
                            { type: "text", text: m.content || "Imagem anexa:" },
                            { type: "image_url", image_url: { url: m.imageUrl } }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            })
        );

        const result = await streamText({
            model: openai("gpt-4o"),
            system: systemPrompt,
            messages: formattedMessages,
            stopWhen: stepCountIs(5),
            tools: {
                dimensionar_kit: tool({
                    description: "Dimensiona um kit solar com base no consumo mensal (kWh) e localidade para retornar as opções mais recomendadas do Catálogo.",
                    parameters: z.object({
                        monthlyConsumption: z.number().describe("O consumo mensal em kWh da fatura ou pedido do cliente. Se o cliente passou kWp, multiplique por 130."),
                        location: z.string().describe("A cidade e estado (ex: 'maringa, pr')."),
                        roofType: z.enum(['ceramic', 'metal', 'fibromadeira', 'fibrometal', 'ground', 'laje']).describe("O tipo de telhado onde os painéis serão instalados.")
                    }),
                    execute: async ({ monthlyConsumption, location, roofType }: { monthlyConsumption: number, location: string, roofType: 'ceramic' | 'metal' | 'fibromadeira' | 'fibrometal' | 'ground' | 'laje' }) => {
                        const results = generateSolarKits({
                            monthlyConsumption,
                            location,
                            roofType,
                        });
                        return {
                            success: true,
                            kits: results.kits
                        };
                    }
                })
            }
        });

        return new Response(result.textStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error: any) {
        console.error('Erro na API de Chat:', error);
        return new Response(JSON.stringify({ error: error?.message || 'Falha na comunicação com a IA' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
