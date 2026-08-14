const fs = require('fs');

let route = fs.readFileSync('src/app/api/chat/route.ts', 'utf8');

const newTool = `                    execute: async ({ monthlyConsumption, targetKWp, location, roofType, includeStructure, cidade, estado }: any) => {
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
                            let roofFactor = 1.0;
                            const roofStr = (roofType || "").toLowerCase();
                            if (roofStr === '1' || roofStr.includes('ceramic') || roofStr.includes('cerâmica') || roofStr.includes('colonial')) { mappedRoof = 'ceramic'; roofFactor = 1.0; }
                            else if (roofStr === '2' || roofStr.includes('fibro') || roofStr.includes('fibromadeira')) { mappedRoof = 'fibromadeira'; roofFactor = 1.0; }
                            else if (roofStr === '3' || roofStr.includes('metal') || roofStr.includes('metálic')) { mappedRoof = 'metal'; roofFactor = 1.0; }
                            else if (roofStr === '4' || roofStr.includes('solo') || roofStr.includes('ground')) { mappedRoof = 'ground'; roofFactor = 1.0; }
                            else if (roofStr === '5' || roofStr.includes('laje')) { mappedRoof = 'laje'; roofFactor = 1.0; }
                            else if (roofStr === '6' || roofStr.includes('sem') || roofStr.includes('nenhuma')) { mappedRoof = 'none'; roofFactor = 1.0; }

                            // Fator Norte 1.0 padrao. Futuramente a IA pode perguntar a face (Leste 0.93, Sul 0.8, etc)

                            const forcedIncludeStructure = includeStructure !== undefined ? includeStructure : (mappedRoof !== 'none');

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

                            const perdas = 0.284;
                            const PR = 1 - perdas;
                            const aumentoConsumo = 1.07;
                            const fatorFace = roofFactor;
                            
                            // Calcula as fórmulas passadas pelo usuário:
                            const geracaoPorKwp = finalHsp * 30 * PR;
                            const consumoAjustado = safeConsumption * aumentoConsumo; // Simplificado sem desconto disp.
                            
                            let finalTargetKWp = targetKWp;
                            if (!finalTargetKWp) {
                                finalTargetKWp = consumoAjustado / (geracaoPorKwp * fatorFace);
                            }

                            const headers: any = {};
                            if (token) headers["Authorization"] = \`Bearer \${token}\`;

                            // Buscar distribuidores da API real
                            const distRes = await fetch(\`\${baseURL}/distributors\`, { headers });
                            if (!distRes.ok) throw new Error("Falha ao buscar distribuidores na API real.");
                            const allDistributors = await distRes.json();
                            
                            const finalQuotes = [];
                            for (const d of allDistributors) {
                                // Para cada distribuidor, busca produtos
                                const prodsRes = await fetch(\`\${baseURL}/distributors/\${d.id}/products?limit=500\`, { headers });
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

                                const modPowerW = Number(mod.product?.specs?.power_w) || 550;
                                const moduleQ = Math.ceil((finalTargetKWp * 1000) / modPowerW);
                                const totalDcPower = modPowerW * moduleQ;
                                const modIsc = Number(mod.product?.specs?.isc) || 0;
                                const realKWp = totalDcPower / 1000;
                                const estGeneration = realKWp * geracaoPorKwp * fatorFace;

                                let validInvs = [];
                                for (const invObj of invs) {
                                    const specs = invObj.product?.specs;
                                    const name = (invObj.product?.name || invObj.descricao || "").toUpperCase();
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

                                    const isSaj = name.includes('SAJ');
                                    const overloadFactor = isSaj ? 2.0 : 1.3; // Poderia usar Ratio 1.15 CC/CA como limite superior, mas vamos manter o overload do datasheet
                                    const ratioCCCA = realKWp / invKWp;
                                    // Ratio maximo 1.15 ou pelo datasheet
                                    
                                    if (specs && specs.max_input_current && specs.max_dc_power) {
                                        const maxInputCurrent = Number(specs.max_input_current);
                                        const maxDcPower = Number(specs.max_dc_power);
                                        if (modIsc > maxInputCurrent + 1.5) continue;
                                        if (totalDcPower > maxDcPower * overloadFactor) continue;
                                    } else {
                                        if (totalDcPower > (invKWp * 1000) * overloadFactor) continue;
                                    }
                                    if (totalDcPower < (invKWp * 1000) * 0.7) continue;
                                    validInvs.push(invObj);
                                }

                                if (validInvs.length === 0) {
                                    let minDiff = Infinity;
                                    let bestFallback = null;
                                    for (const invObj of invs) {
                                        const name = (invObj.product?.name || invObj.descricao || "").toUpperCase();
                                        const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
                                        let invKWp = match ? parseFloat(match[1].replace(',', '.')) : finalTargetKWp;
                                        if (match && match[2] === 'W') invKWp = invKWp / 1000;
                                        const diff = Math.abs(invKWp - finalTargetKWp);
                                        if (diff < minDiff) { minDiff = diff; bestFallback = invObj; }
                                    }
                                    if (bestFallback) validInvs.push(bestFallback);
                                }

                                validInvs.sort((a, b) => Number(a.price) - Number(b.price));
                                const inv = validInvs.length > 0 ? validInvs[0] : invs[0];
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

                                const perfil = ests.find((p:any) => {
                                    const name = (p.product?.name || p.descricao || "").toLowerCase();
                                    return name.includes('perfil') && !name.includes('s/ perfil') && !name.includes('sem perfil') && p.id !== estPrinc?.id;
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
                                    valor_total_do_kit: \`R$ \${somaTotal.toFixed(2).replace('.', ',')}\`,
                                    kit_itens_salvos: [
                                        \`Inv: \${inv.product?.name || inv.descricao} (R$ \${precoInv.toFixed(2)})\`,
                                        \`Mod: \${moduleQ}x \${mod.product?.name || mod.descricao} (R$ \${precoMod.toFixed(2)})\`,
                                        cabPreto ? \`Cab Preto: \${cabPreto.product?.name || cabPreto.descricao} (R$ \${precoCabPreto.toFixed(2)})\` : null,
                                        cabVermelho ? \`Cab Vermelho: \${cabVermelho.product?.name || cabVermelho.descricao} (R$ \${precoCabVermelho.toFixed(2)})\` : null,
                                        con ? \`Con: 2x \${con.product?.name || con.descricao} (R$ \${precoCon.toFixed(2)})\` : null,
                                        (forcedIncludeStructure && estPrinc) ? \`Est: \${estPrinc.product?.name || estPrinc.descricao} (R$ \${precoEst.toFixed(2)})\` : null,
                                        (forcedIncludeStructure && perfil) ? \`Perfil: \${perfil.product?.name || perfil.descricao} (R$ \${precoPerfil.toFixed(2)})\` : null,
                                    ].filter(Boolean),
                                    info_adicional: \`Geração Est.: \${estGeneration.toFixed(1)} kWh/mês (Real: \${realKWp.toFixed(2)} kWp)\`
                                });
                            }

                            return {
                                success: true,
                                matematicaGuia: {
                                    geracaoPorKWp: \`\${geracaoPorKwp.toFixed(2)} kWh/kWp/mês\`,
                                    tamanhoRecomendadoMinimo: \`\${finalTargetKWp.toFixed(2)} kWp\`
                                },
                                ofertasDistribuidores: finalQuotes.length > 0 ? finalQuotes : "Nenhum distribuidor retornou kits com estoque na API."
                            };
                        } catch (e: any) {
                            return {
                                success: true,
                                ofertasDistribuidores: "Falha ao buscar distribuidores da API real. " + e.message
                            };
                        }
                    }`;

const startIndex = route.indexOf('                    execute: async ({ monthlyConsumption, targetKWp, location, roofType, includeStructure, cidade, estado }: any) => {');
const endIndex = route.indexOf('                }),\n                cadastrar_cliente_crm: tool({');

if (startIndex > -1 && endIndex > -1) {
    const updatedRoute = route.substring(0, startIndex) + newTool + "\n" + route.substring(endIndex);
    fs.writeFileSync('src/app/api/chat/route.ts', updatedRoute, 'utf8');
    console.log('Successfully updated route.ts');
} else {
    console.log('Failed to find indices');
}
