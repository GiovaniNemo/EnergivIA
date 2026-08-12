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
5. Apresente o KIT DIMENSIONADO de cada distribuidor de forma **limpa e enxuta** (mostre os equipamentos principais e totais, sem excesso de texto) e o valor total.
6. Após exibir os valores e os itens, PERGUNTE qual distribuidora o usuário seleciona.
7. Quando ele selecionar, inicie o cadastro do cliente final no CRM: Peça APENAS o **Nome** e o **Contato de Entrega** (WhatsApp) do cliente final.
8. Ao receber os dados do cliente, use a ferramenta 'cadastrar_cliente_crm' para registrar o cliente no sistema. Diga que o Lead foi cadastrado e a Proposta está sendo gerada.

REGRA CRÍTICA:
Você NÃO DEVE dar respostas abertas longas.
Na apresentação dos valores (Passo 5), mostre os itens salvos para que o cliente veja o que está sendo orçado.
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
                            else if (roofStr.includes('sem') || roofStr.includes('nenhuma')) mappedRoof = 'none';

                            const forcedIncludeStructure = mappedRoof !== 'none';

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

                                const invs = allProds.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('inversor'));
                                const mods = allProds.filter(p => p.price > 0 && (JSON.stringify(p).toLowerCase().includes('módulo') || JSON.stringify(p).toLowerCase().includes('modulo') || JSON.stringify(p).toLowerCase().includes('painel')));
                                const cabs = allProds.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('cabo'));
                                const cons = allProds.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('conector'));
                                const ests = allProds.filter(p => p.price > 0 && (JSON.stringify(p).toLowerCase().includes('estrutura') || JSON.stringify(p).toLowerCase().includes('perfil')));

                                // 1. Módulo
                                const validMods = mods.filter(m => m.product.specs && m.product.specs.isc && m.product.specs.power_w);
                                const mod = validMods.length > 0 ? validMods[0] : mods[0];
                                
                                if (!mod) continue; // Pula se não tiver nenhum módulo

                                const modPowerW = mod.product.specs ? (Number(mod.product.specs.power_w) || 550) : 550;
                                const moduleQ = Math.ceil((targetKWp * 1000) / modPowerW);
                                const totalDcPower = modPowerW * moduleQ;
                                const modIsc = mod.product.specs ? (Number(mod.product.specs.isc) || 0) : 0;

                                // 2. Inversor
                                let bestInv = null;
                                let minDiff = Infinity;

                                for (const invObj of invs) {
                                    const specs = invObj.product.specs;
                                    
                                    // Se tem specs preenchidas, fazemos validação técnica
                                    if (specs && specs.max_input_current && specs.max_dc_power) {
                                        const maxInputCurrent = Number(specs.max_input_current);
                                        const maxDcPower = Number(specs.max_dc_power);
                                        
                                        // Overload dinâmico baseado na marca
                                        const isSaj = invObj.product.name.toUpperCase().includes('SAJ');
                                        const overloadFactor = isSaj ? 2.0 : 1.3; // 100% para SAJ, 30% padrão

                                        if (modIsc > maxInputCurrent + 1.5) continue; 
                                        if (totalDcPower > maxDcPower * overloadFactor) continue;
                                    }

                                    // Chegar o mais próximo do targetKWp pelo nome ou spec
                                    const name = invObj.product.name.toUpperCase();
                                    const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
                                    let invKWp = null;
                                    
                                    if (match) {
                                        invKWp = parseFloat(match[1].replace(',', '.'));
                                        if (match[2] === 'W') invKWp = invKWp / 1000;
                                    } else if (specs && specs.max_dc_power) {
                                        invKWp = Number(specs.max_dc_power) / 1000;
                                    } else {
                                        invKWp = 10; // fallback pra não explodir
                                    }

                                    const diff = Math.abs(invKWp - targetKWp);
                                    if (diff < minDiff) {
                                        minDiff = diff;
                                        bestInv = invObj;
                                    }
                                }

                                const inv = bestInv || invs[0];
                                if (!inv) continue;

                                const cab = cabs[0];
                                const con = cons[0];
                                
                                // Tenta buscar a estrutura correta para o tipo de telhado
                                const matchedEsts = ests.filter(p => JSON.stringify(p).toLowerCase().includes(mappedRoof));
                                const est = matchedEsts.length > 0 ? matchedEsts[0] : ests[0];

                                const precoInv = Number(inv.price) || 0;
                                const precoMod = (Number(mod.price) || 0) * moduleQ;
                                const precoCab = cab ? (Number(cab.price) || 0) : 0;
                                const precoCon = con ? (Number(con.price) || 0) * 2 : 0;
                                const precoEst = (forcedIncludeStructure && est) ? (Number(est.price) || 0) : 0;

                                const somaTotal = precoInv + precoMod + precoCab + precoCon + precoEst;

                                finalQuotes.push({
                                    distribuidora: d.name,
                                    valor_total_do_kit: `R$ ${somaTotal.toFixed(2).replace('.', ',')}`,
                                    kit_itens_salvos: [
                                        `Inv: ${inv.product.name} (R$ ${precoInv})`,
                                        `Mod: ${moduleQ}x ${mod.product.name} (R$ ${precoMod})`,
                                        cab ? `Cab: ${cab.product.name} (R$ ${precoCab})` : null,
                                        con ? `Con: 2x ${con.product.name} (R$ ${precoCon})` : null,
                                        (forcedIncludeStructure && est) ? `Est: ${est.product.name} (R$ ${precoEst})` : null,
                                    ].filter(Boolean)
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
                }),
                cadastrar_cliente_crm: tool({
                    description: "Registra um novo cliente/lead no CRM da plataforma EnergivIA.",
                    parameters: z.object({
                        nome: z.string().describe("Nome do cliente"),
                        whatsapp: z.string().describe("Telefone ou WhatsApp do cliente")
                    }),
                    execute: async ({ nome, whatsapp }: any) => {
                        try {
                            const session = await auth0.getSession();
                            if (!session) return { error: "Sem sessão do admin." };
                            const result = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

                            const payload = {
                                name: nome,
                                whatsapp: whatsapp,
                                source: "Chatbot IA"
                            };

                            const res = await fetch(`${baseURL}/leads`, {
                                method: 'POST',
                                headers: {
                                    "Authorization": `Bearer ${result.token}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(payload)
                            });

                            if (!res.ok) {
                                const err = await res.json();
                                return { error: `Erro no CRM: ${JSON.stringify(err)}` };
                            }

                            const leadData = await res.json();
                            return { success: true, leadId: leadData.id, message: "Cliente cadastrado com sucesso no CRM EnergivIA!" };
                        } catch (e: any) {
                            return { error: "Erro fatal cadastrando CRM: " + e.message };
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
