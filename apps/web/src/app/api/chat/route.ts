// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

import { systemPrompt } from './prompt';
const normalizeString = (str: string) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
};

const ufToState: Record<string, string> = {
    'AC': 'ACRE', 'AL': 'ALAGOAS', 'AP': 'AMAPÁ', 'AM': 'AMAZONAS', 'BA': 'BAHIA', 'CE': 'CEARÁ',
    'DF': 'DISTRITO FEDERAL', 'ES': 'ESPÍRITO SANTO', 'GO': 'GOIÁS', 'MA': 'MARANHÃO',
    'MT': 'MATO GROSSO', 'MS': 'MATO GROSSO DO SUL', 'MG': 'MINAS GERAIS', 'PA': 'PARÁ',
    'PB': 'PARAÍBA', 'PR': 'PARANÁ', 'PE': 'PERNAMBUCO', 'PI': 'PIAUÍ', 'RJ': 'RIO DE JANEIRO',
    'RN': 'RIO GRANDE DO NORTE', 'RS': 'RIO GRANDE DO SUL', 'RO': 'RONDÔNIA', 'RR': 'RORAIMA',
    'SC': 'SANTA CATARINA', 'SP': 'SÃO PAULO', 'SE': 'SERGIPE', 'TO': 'TOCANTINS'
};

let cachedCsvData: string[] | null = null;
const getHspFromCsv = (cidade: string, estado: string) => {
    try {
        if (!cachedCsvData) {
            const csvPath = path.join(process.cwd(), 'hsp_brasil_todos_municipios hsp_medio_anual.csv');
            cachedCsvData = fs.readFileSync(csvPath, 'utf8').split('\n');
        }

        const searchCity = normalizeString(cidade);
        const uf = estado.trim().toUpperCase();
        const searchState = normalizeString(ufToState[uf] || uf);

        for (let i = 1; i < cachedCsvData.length; i++) {
            const cols = cachedCsvData[i].split(';');
            if (cols.length >= 7) {
                const csvCity = normalizeString(cols[3]);
                const csvState = normalizeString(cols[5]);

                if (csvCity === searchCity && csvState === searchState) {
                    const hspValue = parseInt(cols[6], 10);
                    const lat = parseFloat(cols[2]);
                    const lon = parseFloat(cols[1]);
                    return { hsp: hspValue / 1000, lat, lon };
                }
            }
        }
    } catch (e) {
        console.error("Erro lendo CSV HSP:", e);
    }
    return null;
}

