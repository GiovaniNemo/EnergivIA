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
5. Apresente o KIT DIMENSIONADO de cada distribuidor de forma limpa e enxuta (mostre os equipamentos principais e totais, sem excesso de texto) e o valor total.
6. Após exibir os valores e os itens, PERGUNTE qual distribuidora o usuário seleciona.
7. Quando ele selecionar, inicie o cadastro do cliente final no CRM: Peça APENAS o Nome do cliente final. NUNCA CHAME a ferramenta de CRM nesta etapa, APENAS FAÇA A PERGUNTA E ESPERE A RESPOSTA.
8. Após ele responder o nome, pergunte o Contato de Entrega (WhatsApp). NUNCA CHAME a ferramenta de CRM nesta etapa, APENAS FAÇA A PERGUNTA E ESPERE A RESPOSTA.
9. Só após o usuário já ter digitado o Nome E o WhatsApp, use a ferramenta 'cadastrar_cliente_crm' para registrar o cliente no sistema passando os dados fornecidos.

=======================================================
REGRAS DE DIMENSIONAMENTO E EXTRAÇÃO PARA A IA RESPONDER
=======================================================
ETAPA 1: MAPA DE EXTRAÇÃO DE DADOS (OCR & PROMPT)
A IA deve varrer o PDF e extrair os seguintes campos estruturados:
- cliente_cidade: Cidade da instalação (Próximo ao endereço do cliente ou no cabeçalho do CNPJ)
- cliente_estado: UF (Código de 2 letras)
- tipo_conexao: Tipo de fase da rede (Monofásico, Bifásico, Trifásico ou verificar leitura)
- historico_consumo: Vetor com os últimos 12 meses de consumo em kWh
- grupo_tarifario: Classificação da tensão (B1, B2, B3)

ETAPA 2: LÓGICA DE NEGÓCIO E REGRAS DE FILTRAGEM
Antes de fazer cálculo matemático, aplique os filtros:
A. Tratamento de Anomalias no Histórico: Ignorar meses zerados ou com a palavra "Média". Fazer a média aritmética considerando apenas os meses válidos.
B. Identificação Automática da Taxa de Disponibilidade: Monofásico -> 30, Bifásico -> 50, Trifásico -> 100.

ETAPA 3: O ALGORITMO MATEMÁTICO PASSO A PASSO
Passo 1: Cálculo do Consumo Médio Mensal Target (C_medio): Soma-se o histórico e divide-se pelo nº de meses válidos.
Passo 2: Cálculo do Consumo Líquido a Compensar (C_compensar): C_medio - taxa de disponibilidade.
Passo 3: Definição do Índice de Irradiação Solar (HSP): OBRIGATÓRIO chamar a ferramenta 'buscar_hsp_localidade' passando a cidade e estado extraídos para obter a média anual real da NASA. NUNCA tente adivinhar esse valor.
Passo 4: Taxa de Perda Global (PR = 0.80).
Passo 5: Potência do Sistema (P_kWp): C_compensar / (HSP * 30 * PR).

ETAPA 4: DIMENSIONAMENTO FÍSICO DO KIT (PLACA E INVERSOR)
A. Número de Módulos: Arredondar para cima (P_kWp / potencia_modulo). (Ex: 0.55 kWp)
B. Dimensionamento do Inversor (P_inversor): Potência nominal do inversor deve representar entre 75% e 90% da potência dos painéis.
   P_inversor_min = P_kWp * 0.77
   P_inversor_max = P_kWp * 0.90

=======================================================
REGRA CRÍTICA:
- Você NÃO DEVE dar respostas abertas longas.
- Seja o mais sucinto possível.
- NÃO USE asteriscos (**) para negrito ou qualquer outra formatação, responda sempre em texto simples.
- Sempre que houver várias opções de escolha para o usuário, elenque-as obrigatoriamente em números (ex: 1 - Opção A, 2 - Opção B).
Na apresentação dos valores (Passo 5), mostre os itens salvos para que o cliente veja o que está sendo orçado.
Se a ferramenta de cotação retornar erro, repasse o erro EXATO para o usuário ("Falha interna: [erro]").
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
                buscar_hsp_localidade: tool({
                    description: "Busca o índice de irradiação solar (HSP) médio anual de uma cidade conectando na base da NASA POWER.",
                    parameters: z.object({
                        cidade: z.string().describe("Nome da cidade"),
                        estado: z.string().describe("Sigla do estado (UF)")
                    }),
                    execute: async ({ cidade, estado }) => {
                        try {
                            const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidade)},${encodeURIComponent(estado)},Brazil&format=json&limit=1`;
                            const geoRes = await fetch(geocodeUrl, { headers: { "User-Agent": "EnergivIA-Bot (sgiovanimendes@gmail.com)" } });
                            const geoData = await geoRes.json();
                            if (!geoData || geoData.length === 0) return { error: "Localização não encontrada." };
                            
                            const { lat, lon } = geoData[0];
                            const nasaUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
                            const nasaRes = await fetch(nasaUrl);
                            const nasaData = await nasaRes.json();
                            
                            const hspAnual = nasaData?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN;
                            if (hspAnual) {
                                return { hsp: hspAnual, latitude: lat, longitude: lon, info: "Dados da NASA POWER Climatology" };
                            }
                            return { error: "Falha ao extrair HSP da NASA." };
                        } catch (err: any) {
                            return { error: "Erro na consulta de HSP: " + err.message };
                        }
                    }
                }),
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
                            const session = await auth0.getSession();
                            if (!session) return { error: "Sem sessão do admin." };
                            const result = await auth0.getAccessToken({ audience: process.env["AUTH0_AUDIENCE"] });
                            const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
                            const payload = {
                                name: nome,
                                whatsapp: whatsapp,
                                source: "Chatbot IA"
                            };

                            console.log("PAYLOAD CRM:", payload);

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
                                return { error: `Erro no CRM: ${JSON.stringify(err)} | ARGS: ${JSON.stringify({nome, whatsapp, typeNome: typeof nome})}` };
                            }

                            const leadData = await res.json();
                            return { success: true, leadId: leadData.id, message: `Cliente cadastrado com sucesso!` };
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
