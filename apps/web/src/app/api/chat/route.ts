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
4. PROATIVIDADE COM FATURAS: Se o usuário subir uma fatura (imagem ou PDF), identifique o consumo e a cidade (se possível) e **inicie imediatamente o fluxo de gerar a cotação**. Avise "Li sua fatura e vi que o consumo médio é X. Para eu gerar a cotação real, me diga apenas o tipo de telhado e a cidade (caso falte)!"
5. MONTAGEM OBRIGATÓRIA DA COTAÇÃO: Você agora VAI USAR a ferramenta 'gerar_cotacao_distribuidor' sempre que o usuário pedir dimensionamento/cotação (informou kwp ou kwh). NUNCA dê preços "chutados". OBRIGATORIAMENTE gere a cotação utilizando o seu banco de distribuidores através da ferramenta!
6. DEBUGGING EXTREMO: Se a execução da ferramenta retornar um json com a chave "error" (ex: { error: "Sem sessão." } ou qualquer outra string), VOCÊ É OBRIGADA A REPASSAR O TEXTO EXATO DO ERRO PARA O USUÁRIO na íntegra. Fale: "*Tive uma falha no sistema interno: [cole o erro do json aqui]*".`;

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
                gerar_cotacao_distribuidor: tool({
                    description: "Usa o motor de cálculo da EnergivIA para descobrir os componentes físicos e puxar orçamentos REAIS cruzando todos os distribuidores ativos (Edeltec, etc) para a potência solicitada.",
                    parameters: z.object({
                        monthlyConsumption: z.coerce.number().describe("Consumo mensal (kWh)"),
                        location: z.string().describe("Cidade e Estado"),
                        roofType: z.string().describe("Tipo de telhado"),
                        includeStructure: z.boolean().describe("True se precisar de estrutura, False se for opcional/sem telhado averbado.")
                    }),
                    execute: async ({ monthlyConsumption, location, roofType, includeStructure }: any) => {
                        try {
                            const session = await auth0.getSession();
                            if (!session) return { error: "Sem sessão do admin." };
                            const result = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

                            let mappedRoof: any = 'metal';
                            const roofStr = (roofType || "").toLowerCase();
                            if (roofStr.includes('ceramic') || roofStr.includes('cerâmica')) mappedRoof = 'ceramic';
                            else if (roofStr.includes('fibro')) mappedRoof = 'fibromadeira';
                            else if (roofStr.includes('laje')) mappedRoof = 'laje';
                            else if (roofStr.includes('solo') || roofStr.includes('ground')) mappedRoof = 'ground';

                            const mathResults = generateSolarKits({ monthlyConsumption, location, roofType: mappedRoof });
                            const target = mathResults.kits[0]; // Usamos o Custo-Benefício como guia matemático
                            if (!target) return { error: "Erro simulando math results." };
                            const targetKWp = parseFloat(target.systemSize.replace('kWp', ''));

                            const distRes = await fetch(`${baseURL}/distributors`, {
                                headers: { "Authorization": `Bearer ${result.token}` }
                            });
                            const distList = await distRes.json();
                            if (!distList || distList.length === 0) return { error: "Nenhum distribuidor ativo no banco." };

                            const finalQuotes = [];

                            for (const d of distList) {
                                const resProds = await fetch(`${baseURL}/distributors/${d.id}/products?limit=250`, {
                                    headers: { "Authorization": `Bearer ${result.token}` }
                                });
                                const jsonProds = await resProds.json();
                                const allProds = jsonProds.data || [];

                                if (allProds.length === 0) continue;

                                const invs = allProds.filter(p => JSON.stringify(p).toLowerCase().includes('inversor'));
                                const mods = allProds.filter(p => JSON.stringify(p).toLowerCase().includes('módulo') || JSON.stringify(p).toLowerCase().includes('modulo') || JSON.stringify(p).toLowerCase().includes('painel'));
                                const cabs = allProds.filter(p => JSON.stringify(p).toLowerCase().includes('cabo'));
                                const cons = allProds.filter(p => JSON.stringify(p).toLowerCase().includes('conector'));
                                const ests = allProds.filter(p => JSON.stringify(p).toLowerCase().includes('estrutura') || JSON.stringify(p).toLowerCase().includes('perfil'));

                                const inv = invs[0];
                                const mod = mods[0];
                                const cab = cabs[0];
                                const con = cons[0];
                                const est = ests[0];

                                if (!inv || !mod) continue;

                                const moduleQ = target.modules || Math.ceil((targetKWp * 1000) / 550);

                                const precoInv = inv.price;
                                const precoMod = mod.price * moduleQ;
                                const precoCab = cab ? cab.price : 0;
                                const precoCon = con ? con.price * 2 : 0;
                                const precoEst = (includeStructure && est) ? est.price : 0;

                                finalQuotes.push({
                                    distribuidora: d.name,
                                    potenciaFinal: target.systemSize,
                                    itens: [
                                        `1x Inversor: ${inv.product.name} (R$ ${precoInv})`,
                                        `${moduleQ}x Módulo: ${mod.product.name} (R$ ${precoMod})`,
                                        cab ? `1x Cabo: ${cab.product.name} (R$ ${precoCab})` : null,
                                        con ? `2x Conector: ${con.product.name} (R$ ${precoCon})` : null,
                                        (includeStructure && est) ? `1x Estrutura: ${est.product.name} (R$ ${precoEst})` : null,
                                    ].filter(Boolean),
                                    totalReal: precoInv + precoMod + precoCab + precoCon + precoEst
                                });
                            }

                            return {
                                success: true,
                                matematicaGuia: {
                                    geracaoEstimada: target.estimatedGeneration,
                                    tamanhoRecomendado: target.systemSize
                                },
                                ofertasDistribuidores: finalQuotes.length > 0 ? finalQuotes : "Nenhum distribuidor tinha módulos e inversores em estoque suficientes para formar um kit."
                            };
                        } catch (e: any) {
                            return { error: "Erro fatal montando cotação: " + e.message };
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