import pdfParse from "pdf-parse";
import { generateSolarKits } from "@energivia/solar-engine";
import { auth0 } from "@/lib/auth0";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();


        const formattedMessages = (await Promise.all(
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
                            { type: "image", image: m.imageUrl }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            })
        )).filter(m => m.content && (typeof m.content === 'string' ? m.content.trim().length > 0 : m.content.length > 0));

        console.log('TYPE OF SYSTEM PROMPT:', typeof systemPrompt);
        console.log('MESSAGES LENGTH:', formattedMessages.length);
        console.log('IS ARRAY:', Array.isArray(formattedMessages));
        const result = await streamText({
            model: openai("gpt-4o"),
            system: systemPrompt,
            messages: formattedMessages,
            tools: {
                buscar_hsp_localidade: tool({
                    description: "Busca o índice de irradiação solar (HSP) médio anual de uma cidade conectando na base local fornecida pelo INPE/IBGE.",
                    parameters: z.object({
                        cidade: z.string().optional().describe("Nome da cidade"),
                        estado: z.string().optional().describe("Sigla do estado (UF)")
                    }),
                    execute: async ({ cidade, estado }) => {
                        const csvData = getHspFromCsv(cidade || "", estado || "");

                        if (csvData) {
                            return { hsp: csvData.hsp, latitude: csvData.lat, longitude: csvData.lon, info: "HSP recuperado com sucesso (Base INPE/IBGE)" };
                        }

                        // Fallback do Estado (se a cidade nao for encontrada)
                        const UF_HSP: Record<string, number> = {
                            ac: 4.8, al: 5.5, am: 4.5, ap: 4.9, ba: 5.4, ce: 5.7, df: 5.5,
                            es: 5.1, go: 5.6, ma: 5.3, mg: 5.3, ms: 5.5, mt: 5.4, pa: 4.8,
                            pb: 5.6, pe: 5.3, pi: 5.6, pr: 4.9, rj: 5.0, rn: 5.7, ro: 4.8,
                            rr: 5.1, rs: 4.8, sc: 4.9, se: 5.4, sp: 4.8, to: 5.4
                        };
                        const fallbackHsp = UF_HSP[(estado || "").toLowerCase()] || 5.0;
                        return { hsp: fallbackHsp, info: `HSP recuperado com sucesso (Base Interna ${(estado || "").toUpperCase()})` };
                    }
                }),
                gerar_cotacao_distribuidor: tool({
                    description: "Usa o motor de cálculo da EnergivIA para descobrir os componentes físicos e puxar orçamentos REAIS cruzando todos os distribuidores ativos (Edeltec, etc) para a potência solicitada.",
                    parameters: z.object({
                        monthlyConsumption: z.coerce.number().optional().describe("Consumo mensal (kWh). Opcional se targetKWp for fornecido."),
                        targetKWp: z.coerce.number().optional().describe("Potência alvo do sistema em kWp. Forneça isso se o usuário pedir kWp ou módulos diretamente."),
                        location: z.string().optional().describe("Cidade e Estado"),
                        roofType: z.string().optional().describe("Tipo de telhado. Padrão: metal."),
                        includeStructure: z.boolean().optional().describe("True se precisar de estrutura. Padrão: true."),
                        cidade: z.string().optional().describe("Nome da cidade para o motor calcular HSP internamente"),
                        estado: z.string().optional().describe("Sigla do estado (UF) para o motor calcular HSP internamente")
                    }),
                    execute: async ({ monthlyConsumption, targetKWp, location, roofType, includeStructure, cidade, estado }: any) => {
                        try {
                            let token = "";
                            try {
                                const session = await auth0.getSession();
                                if (session) {
                                    const authResult = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                                    token = authResult.token || "";
                                }
                            } catch (e) {
                                console.warn("Sessão Auth0 não encontrada ou falha ao pegar token:", e);
                            }
                            
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

                            let mappedRoof: any = 'metal';
                            const roofStr = (roofType || "").toLowerCase();
                            if (roofStr === '1' || roofStr.includes('ceramic') || roofStr.includes('cerâmica') || roofStr.includes('colonial')) mappedRoof = 'ceramic';
                            else if (roofStr === '2' || roofStr.includes('fibro') || roofStr.includes('fibromadeira')) mappedRoof = 'fibromadeira';
                            else if (roofStr === '3' || roofStr.includes('metal') || roofStr.includes('metálic')) mappedRoof = 'metal';
                            else if (roofStr === '4' || roofStr.includes('solo') || roofStr.includes('ground')) mappedRoof = 'ground';
                            else if (roofStr === '5' || roofStr.includes('laje')) mappedRoof = 'laje';
                            else if (roofStr === '6' || roofStr.includes('sem') || roofStr.includes('nenhuma')) mappedRoof = 'none';

                            const forcedIncludeStructure = includeStructure !== undefined ? includeStructure : (mappedRoof !== 'none');

                            const safeLocation = location || "São Paulo, SP";
                            const safeConsumption = monthlyConsumption || 300;

                            // Busca HSP interna no motor para não depender do chute da IA
                            const cid = cidade || safeLocation.split(',')[0].trim();
                            const est = estado || safeLocation.split(',')[1]?.trim() || "SP";
                            const csvData = getHspFromCsv(cid, est);

                            const UF_HSP: Record<string, number> = {
                                ac: 4.8, al: 5.5, am: 4.5, ap: 4.9, ba: 5.4, ce: 5.7, df: 5.5,
                                es: 5.1, go: 5.6, ma: 5.3, mg: 5.3, ms: 5.5, mt: 5.4, pa: 4.8,
                                pb: 5.6, pe: 5.3, pi: 5.6, pr: 4.9, rj: 5.0, rn: 5.7, ro: 4.8,
                                rr: 5.1, rs: 4.8, sc: 4.9, se: 5.4, sp: 4.8, to: 5.4
                            };
                            const finalHsp = csvData?.hsp || UF_HSP[est.toLowerCase()] || 5.0;

                            // Cálculo forçado e cravado
                            let finalTargetKWp = targetKWp;
                            if (!finalTargetKWp) {
                                finalTargetKWp = Number(((safeConsumption / finalHsp) / 30).toFixed(2));
                            }
                            let target: any = null;

                            const headers: any = {};
                            if (token) headers["Authorization"] = `Bearer ${token}`;

                            console.log('[COTACAO] Buscando distribuidores em:', baseURL);
                            const distRes = await fetch(`${baseURL}/distributors`, {
                                headers,
                                signal: AbortSignal.timeout(15000)
                            });
                            
                            if (!distRes.ok) {
                                return { error: `Acesso negado ou erro ao buscar distribuidores: ${distRes.status}` };
                            }
                            const distList = await distRes.json();
                            if (!distList || distList.length === 0) return { error: "Nenhum distribuidor ativo no banco." };

                            console.log(`[COTACAO] ${distList.length} distribuidores encontrados. Buscando produtos...`);

                            // Use Promise.all to fetch products for all distributors in parallel
                            const allProdsPromises = distList.map(async (d: any) => {
                                try {
                                    const resProds = await fetch(`${baseURL}/distributors/${d.id}/products?limit=250`, {
                                        headers,
                                        signal: AbortSignal.timeout(15000)
                                    });
                                    if (!resProds.ok) return null;
                                    const jsonProds = await resProds.json();
                                    return { distributor: d, products: jsonProds.data || [] };
                                } catch (e) {
                                    console.warn(`[COTACAO] Falha ao buscar produtos do dist ${d.name}:`, e);
                                    return null;
                                }
                            });
                            
                            const distributorsData = await Promise.all(allProdsPromises);
                            console.log(`[COTACAO] Produtos retornados. Montando kits para ${finalTargetKWp} kWp...`);

                            const finalQuotes = [];
                            for (const dData of distributorsData) {
                                if (!dData || dData.products.length === 0) continue;
                                const { distributor: d, products: allProds } = dData;

                                const invs = allProds.filter((p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes('inversor'));
                                const mods = allProds.filter((p: any) => p.price > 0 && (JSON.stringify(p).toLowerCase().includes('módulo') || JSON.stringify(p).toLowerCase().includes('modulo') || JSON.stringify(p).toLowerCase().includes('painel')));
                                const cabs = allProds.filter((p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes('cabo'));
                                const cons = allProds.filter((p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes('conector'));
                                const ests = allProds.filter((p: any) => p.price > 0 && (JSON.stringify(p).toLowerCase().includes('estrutura') || JSON.stringify(p).toLowerCase().includes('perfil')));

                                // 1. Módulo
                                const validMods = mods.filter((m: any) => m.product.specs && m.product.specs.isc && m.product.specs.power_w);
                                const mod = validMods.length > 0 ? validMods[0] : mods[0];

                                if (!mod) continue; // Pula se não tiver nenhum módulo

                                const modPowerW = mod.product.specs ? (Number(mod.product.specs.power_w) || 550) : 550;
                                const moduleQ = Math.ceil((finalTargetKWp * 1000) / modPowerW);
                                const totalDcPower = modPowerW * moduleQ;
                                const modIsc = mod.product.specs ? (Number(mod.product.specs.isc) || 0) : 0;

                                // 2. Inversor
                                let validInvs = [];

                                for (const invObj of invs) {
                                    const specs = invObj.product.specs;

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
                                        invKWp = finalTargetKWp; // fallback conservador
                                    }

                                    const isSaj = name.includes('SAJ');
                                    const overloadFactor = isSaj ? 2.0 : 1.3; // 100% para SAJ, 30% padrão

                                    // Validação técnica e Overload
                                    if (specs && specs.max_input_current && specs.max_dc_power) {
                                        const maxInputCurrent = Number(specs.max_input_current);
                                        const maxDcPower = Number(specs.max_dc_power);

                                        if (modIsc > maxInputCurrent + 1.5) continue;
                                        if (totalDcPower > maxDcPower * overloadFactor) continue;
                                    } else {
                                        // Sem specs, aplica overload pelo nome
                                        if (totalDcPower > (invKWp * 1000) * overloadFactor) continue;
                                    }

                                    // Evitar superdimensionar demais o inversor (mínimo 70% de carga)
                                    if (totalDcPower < (invKWp * 1000) * 0.7) continue;

                                    validInvs.push(invObj);
                                }

                                // Se filtrou todos, recua para uma busca mais solta só por targetKWp
                                if (validInvs.length === 0) {
                                    let minDiff = Infinity;
                                    let bestFallback = null;
                                    for (const invObj of invs) {
                                        const name = invObj.product.name.toUpperCase();
                                        const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
                                        let invKWp = match ? parseFloat(match[1].replace(',', '.')) : finalTargetKWp;
                                        if (match && match[2] === 'W') invKWp = invKWp / 1000;
                                        const diff = Math.abs(invKWp - finalTargetKWp);
                                        if (diff < minDiff) { minDiff = diff; bestFallback = invObj; }
                                    }
                                    if (bestFallback) validInvs.push(bestFallback);
                                }

                                // Escolhe o mais barato dos válidos
                                validInvs.sort((a, b) => Number(a.price) - Number(b.price));
                                const inv = validInvs.length > 0 ? validInvs[0] : invs[0];
                                if (!inv) continue;

                                const cabPreto = cabs.find(c => JSON.stringify(c).toLowerCase().includes('preto')) || cabs[0];
                                const cabVermelho = cabs.find(c => JSON.stringify(c).toLowerCase().includes('vermelho')) || (cabs.length > 1 && cabs[1] !== cabPreto ? cabs[1] : null);
                                const con = cons[0];

                                // Tenta buscar a estrutura correta para o tipo de telhado
                                const matchedEsts = ests.filter(p => {
                                    const s = p.product.name.toLowerCase();
                                    if (mappedRoof === 'fibromadeira') {
                                        return s.includes('fibromadeira') || s.includes('fibrocimento') || s.includes('fibrometal');
                                    }
                                    return s.includes(mappedRoof);
                                });
                                const estPrinc = matchedEsts.length > 0 ? matchedEsts[0] : ests[0];

                                // Se o telhado não for 'none' e houver perfis disponíveis (que não sejam a estrutura principal e NÃO contenham "s/ perfil" ou "sem perfil")
                                const perfil = ests.find(p => {
                                    const name = p.product.name.toLowerCase();
                                    return name.includes('perfil') &&
                                        !name.includes('s/ perfil') &&
                                        !name.includes('sem perfil') &&
                                        p.id !== estPrinc?.id;
                                });

                                const precoInv = Number(inv.price) || 0;
                                const precoMod = (Number(mod.price) || 0) * moduleQ;
                                const precoCabPreto = cabPreto ? (Number(cabPreto.price) || 0) : 0;
                                const precoCabVermelho = cabVermelho ? (Number(cabVermelho.price) || 0) : 0;
                                const precoCon = con ? (Number(con.price) || 0) * 2 : 0;
                                const precoEst = (forcedIncludeStructure && estPrinc) ? (Number(estPrinc.price) || 0) : 0;
                                const precoPerfil = (forcedIncludeStructure && perfil) ? (Number(perfil.price) || 0) : 0;

                                const somaTotal = precoInv + precoMod + precoCabPreto + precoCabVermelho + precoCon + precoEst + precoPerfil;

                                finalQuotes.push({
                                    distribuidora: d.name,
                                    valor_total_do_kit: `R$ ${somaTotal.toFixed(2).replace('.', ',')}`,
                                    kit_itens_salvos: [
                                        `Inv: ${inv.product.name} (R$ ${precoInv})`,
                                        `Mod: ${moduleQ}x ${mod.product.name} (R$ ${precoMod})`,
                                        cabPreto ? `Cab Preto: ${cabPreto.product.name} (R$ ${precoCabPreto})` : null,
                                        cabVermelho ? `Cab Vermelho: ${cabVermelho.product.name} (R$ ${precoCabVermelho})` : null,
                                        con ? `Con: 2x ${con.product.name} (R$ ${precoCon})` : null,
                                        (forcedIncludeStructure && estPrinc) ? `Est: ${estPrinc.product.name} (R$ ${precoEst})` : null,
                                        (forcedIncludeStructure && perfil) ? `Perfil: ${perfil.product.name} (R$ ${precoPerfil})` : null,
                                    ].filter(Boolean)
                                });
                            }

                            return {
                                success: true,
                                matematicaGuia: {
                                    geracaoEstimada: target ? target.estimatedGeneration : `${(finalTargetKWp * 130).toFixed(0)} kWh/mês`,
                                    tamanhoRecomendado: target ? target.systemSize : `${finalTargetKWp} kWp`
                                },
                                ofertasDistribuidores: finalQuotes.length > 0 ? finalQuotes : "Nenhum distribuidor tinha módulos e inversores em estoque suficientes para formar um kit."
                            };
                        } catch (e: any) {
                            return {
                                success: true,
                                matematicaGuia: { geracaoEstimada: "Erro de conexão", tamanhoRecomendado: "Erro de conexão" },
                                ofertasDistribuidores: "Falha ao buscar distribuidores. Por favor, avise o suporte técnico que a API está fora do ar ou inacessível. Erro interno: " + e.message
                            };
                        }
                    }
                }),
                cadastrar_cliente_crm: tool({
                    description: "Registra um novo cliente/lead no CRM da plataforma EnergivIA. NUNCA chame essa ferramenta com valores vazios, apenas quando o usuário já tiver fornecido os dados reais.",
                    parameters: z.object({
                        nome: z.string().min(2).describe("Nome real do cliente fornecido no chat"),
                        whatsapp: z.string().min(8).describe("WhatsApp do cliente fornecido no chat")
                    }),
                    execute: async (args: any) => {
                        try {
                            let rawNome = args.nome || args.name || args.Nome || args.Name || "";
                            let rawWhatsapp = args.whatsapp || args.phone || args.telefone || args.Whatsapp || "";

                            if (!rawNome || !rawWhatsapp || String(rawNome).includes("undefined") || String(rawNome).includes("null")) {
                                // Fallback automático: a IA mandou vazio, então pegamos as 2 últimas mensagens do usuário
                                const userMsgs = formattedMessages.filter(m => m.role === 'user');
                                if (userMsgs.length >= 2) {
                                    const lastMsg = userMsgs[userMsgs.length - 1].content as string;
                                    const penultMsg = userMsgs[userMsgs.length - 2].content as string;

                                    // Consideramos que a última mensagem é o WhatsApp e a penúltima é o Nome
                                    rawWhatsapp = lastMsg;
                                    rawNome = penultMsg;
                                }

                                if (!rawNome || !rawWhatsapp) {
                                    return { error: `Erro na IA: Falta nome ou whatsapp. Os argumentos recebidos foram: ${JSON.stringify(args)}` };
                                }
                            }

                            const nome = String(rawNome).trim();
                            const whatsapp = String(rawWhatsapp).trim();

                            let token = "";
                            try {
                                const session = await auth0.getSession();
                                if (session) {
                                    const authResult = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                                    token = authResult.token || "";
                                }
                            } catch (e) {
                                console.warn("Sessão Auth0 não encontrada ou falha ao pegar token:", e);
                            }
                            
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
                            const payload = {
                                name: nome,
                                whatsapp: whatsapp,
                                source: "Chatbot IA"
                            };

                            console.log("PAYLOAD CRM:", payload);

                            const headers: any = {
                                "Content-Type": "application/json"
                            };
                            if (token) headers["Authorization"] = `Bearer ${token}`;

                            const res = await fetch(`${baseURL}/leads`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify(payload),
                                signal: AbortSignal.timeout(15000)
                            });

                            if (!res.ok) {
                                const err = await res.json();
                                return { error: `Erro no CRM: ${JSON.stringify(err)} | ARGS: ${JSON.stringify({ nome, whatsapp, typeNome: typeof nome })}` };
                            }

                            const leadData = await res.json();
                            return { success: true, leadId: leadData.id, message: `Cliente cadastrado com sucesso!` };
                        } catch (e: any) {
                            return { error: "Erro fatal cadastrando CRM: " + e.message };
                        }
                    }
                })
            },
            maxSteps: 5,
            onError: (err) => {
                console.error("[STREAMTEXT ERROR]", err);
            },
            onFinish: async (event) => {
                const finishLog = `[STREAM FINISH] Text: ${event.text}, FinishReason: ${event.finishReason}, ToolCalls: ${JSON.stringify(event.toolCalls)}, ToolResults: ${JSON.stringify(event.toolResults)}`;
                fs.appendFileSync(path.join(process.cwd(), 'app-logs.txt'), new Date().toISOString() + ': ' + finishLog + '\n');
                console.log(finishLog);
            }
        });

        return result.toUIMessageStreamResponse({ 
            headers: { "Cache-Control": "no-cache" },
        });
    } catch (error: any) {
        console.error('Erro na API de Chat:', error);
        // Return a plain text response so the widget can display it
        const errorMessage = `Desculpe, ocorreu um erro interno: ${error?.message || 'Falha na comunicação com a IA'}. Por favor, tente novamente.`;
        return new Response(errorMessage, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
        });
    }
}
