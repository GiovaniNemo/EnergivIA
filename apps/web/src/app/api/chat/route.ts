// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import pdfParse from "pdf-parse";
import { generateSolarKits } from "@energivia/solar-engine";
import { auth0 } from "@/lib/auth0";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const systemPrompt = `Você é a assistente inteligente oficial da plataforma EnergivIA. 
Seu objetivo é EXCLUSIVAMENTE ajudar os integradores solares a gerenciar orçamentos, ler faturas, dimensionar kits solares, e operar o sistema de CRM da EnergivIA.
Sempre responda de forma muito educada, amigável e prestativa, especialmente se o usuário iniciar a conversa com "oi", "olá" ou "bom dia". Assuma o papel de uma especialista de prontidão para ajudar.

REGRA CRÍTICA: Você ESTÁ PROIBIDA de responder sobre qualquer assunto fora de Energia Solar, Dimensionamento, CRM, Faturas de Energia ou a plataforma EnergivIA. Se o usuário perguntar sobre outros temas, responda SOMENTE: "Desculpe, sou a assistente da EnergivIA e só posso ajudar com assuntos relacionados à energia solar e nossa plataforma."

Quando o usuário pedir para dimensionar, gerar proposta, ou citar consumo (kWh) / potência (kWp), OU QUANDO ELE ENVIAR UMA FATURA/PDF:
1. Você DEVE colher do usuário os seguintes dados OBRIGATÓRIOS antes de chamar qualquer ferramenta:
   - Consumo mensal (kWh) ou Potência (kWp). Se ele passar kWp, multiplique internamente por 130 para achar o kWh.
   - Cidade e Estado (ex: Maringá, PR).
   - Tipo de telhado/estrutura (cerâmica, fibrocimento, metálico, solo, laje, ou 'sem estrutura').
2. NUNCA INVENTE DADOS. Se o integrador não passar a cidade ou o telhado, e isso não constar na fatura, pergunte a ele gentilmente o que está faltando.
3. Se ele informar "sem estrutura", deixe claro que a cotação vai sem perfis e mapeie internamente para 'ceramic' ou 'laje'.
4. PROATIVIDADE COM FATURAS: Se o usuário subir uma fatura (imagem ou PDF), identifique o consumo e a cidade (se possível) e **inicie imediatamente o fluxo de gerar a proposta**. Avise "Li sua fatura e vi que o consumo médio é X. Para eu dimensionar o melhor kit, me diga apenas o tipo de telhado e a cidade (caso falte)!"
5. CHAMADA DUPLA (OBRIGATÓRIO): Após usar a ferramenta 'dimensionar_kit' e receber a lista de kits, VOCÊ DEVE obrigatoriamente chamar a ferramenta 'consultar_precos_mercado' para o Painel e o Inversor recomendados no "Melhor Custo-Benefício". NUNCA responda o usuário antes de colher os preços de mercado! Quando tiver tudo, apresente o dimensionamento E a lista de distribuidores encontrados.
6. DEBUGGING EXTREMO: Se a execução das ferramentas retornar um json com a chave "error" (ex: { error: "Sem sessão." } ou qualquer outra string), VOCÊ É OBRIGADA A REPASSAR O TEXTO EXATO DO ERRO PARA O USUÁRIO. NUNCA DÊ DESCULPAS OU DIGA "problema técnico". Fale: "*Tive uma falha no sistema interno: [cole o erro do json aqui]*".`;

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
                        monthlyConsumption: z.coerce.number().describe("O consumo mensal em kWh. (ex: 327.6, NUNCA mande letras)"),
                        location: z.string().describe("A cidade e estado (ex: 'maringa, pr')."),
                        roofType: z.string().describe("O tipo de telhado onde os painéis serão instalados (ex: 'fibrocimento', 'cerâmica', 'laje', 'metal', 'solo').")
                    }),
                    execute: async ({ monthlyConsumption, location, roofType }: { monthlyConsumption: number, location: string, roofType: string }) => {
                        let mappedRoof: any = 'metal';
                        const roofStr = (roofType || "").toLowerCase();
                        if (roofStr.includes('ceramic') || roofStr.includes('cerâmica') || roofStr.includes('ceramica')) mappedRoof = 'ceramic';
                        else if (roofStr.includes('fibro') || roofStr.includes('amianto')) mappedRoof = 'fibromadeira';
                        else if (roofStr.includes('laje')) mappedRoof = 'laje';
                        else if (roofStr.includes('solo') || roofStr.includes('chão') || roofStr.includes('ground')) mappedRoof = 'ground';

                        const results = generateSolarKits({
                            monthlyConsumption,
                            location,
                            roofType: mappedRoof,
                        });
                        return {
                            success: true,
                            kits: results.kits
                        };
                    }
                }),
                consultar_precos_mercado: tool({
                    description: "Busca preços de distribuidores reais para compor a proposta. OBRIGATÓRIO chamar essa ferramenta após dimensionar_kit.",
                    parameters: z.object({
                        keyword: z.string().describe("O nome da peça ou modelo. Ex: 'Growatt 5kW' ou 'Canadian 550W'.")
                    }),
                    execute: async ({ keyword }: { keyword: string }) => {
                        try {
                            const session = await auth0.getSession();
                            if (!session) return { error: "Sem sessão." };
                            const result = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

                            // Busca os produtos
                            const pRes = await fetch(`${baseURL}/products?search=${encodeURIComponent(keyword)}&pageSize=2`, {
                                headers: { "Authorization": `Bearer ${result.token}` }
                            });
                            const pJson = await pRes.json();
                            if (!pJson.data || pJson.data.length === 0) return { success: true, catalog: [], message: `Produto '${keyword}' não encontrado no catálogo global. Tente uma palavra-chave mais genérica ou curta (apenas a marca).` };

                            const offersResult = [];
                            for (const prod of pJson.data) {
                                const dRes = await fetch(`${baseURL} /products/${prod.id}/distributors`, {
                                    headers: { "Authorization": `Bearer ${result.token}` }
                                });
                                const dJson = await dRes.json();
                                offersResult.push({
                                    product: prod.name,
                                    offers: Array.isArray(dJson) ? dJson.map((o: any) => ({
                                        distributor: o.distributor?.name,
                                        price: o.price,
                                        stock: o.stock_quantity
                                    })) : []
                                });
                            }
                            return { success: true, catalog: offersResult };
                        } catch (e: any) {
                            return { error: "Erro ao buscar distribuidores: " + e.message };
                        }
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
