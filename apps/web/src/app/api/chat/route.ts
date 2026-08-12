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
Seu objetivo é guiar o usuário (integrador solar) através de um fluxo rígido passo-a-passo. Como o fluxo será espelhado no WhatsApp futuramente, **comunique-se primariamente de forma curta, objetiva e formatada**.

INÍCIO DA CONVERSA:
Sempre apresente o menu:
"Olá! Sou a assistente da EnergivIA. Como posso te ajudar hoje? (Digite o número da opção)
1 - Gerar Orçamento / Ler Fatura
2 - Dúvidas sobre o Sistema"

Siga ESTRITAMENTE a seguinte ordem (Os 8 Passos) caso a opção 1 seja escolhida:
1. O usuário manda o PDF (ou digita 1 e insere os dados).
2. Extraia imediatamente as informações da fatura: Consumo (kWh) e Cidade/Estado. (Se não achar, pergunte).
3. Pergunte qual vai ser a estrutura do telhado (cerâmica, fibrocimento, metálico, solo, laje, ou 'sem estrutura').
4. Ao ter os 3 dados, chame a ferramenta 'gerar_cotacao_distribuidor' para dimensionar.
5. Apresente os valores de cada distribuidor de forma muito simplificada: Exiba APENAS o nome da distribuidora e o valor total em reais. Não exiba a lista de itens.
6. Após exibir os valores, PERGUNTE explicitamente qual distribuidora o usuário seleciona.
7. Quando ele selecionar, inicie o cadastro do cliente final no CRM: Peça Nome, Email, Telefone e Endereço do cliente final.
8. Ao receber os dados do cliente, confirme que o cliente foi cadastrado no CRM EnergivIA e informe que a "Proposta em PDF / Link com template" foi gerada e será enviada.

REGRA CRÍTICA:
Você NÃO DEVE dar respostas abertas longas.
Se a ferramenta de cotação retornar erro, repasse o erro EXATO para o usuário ("*Falha interna: [erro]*").
Se o assunto for fora de energia solar/plataforma, responda que só pode ajudar com o sistema EnergivIA.`;

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

                            const safeLocation = location || "São Paulo, SP";
                            const safeConsumption = monthlyConsumption || 300;

                            const mathResults = generateSolarKits({ monthlyConsumption: safeConsumption, location: safeLocation, roofType: mappedRoof });
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

                                let bestInv = null;
                                let minDiff = Infinity;
                                for (const invObj of invs) {
                                    const name = invObj.product.name.toUpperCase();
                                    const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
                                    if (match) {
                                        let val = parseFloat(match[1].replace(',', '.'));
                                        if (match[2] === 'W') val = val / 1000;
                                        const diff = Math.abs(val - targetKWp);
                                        if (diff < minDiff) {
                                            minDiff = diff;
                                            bestInv = invObj;
                                        }
                                    }
                                }
                                const inv = bestInv || invs[0];
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
