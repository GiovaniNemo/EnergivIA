// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool, isStepCount } from "ai";
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
import { auth0 } from "@/lib/auth0";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const formattedMessages = (await Promise.all(
            messages.map(async (m: any, index: number) => {
                const isLastMessage = index === messages.length - 1;

                if (m.imageUrl) {
                    if (!isLastMessage) {
                        return { role: m.role, content: `[Documento/Imagem enviada pelo usuário no início da conversa]` };
                    }

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

        const result = await streamText({
            model: openai("gpt-4o"),
            system: systemPrompt,
            messages: formattedMessages,
            tools: {
                gerar_cotacao_distribuidor: tool({
                    description: "Usa o motor de cálculo da EnergivIA para dimensionar os componentes físicos e puxar orçamentos REAIS cruzando todos os distribuidores ativos.",
                    parameters: z.object({
                        monthlyConsumption: z.coerce.number().optional().describe("Consumo mensal (kWh)."),
                        targetKWp: z.coerce.number().optional().describe("Potência alvo do sistema em kWp."),
                        location: z.string().optional().describe("Cidade e Estado"),
                        roofType: z.string().optional().describe("Tipo de telhado. Padrão: metal."),
                        cidade: z.string().optional().describe("Nome da cidade para o motor calcular HSP"),
                        estado: z.string().optional().describe("Sigla do estado (UF) para o motor calcular HSP")
                    }),
                    execute: async ({ monthlyConsumption, targetKWp, location, roofType, cidade, estado }: any) => {
                        try {
                            let token = "";
                            try {
                                const session = await auth0.getSession();
                                if (session) {
                                    try {
                                        const authResult = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                                        token = authResult.token || session.accessToken || session.idToken || "";
                                    } catch (e) {
                                        token = session.idToken || session.accessToken || "";
                                    }
                                }
                            } catch (e) {
                                console.warn("Sessão Auth0 não encontrada:", e);
                            }
                            
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

                            let mappedRoof: any = 'metal';
                            let roofFactor = 1.0;
                            const roofStr = (roofType || "").toLowerCase();
                            if (roofStr === '1' || roofStr.includes('ceramic') || roofStr.includes('cerâmica') || roofStr.includes('colonial')) { mappedRoof = 'ceramic'; }
                            else if (roofStr === '2' || roofStr.includes('fibro') || roofStr.includes('fibromadeira')) { mappedRoof = 'fibromadeira'; }
                            else if (roofStr === '3' || roofStr.includes('metal') || roofStr.includes('metálic')) { mappedRoof = 'metal'; }
                            else if (roofStr === '4' || roofStr.includes('solo') || roofStr.includes('ground')) { mappedRoof = 'ground'; }
                            else if (roofStr === '5' || roofStr.includes('laje')) { mappedRoof = 'laje'; }
                            else if (roofStr === '6' || roofStr.includes('sem') || roofStr.includes('nenhuma')) { mappedRoof = 'none'; }

                            // Fator de face: Norte = 1.0 (default)
                            // Para ser mais preciso, a IA poderia pedir a face, mas como default vamos usar Norte = 1.0
                            const forcedIncludeStructure = mappedRoof !== 'none';

                            const safeLocation = location || "São Paulo, SP";
                            const safeConsumption = monthlyConsumption || 300;

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

                            // Aplicando a formula do CRM
                            const perdas = 0.284;
                            const PR = 1 - perdas;
                            const aumentoConsumo = 1.07;
                            const fatorFace = roofFactor;
                            
                            const geracaoPorKwp = finalHsp * 30 * PR;
                            const consumoAjustado = safeConsumption * aumentoConsumo;
                            
                            let finalTargetKWp = targetKWp;
                            if (!finalTargetKWp) {
                                finalTargetKWp = consumoAjustado / (geracaoPorKwp * fatorFace);
                            }

                            const headers: any = {};
                            if (token) headers["Authorization"] = `Bearer ${token}`;

                            // Buscar distribuidores da API real
                            const distRes = await fetch(`${baseURL}/distributors`, { headers });
                            if (!distRes.ok) throw new Error("Falha ao buscar distribuidores na API real.");
                            const allDistributors = await distRes.json();
                            
                            const finalQuotes = [];
                            for (const d of allDistributors) {
                                const prodsRes = await fetch(`${baseURL}/distributors/${d.id}/products?limit=500`, { headers });
                                if (!prodsRes.ok) continue;
                                const prodsJson = await prodsRes.json();
                                const allProds = prodsJson.data || [];
                                
                                if (allProds.length === 0) continue;

                                const invs = allProds.filter((p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes('inversor'));
                                const mods = allProds.filter((p: any) => p.price > 0 && (JSON.stringify(p).toLowerCase().includes('módulo') || JSON.stringify(p).toLowerCase().includes('modulo') || JSON.stringify(p).toLowerCase().includes('painel')));
                                const cabs = allProds.filter((p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes('cabo'));
                                const cons = allProds.filter((p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes('conector'));
                                const ests = allProds.filter((p: any) => p.price > 0 && (JSON.stringify(p).toLowerCase().includes('estrutura') || JSON.stringify(p).toLowerCase().includes('perfil')));

                                const validMods = mods.filter((m: any) => m.product?.specs?.power_w);
                                const mod = validMods.length > 0 ? validMods[0] : mods[0];
                                if (!mod) continue;

                                let modPowerW = Number(mod.product?.specs?.power_w);
                                if (!modPowerW) {
                                    const modName = (mod.product?.name || mod.descricao || "").toUpperCase();
                                    const modMatch = modName.match(/(\d{3,4})\s*W/);
                                    if (modMatch) modPowerW = parseInt(modMatch[1], 10);
                                    else modPowerW = 550;
                                }
                                // Number of panels: always rounds up
                                const moduleQ = Math.ceil((finalTargetKWp * 1000) / modPowerW);
                                const realKWp = (moduleQ * modPowerW) / 1000;
                                const estGeneration = realKWp * geracaoPorKwp * fatorFace;

                                let validInvs = [];
                                for (const invObj of invs) {
                                    const specs = invObj.product?.specs;
                                    const name = (invObj.product?.name || invObj.descricao || "").toUpperCase();
                                    
                                    // Extract kWp
                                    const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
                                    let invKWp = null;

                                    if (match) {
                                        invKWp = parseFloat(match[1].replace(',', '.'));
                                        if (match[2] === 'W') invKWp = invKWp / 1000;
                                    } else if (specs && specs.max_dc_power) {
                                        invKWp = Number(specs.max_dc_power) / 1000;
                                    } else {
                                        invKWp = finalTargetKWp;
                                    }

                                    // Ratio CC/CA constraint (max 1.15 if we enforce strictly, but let's just make sure it's not wildly oversized or undersized)
                                    const ratio = realKWp / invKWp;
                                    if (ratio < 0.7 || ratio > 1.35) continue; // Allow up to 35% overload usually
                                    
                                    validInvs.push(invObj);
                                }

                                if (validInvs.length === 0) continue; // Skip distributor if no valid inverter found

                                validInvs.sort((a, b) => Number(a.price) - Number(b.price));
                                const inv = validInvs[0];
                                if (!inv) continue;

                                const cabPreto = cabs.find((c:any) => JSON.stringify(c).toLowerCase().includes('preto')) || cabs[0];
                                const cabVermelho = cabs.find((c:any) => JSON.stringify(c).toLowerCase().includes('vermelho')) || (cabs.length > 1 && cabs[1] !== cabPreto ? cabs[1] : null);
                                const con = cons[0];

                                const matchedEsts = ests.filter((p:any) => {
                                    const s = (p.product?.name || p.descricao || "").toLowerCase();
                                    if (mappedRoof === 'fibromadeira') return s.includes('fibromadeira') || s.includes('fibrocimento') || s.includes('fibrometal');
                                    return s.includes(mappedRoof);
                                });
                                const estPrinc = matchedEsts.length > 0 ? matchedEsts[0] : ests[0];

                                const precoInv = Number(inv.price) || 0;
                                const precoMod = (Number(mod.price) || 0) * moduleQ;
                                const precoCabPreto = cabPreto ? (Number(cabPreto.price) || 0) : 0;
                                const precoCabVermelho = cabVermelho ? (Number(cabVermelho.price) || 0) : 0;
                                const precoCon = con ? (Number(con.price) || 0) * 2 : 0;
                                const precoEst = (forcedIncludeStructure && estPrinc) ? (Number(estPrinc.price) || 0) : 0;

                                const somaTotal = precoInv + precoMod + precoCabPreto + precoCabVermelho + precoCon + precoEst;

                                finalQuotes.push({
                                    distribuidora: d.name,
                                    valor_total_do_kit: `R$ ${somaTotal.toFixed(2).replace('.', ',')}`,
                                    kit_itens_salvos: [
                                        `Inv: ${inv.product?.name || inv.descricao}`,
                                        `Mod: ${moduleQ}x ${mod.product?.name || mod.descricao}`,
                                        (forcedIncludeStructure && estPrinc) ? `Est: ${estPrinc.product?.name || estPrinc.descricao}` : null,
                                    ].filter(Boolean),
                                    info_adicional: `Geração Estimada: ${estGeneration.toFixed(1)} kWh/mês (Kit Real: ${realKWp.toFixed(2)} kWp)`
                                });
                            }

                            return {
                                success: true,
                                ofertasDistribuidores: finalQuotes.length > 0 ? finalQuotes : "Nenhum distribuidor retornou kits com estoque na API."
                            };
                        } catch (e: any) {
                            return {
                                success: false,
                                ofertasDistribuidores: "Falha ao buscar distribuidores da API real. " + e.message
                            };
                        }
                    }
                }),
                cadastrar_cliente_crm: tool({
                    description: "Registra um novo cliente/lead no CRM da plataforma EnergivIA.",
                    parameters: z.object({
                        nome: z.string().describe("Nome do cliente"),
                        whatsapp: z.string().describe("WhatsApp do cliente")
                    }),
                    execute: async (args: any) => {
                        try {
                            const nome = String(args.nome || "").trim();
                            const whatsapp = String(args.whatsapp || "").trim();

                            let token = "";
                            try {
                                const session = await auth0.getSession();
                                if (session) {
                                    try {
                                        const authResult = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                                        token = authResult.token || session.accessToken || session.idToken || "";
                                    } catch (e) {
                                        token = session.idToken || session.accessToken || "";
                                    }
                                }
                            } catch (e) {
                                console.warn("Sessão Auth0 não encontrada:", e);
                            }
                            
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
                            const payload = { name: nome, whatsapp: whatsapp, source: "Chatbot IA" };
                            const headers: any = { "Content-Type": "application/json" };
                            if (token) headers["Authorization"] = `Bearer ${token}`;

                            if (!token) {
                                return { error: `Autenticação ausente. O sistema não encontrou um token válido na sua sessão.` };
                            }

                            const res = await fetch(`${baseURL}/leads`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify(payload)
                            });

                            if (!res.ok) {
                                const errText = await res.text().catch(() => "");
                                return { error: `Erro no CRM (Status ${res.status}): ${errText}` };
                            }

                            const leadData = await res.json();
                            return { success: true, leadId: leadData.id, message: `Cliente cadastrado com sucesso!` };
                        } catch (e: any) {
                            return { error: "Erro fatal CRM: " + e.message };
                        }
                    }
                })
            },
            stopWhen: isStepCount(5),
            onError: (err) => {
                console.error("[STREAMTEXT ERROR]", err);
            },
            onFinish: async (event) => {}
        });

        return result.toUIMessageStreamResponse({ 
            headers: { "Cache-Control": "no-cache" },
        });
    } catch (error: any) {
        console.error('Erro na API de Chat:', error);
        return new Response(`Desculpe, ocorreu um erro interno: ${error?.message}. Por favor, tente novamente.`, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
        });
    }
}
