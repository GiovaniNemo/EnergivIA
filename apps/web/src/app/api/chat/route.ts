/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool, isStepCount } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

import { systemPrompt } from "./prompt";
import { computeProjectCostSection } from "@energivia/proposal-economia";

const normalizeString = (str: string) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

const ufToState: Record<string, string> = {
  AC: "ACRE",
  AL: "ALAGOAS",
  AP: "AMAPÁ",
  AM: "AMAZONAS",
  BA: "BAHIA",
  CE: "CEARÁ",
  DF: "DISTRITO FEDERAL",
  ES: "ESPÍRITO SANTO",
  GO: "GOIÁS",
  MA: "MARANHÃO",
  MT: "MATO GROSSO",
  MS: "MATO GROSSO DO SUL",
  MG: "MINAS GERAIS",
  PA: "PARÁ",
  PB: "PARAÍBA",
  PR: "PARANÁ",
  PE: "PERNAMBUCO",
  PI: "PIAUÍ",
  RJ: "RIO DE JANEIRO",
  RN: "RIO GRANDE DO NORTE",
  RS: "RIO GRANDE DO SUL",
  RO: "RONDÔNIA",
  RR: "RORAIMA",
  SC: "SANTA CATARINA",
  SP: "SÃO PAULO",
  SE: "SERGIPE",
  TO: "TOCANTINS",
};

let cachedCsvData: string[] | null = null;
const getHspFromCsv = (cidade: string, estado: string) => {
  try {
    if (!cachedCsvData) {
      const csvPath = path.join(process.cwd(), "hsp_brasil_todos_municipios hsp_medio_anual.csv");
      cachedCsvData = fs.readFileSync(csvPath, "utf8").split("\n");
    }

    const searchCity = normalizeString(cidade);
    const uf = estado.trim().toUpperCase();
    const searchState = normalizeString(ufToState[uf] || uf);

    for (let i = 1; i < cachedCsvData.length; i++) {
      const cols = cachedCsvData[i].split(";");
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
};

import pdfParse from "pdf-parse";
import { auth0 } from "@/lib/auth0";
import { extractEnergyBillFromPdfBuffer, extractEnergyBillFromImage } from "@/lib/bill-extractor";

export const maxDuration = 60;

async function calculateDistributorQuotes({
  baseURL,
  headers,
  messages,
  monthlyConsumption,
  targetKWp,
  targetModules,
  location,
  roofType,
  cidade,
  estado,
}: {
  baseURL: string;
  headers: any;
  messages: any[];
  monthlyConsumption?: any;
  targetKWp?: any;
  targetModules?: any;
  location?: string;
  roofType?: string;
  cidade?: string;
  estado?: string;
}) {
  let mappedRoof: any = "metal";
  const roofFactor = 1.0;
  const finalRoofStr = (roofType || "").toLowerCase();

  // Robust fallback: search all user messages for the last mentioned structure
  const allUserMsgs = messages
    .filter((m: any) => m.role === "user")
    .map((m: any) => (typeof m.content === "string" ? m.content.toLowerCase() : ""));
  let userForcedRoof = "";
  for (let i = allUserMsgs.length - 1; i >= 0; i--) {
    const msg = allUserMsgs[i];
    if (
      msg.includes("fibrocimento") ||
      msg.includes("fibromadeira") ||
      msg.includes("estrutura 2") ||
      msg.match(/n[uú]mero 2/) ||
      msg.match(/tipo 2/) ||
      msg.match(/\b2\b/)
    ) {
      userForcedRoof = "fibromadeira";
      break;
    } else if (
      msg.includes("ceramic") ||
      msg.includes("cerâmica") ||
      msg.includes("colonial") ||
      msg.includes("estrutura 1") ||
      msg.match(/n[uú]mero 1/) ||
      msg.match(/tipo 1/) ||
      msg.match(/\b1\b/)
    ) {
      userForcedRoof = "ceramic";
      break;
    } else if (
      msg.includes("metal") ||
      msg.includes("metálic") ||
      msg.includes("estrutura 3") ||
      msg.match(/n[uú]mero 3/) ||
      msg.match(/tipo 3/) ||
      msg.match(/\b3\b/)
    ) {
      userForcedRoof = "metal";
      break;
    } else if (
      msg.includes("fibrometal") ||
      msg.includes("estrutura 6") ||
      msg.match(/n[uú]mero 6/) ||
      msg.match(/tipo 6/) ||
      msg.match(/\b6\b/)
    ) {
      userForcedRoof = "fibrometal";
      break;
    } else if (
      msg.includes("solo") ||
      msg.includes("ground") ||
      msg.includes("estrutura 4") ||
      msg.match(/n[uú]mero 4/) ||
      msg.match(/tipo 4/) ||
      msg.match(/\b4\b/)
    ) {
      userForcedRoof = "ground";
      break;
    } else if (
      msg.includes("laje") ||
      msg.includes("estrutura 5") ||
      msg.match(/n[uú]mero 5/) ||
      msg.match(/tipo 5/) ||
      msg.match(/\b5\b/)
    ) {
      userForcedRoof = "laje";
      break;
    } else if (
      msg === "7" ||
      msg.includes("sem estrutura") ||
      msg.includes("nenhuma") ||
      msg.includes("estrutura 7") ||
      msg.match(/n[uú]mero 7/) ||
      msg.match(/tipo 7/) ||
      msg.match(/\b7\b/)
    ) {
      userForcedRoof = "none";
      break;
    }
  }

  if (userForcedRoof) {
    mappedRoof = userForcedRoof;
  } else {
    const roofStr = finalRoofStr;
    if (
      roofStr === "1" ||
      roofStr.includes("ceramic") ||
      roofStr.includes("cerâmica") ||
      roofStr.includes("colonial")
    ) {
      mappedRoof = "ceramic";
    } else if (
      roofStr === "2" ||
      roofStr.includes("fibrocimento") ||
      roofStr.includes("fibro") ||
      roofStr.includes("fibromadeira")
    ) {
      mappedRoof = "fibromadeira";
    } else if (roofStr === "6" || roofStr.includes("fibrometal")) {
      mappedRoof = "fibrometal";
    } else if (roofStr === "3" || roofStr.includes("metal") || roofStr.includes("metálic")) {
      mappedRoof = "metal";
    } else if (roofStr === "4" || roofStr.includes("solo") || roofStr.includes("ground")) {
      mappedRoof = "ground";
    } else if (roofStr === "5" || roofStr.includes("laje")) {
      mappedRoof = "laje";
    } else if (roofStr === "7" || roofStr.includes("sem") || roofStr.includes("nenhum")) {
      mappedRoof = "none";
    }
  }

  const forcedIncludeStructure = mappedRoof !== "none";
  const safeLocation = location || "São Paulo, SP";

  let parsedConsumption = 300;
  const rawConsumptionStr = String(monthlyConsumption || "").toLowerCase();
  if (rawConsumptionStr && rawConsumptionStr !== "undefined" && rawConsumptionStr !== "null") {
    const parsed = parseFloat(rawConsumptionStr.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) parsedConsumption = parsed;
  }

  if (parsedConsumption === 300) {
    const allText = messages
      .map((m: any) =>
        typeof m.content === "string"
          ? m.content.toLowerCase()
          : Array.isArray(m.content)
            ? m.content
                .map((c: any) => (typeof c === "string" ? c : c.text || ""))
                .join(" ")
                .toLowerCase()
            : ""
      )
      .join(" ");

    const exactMatch =
      allText.match(/m[ée]dia mensal exata[^0-9]*(\d+)/i) ||
      allText.match(/m[ée]dia mensal[^0-9]*(\d+)\s*kwh/i) ||
      allText.match(/consumo m[ée]dio[^0-9]*(\d+)/i);

    if (exactMatch) {
      parsedConsumption = parseInt(exactMatch[1], 10);
    } else {
      const kwhMatches = [...allText.matchAll(/(\d+)\s*kwh/g)];
      if (kwhMatches.length > 0) {
        parsedConsumption = parseInt(kwhMatches[kwhMatches.length - 1][1], 10);
      }
    }
  }
  const safeConsumption = parsedConsumption;

  const cid = cidade || safeLocation.split(",")[0].trim();
  const est = estado || safeLocation.split(",")[1]?.trim() || "SP";
  const csvData = getHspFromCsv(cid, est);

  const UF_HSP: Record<string, number> = {
    ac: 4.8,
    al: 5.5,
    am: 4.5,
    ap: 4.9,
    ba: 5.4,
    ce: 5.7,
    df: 5.5,
    es: 5.1,
    go: 5.6,
    ma: 5.3,
    mg: 5.3,
    ms: 5.5,
    mt: 5.4,
    pa: 4.8,
    pb: 5.6,
    pe: 5.3,
    pi: 5.6,
    pr: 4.9,
    rj: 5.0,
    rn: 5.7,
    ro: 4.8,
    rr: 5.1,
    rs: 4.8,
    sc: 4.9,
    se: 5.4,
    sp: 4.8,
    to: 5.4,
  };
  const finalHsp = csvData?.hsp || UF_HSP[est.toLowerCase()] || 5.0;

  const perdas = 0.284;
  const PR = 1 - perdas;
  const aumentoConsumo = 1.07;
  const fatorFace = roofFactor;

  const geracaoPorKwp = finalHsp * 30 * PR;
  const consumoAjustado = safeConsumption * aumentoConsumo;

  let parsedTargetKWp = undefined;
  if (targetKWp !== undefined && targetKWp !== null) {
    if (typeof targetKWp === "number") parsedTargetKWp = targetKWp;
    else if (typeof targetKWp === "string") {
      const parsed = parseFloat(targetKWp.replace(/[^0-9.,]/g, "").replace(",", "."));
      if (!isNaN(parsed)) parsedTargetKWp = parsed;
    }
  }

  let finalTargetKWp = parsedTargetKWp;
  if (!finalTargetKWp) {
    finalTargetKWp = consumoAjustado / (geracaoPorKwp * fatorFace);
  }

  const distRes = await fetch(`${baseURL}/distributors`, { headers });
  if (!distRes.ok) throw new Error("Falha ao buscar distribuidores na API real.");
  const allDistributors = await distRes.json();

  const finalQuotes = [];
  for (const d of allDistributors) {
    const prodsRes = await fetch(`${baseURL}/distributors/${d.id}/products?limit=500`, {
      headers,
    });
    if (!prodsRes.ok) continue;
    const prodsJson = await prodsRes.json();
    const allProds = prodsJson.data || [];

    if (allProds.length === 0) continue;

    const invs = allProds.filter(
      (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("inversor")
    );
    const mods = allProds.filter(
      (p: any) =>
        p.price > 0 &&
        (JSON.stringify(p).toLowerCase().includes("módulo") ||
          JSON.stringify(p).toLowerCase().includes("modulo") ||
          JSON.stringify(p).toLowerCase().includes("painel"))
    );
    const cabs = allProds.filter(
      (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("cabo")
    );
    const cons = allProds.filter(
      (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("conector")
    );
    const ests = allProds.filter(
      (p: any) =>
        p.price > 0 &&
        (JSON.stringify(p).toLowerCase().includes("estrutura") ||
          JSON.stringify(p).toLowerCase().includes("perfil"))
    );

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
    let moduleQ = targetModules ? targetModules : Math.ceil((finalTargetKWp * 1000) / modPowerW);
    let realKWp = (moduleQ * modPowerW) / 1000;
    const estGeneration = realKWp * geracaoPorKwp * fatorFace;

    const validInvs = [];
    for (const invObj of invs) {
      const specs = invObj.product?.specs;
      const name = (invObj.product?.name || invObj.descricao || "").toUpperCase();

      let testModuleQ = moduleQ;
      if ((name.includes("MONOF") || name.includes("MONO")) && testModuleQ < 4) {
        testModuleQ = 4;
      }
      const testRealKWp = (testModuleQ * modPowerW) / 1000;

      const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
      let invKWp = null;

      if (match) {
        invKWp = parseFloat(match[1].replace(",", "."));
        if (match[2] === "W") invKWp = invKWp / 1000;
      } else if (specs && specs.max_dc_power) {
        invKWp = Number(specs.max_dc_power) / 1000;
      } else {
        invKWp = finalTargetKWp;
      }

      const ratio = testRealKWp / invKWp;
      if (ratio < 0.5 || ratio > 1.45) continue;

      validInvs.push({
        ...invObj,
        _testModuleQ: testModuleQ,
        _testRealKWp: testRealKWp,
      });
    }

    if (validInvs.length === 0) continue;

    validInvs.sort((a, b) => Number(a.price) - Number(b.price));
    const inv = validInvs[0];
    if (!inv) continue;

    moduleQ = inv._testModuleQ;
    realKWp = inv._testRealKWp;

    const cabPreto =
      cabs.find((c: any) => JSON.stringify(c).toLowerCase().includes("preto")) || cabs[0];
    const cabVermelho =
      cabs.find((c: any) => JSON.stringify(c).toLowerCase().includes("vermelho")) ||
      (cabs.length > 1 && cabs[1] !== cabPreto ? cabs[1] : null);
    const con = cons[0];

    const matchedEsts = ests.filter((p: any) => {
      const n = (p.product?.name || "").toLowerCase();
      const d = (p.descricao || "").toLowerCase();
      const s = n + " " + d;

      if (mappedRoof === "fibrometal") return s.includes("fibrometal");
      if (mappedRoof === "fibromadeira") {
        if (n.includes("fibromadeira") || n.includes("fibrocimento")) return true;
        if (
          (d.includes("fibromadeira") || d.includes("fibrocimento")) &&
          !n.includes("metal") &&
          !n.includes("ceramica") &&
          !n.includes("colonial")
        )
          return true;
        return false;
      }
      if (mappedRoof === "metal") return s.includes("metal") && !s.includes("fibrometal");
      return s.includes(mappedRoof);
    });
    const parsedEsts = matchedEsts
      .map((p: any) => {
        const n = (p.product?.name || "").toUpperCase();
        const m = n.match(/(\d+)\s*(MOD|PAIN|PLAC)/);
        let cap = m ? parseInt(m[1], 10) : 0;
        if (cap > 4 && mappedRoof !== "ground") {
          cap = 0;
        }
        return { ...p, cap };
      })
      .filter((p) => p.cap > 0);

    const selectedStructures: any[] = [];
    if (parsedEsts.length > 0) {
      let remaining = moduleQ;
      const bestByCap: Record<number, any> = {};
      for (const p of parsedEsts) {
        if (!bestByCap[p.cap] || Number(p.price) < Number(bestByCap[p.cap].price)) {
          bestByCap[p.cap] = p;
        }
      }
      const uniqueCaps = Object.values(bestByCap).sort((a: any, b: any) => b.cap - a.cap);

      while (remaining > 0) {
        let best = uniqueCaps.find((p: any) => p.cap <= remaining);
        if (!best) {
          const larger = [...uniqueCaps].sort((a: any, b: any) => a.cap - b.cap);
          best = larger.find((p: any) => p.cap >= remaining);
        }
        if (!best) break;
        selectedStructures.push(best);
        remaining -= best.cap;
      }
    } else if (matchedEsts.length > 0) {
      selectedStructures.push(matchedEsts[0]);
    }

    if (forcedIncludeStructure && selectedStructures.length === 0) {
      continue;
    }

    let profileQty = 0;
    let profileProd: any = null;

    if (forcedIncludeStructure) {
      const perfis = ests.filter((p: any) => {
        const n = (p.product?.name || p.descricao || "").toLowerCase();
        return n.includes("perfil") && !n.includes("s/ perfil") && !n.includes("sem perfil");
      });

      if (perfis.length > 0) {
        if (mappedRoof === "metal") {
          profileProd =
            perfis.find((p: any) => {
              const n = (p.product?.name || p.descricao || "").toLowerCase();
              return n.includes("baixo") || n.includes("mini trilho");
            }) || perfis[0];
        } else {
          profileProd =
            perfis.find((p: any) => {
              const n = (p.product?.name || p.descricao || "").toLowerCase();
              return (
                !n.includes("baixo") && !n.includes("mini trilho") && !n.includes("fechamento")
              );
            }) || perfis[0];
        }

        if (mappedRoof === "metal") {
          for (const est of selectedStructures) {
            if (est.cap === 4) profileQty += 10;
            else if (est.cap === 2) profileQty += 5;
            else profileQty += Math.ceil((est.cap || 1) * 2.5);
          }
          if (moduleQ % 2 !== 0) profileQty += 1;
        } else if (mappedRoof === "ground") {
          profileQty = 1;
        } else {
          profileQty = moduleQ % 2 === 0 ? moduleQ : moduleQ + 1;
        }
      }
    }

    let precoEst = 0;
    const estLines: string[] = [];
    if (forcedIncludeStructure && selectedStructures.length > 0) {
      const counts = new Map();
      for (const est of selectedStructures) {
        precoEst += Number(est.price) || 0;
        const name = est.product?.name || est.descricao;
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      for (const [name, count] of counts.entries()) {
        estLines.push(`- Estrutura: ${count}x ${name}`);
      }
    }

    const precoInv = Number(inv.price) || 0;
    const precoMod = (Number(mod.price) || 0) * moduleQ;
    const precoCabPreto = cabPreto ? Number(cabPreto.price) || 0 : 0;
    const precoCabVermelho = cabVermelho ? Number(cabVermelho.price) || 0 : 0;
    const precoCon = con ? (Number(con.price) || 0) * 2 : 0;
    const precoPerfil =
      profileProd && profileQty > 0 ? (Number(profileProd.price) || 0) * profileQty : 0;

    const somaTotal =
      precoInv + precoMod + precoCabPreto + precoCabVermelho + precoCon + precoEst + precoPerfil;

    const structuredItems = [];
    if (inv) {
      const invPrice = Number(inv.price) || 0;
      structuredItems.push({
        productId: inv.product?.id || inv.productId || inv.id || "",
        productName: inv.product?.name || inv.descricao || "Inversor",
        brandName: inv.product?.brand?.name || "",
        categoryName: "inverter",
        quantity: 1,
        unitPrice: invPrice,
        lineTotal: invPrice,
        imageUrl: inv.product?.imageUrl || "",
        specs: inv.product?.specs || {},
      });
    }
    if (mod) {
      const modUnit = Number(mod.price) || 0;
      structuredItems.push({
        productId: mod.product?.id || mod.productId || mod.id || "",
        productName: mod.product?.name || mod.descricao || "Módulo Fotovoltaico",
        brandName: mod.product?.brand?.name || "",
        categoryName: "module",
        quantity: moduleQ,
        unitPrice: modUnit,
        lineTotal: precoMod,
        imageUrl: mod.product?.imageUrl || "",
        specs: mod.product?.specs || {},
      });
    }
    if (forcedIncludeStructure && selectedStructures.length > 0) {
      const estMap = new Map();
      for (const est of selectedStructures) {
        const key =
          est.product?.id || est.productId || est.id || est.product?.name || est.descricao;
        if (!estMap.has(key)) {
          estMap.set(key, { est, count: 0 });
        }
        estMap.get(key).count += 1;
      }
      for (const { est, count } of estMap.values()) {
        const uPrice = Number(est.price) || 0;
        structuredItems.push({
          productId: est.product?.id || est.productId || est.id || "",
          productName: est.product?.name || est.descricao || "Estrutura de Fixação",
          brandName: est.product?.brand?.name || "",
          categoryName: "structure_kit",
          quantity: count,
          unitPrice: uPrice,
          lineTotal: uPrice * count,
          imageUrl: est.product?.imageUrl || "",
          specs: est.product?.specs || {},
        });
      }
    }
    if (profileProd && profileQty > 0) {
      const uPrice = Number(profileProd.price) || 0;
      structuredItems.push({
        productId: profileProd.product?.id || profileProd.productId || profileProd.id || "",
        productName: profileProd.product?.name || profileProd.descricao || "Perfil / Trilho",
        brandName: profileProd.product?.brand?.name || "",
        categoryName: "profile",
        quantity: profileQty,
        unitPrice: uPrice,
        lineTotal: precoPerfil,
        imageUrl: profileProd.product?.imageUrl || "",
        specs: profileProd.product?.specs || {},
      });
    }
    if (cabPreto) {
      const uPrice = Number(cabPreto.price) || 0;
      structuredItems.push({
        productId: cabPreto.product?.id || cabPreto.productId || cabPreto.id || "",
        productName: cabPreto.product?.name || cabPreto.descricao || "Cabo Solar Preto",
        brandName: cabPreto.product?.brand?.name || "",
        categoryName: "dc_cable",
        quantity: 1,
        unitPrice: uPrice,
        lineTotal: precoCabPreto,
        imageUrl: cabPreto.product?.imageUrl || "",
        specs: cabPreto.product?.specs || {},
      });
    }
    if (cabVermelho) {
      const uPrice = Number(cabVermelho.price) || 0;
      structuredItems.push({
        productId: cabVermelho.product?.id || cabVermelho.productId || cabVermelho.id || "",
        productName: cabVermelho.product?.name || cabVermelho.descricao || "Cabo Solar Vermelho",
        brandName: cabVermelho.product?.brand?.name || "",
        categoryName: "dc_cable",
        quantity: 1,
        unitPrice: uPrice,
        lineTotal: precoCabVermelho,
        imageUrl: cabVermelho.product?.imageUrl || "",
        specs: cabVermelho.product?.specs || {},
      });
    }
    if (con) {
      const uPrice = Number(con.price) || 0;
      structuredItems.push({
        productId: con.product?.id || con.productId || con.id || "",
        productName: con.product?.name || con.descricao || "Conectores MC4",
        brandName: con.product?.brand?.name || "",
        categoryName: "connector",
        quantity: 2,
        unitPrice: uPrice,
        lineTotal: precoCon,
        imageUrl: con.product?.imageUrl || "",
        specs: con.product?.specs || {},
      });
    }

    finalQuotes.push({
      distribuidoraId: d.id,
      distribuidora: d.name,
      valor_total_do_kit: `R$ ${somaTotal.toFixed(2).replace(".", ",")}`,
      valor_kit_num: somaTotal,
      potencia_kwp: realKWp,
      itens_estruturados: structuredItems,
      kit_itens_salvos: [
        `- Inversor: ${inv.product?.name || inv.descricao}`,
        `- Módulos: ${moduleQ}x ${mod.product?.name || mod.descricao}`,
        ...estLines,
        profileProd && profileQty > 0
          ? `- Perfil: ${profileQty}x ${profileProd.product?.name || profileProd.descricao}`
          : null,
        cabPreto ? `- Cabo Preto: ${cabPreto.product?.name || cabPreto.descricao}` : null,
        cabVermelho
          ? `- Cabo Vermelho: ${cabVermelho.product?.name || cabVermelho.descricao}`
          : null,
        con ? `- Conectores: 2x ${con.product?.name || con.descricao}` : null,
      ].filter(Boolean),
      info_adicional: `Geração Estimada: ${estGeneration.toFixed(1)} kWh/mês (Kit Real: ${realKWp.toFixed(2)} kWp)`,
    });
  }

  return finalQuotes;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const formattedMessages = (
      await Promise.all(
        messages.map(async (m: any, index: number) => {
          const isLastMessage = index === messages.length - 1;

          if (m.imageUrl) {
            if (!isLastMessage) {
              return {
                role: m.role,
                content: `[Documento/Imagem enviada pelo usuário no início da conversa]`,
              };
            }

            if (m.imageUrl.startsWith("data:application/pdf")) {
              const base64Data = m.imageUrl.split(",")[1];
              const buffer = Buffer.from(base64Data, "base64");
              let extractionContent = "";
              try {
                const result = await extractEnergyBillFromPdfBuffer(buffer);
                extractionContent = `${result.formattedSummary}\n\n[Texto Bruto do PDF para referência complementar]:\n${(result.rawText || "").substring(0, 3000)}`;
              } catch (e: any) {
                console.error("[PDF EXTRACTION ERROR]", e);
                try {
                  const data = await pdfParse(buffer);
                  extractionContent = `Fatura/PDF Extraído:\n${data.text}`;
                } catch {
                  extractionContent = "(Falha ao extrair dados do PDF)";
                }
              }
              return {
                role: m.role,
                content: `${m.content || "Fatura de Energia Anexada:"}\n\n${extractionContent}`,
              };
            }

            let imageExtractionSummary = "";
            try {
              const result = await extractEnergyBillFromImage(m.imageUrl);
              imageExtractionSummary = result.formattedSummary;
            } catch (e: any) {
              console.error("[IMAGE EXTRACTION ERROR]", e);
            }

            const textPart = [m.content || "Fatura de Energia Anexada:", imageExtractionSummary]
              .filter(Boolean)
              .join("\n\n");

            return {
              role: m.role,
              content: textPart,
            };
          }
          let textContent = typeof m.content === "string" ? m.content : "";
          if (m.toolInvocations && Array.isArray(m.toolInvocations)) {
            for (const inv of m.toolInvocations) {
              if (inv.result) {
                const resStr =
                  typeof inv.result === "string" ? inv.result : JSON.stringify(inv.result);
                textContent +=
                  (textContent ? "\n" : "") + `[Ferramenta ${inv.toolName} retornou: ${resStr}]`;
              }
            }
          }

          return { role: m.role, content: textContent || m.content || "" };
        })
      )
    ).filter(
      (m) =>
        m.content &&
        (typeof m.content === "string" ? m.content.trim().length > 0 : m.content.length > 0)
    );

    let integratorCompanyName = "EnergivIA";
    try {
      const session = await auth0.getSession();
      if (session) {
        let token = "";
        try {
          const authResult = await auth0.getAccessToken({
            audience: process.env["AUTH0_AUDIENCE"],
          });
          token = authResult.token || session.accessToken || session.idToken || "";
        } catch (e) {
          token = session.idToken || session.accessToken || "";
        }

        if (token) {
          const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
          const meRes = await fetch(`${baseURL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.organizations && meData.organizations.length > 0) {
              const currentOrg =
                meData.organizations.find((o: any) => o.id === meData.currentOrganizationId) ||
                meData.organizations[0];
              if (currentOrg && currentOrg.name) {
                integratorCompanyName = currentOrg.name;
              }
            } else if (meData.company) {
              integratorCompanyName = meData.company;
            } else if (meData.name) {
              integratorCompanyName = meData.name;
            }
          }
        }
      }
    } catch (e) {
      console.error("Erro ao buscar dados do integrador:", e);
    }

    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
    });
    const currentHour = parseInt(formatter.format(new Date()), 10);
    let saudacao = "Olá";
    if (currentHour >= 5 && currentHour < 12) saudacao = "Bom dia";
    else if (currentHour >= 12 && currentHour < 18) saudacao = "Boa tarde";
    else saudacao = "Boa noite";

    const dynamicSystemPrompt = systemPrompt
      .replace(/\[SAUDACAO\]/g, saudacao)
      .replace(/\[EMPRESA\]/g, integratorCompanyName);

    const result = await streamText({
      model: openai("gpt-4o"),
      system: dynamicSystemPrompt,
      messages: formattedMessages,
      tools: {
        gerar_cotacao_distribuidor: tool({
          description:
            "Usa o motor de cálculo da EnergivIA para dimensionar os componentes físicos e puxar orçamentos REAIS cruzando todos os distribuidores ativos.",
          parameters: z.object({
            monthlyConsumption: z
              .any()
              .optional()
              .describe(
                "OBRIGATÓRIO: Consumo mensal (kWh) extraído da fatura. Passe o valor exato em número."
              ),
            targetKWp: z
              .any()
              .optional()
              .describe("Potência alvo do sistema em kWp. Pode ser número ou string."),
            targetModules: z
              .number()
              .optional()
              .describe(
                "Quantidade exata de módulos alvo, se o usuário pedir (ex: 'coloque 5 módulos')."
              ),
            location: z.string().optional().describe("Cidade e Estado"),
            roofType: z
              .string()
              .describe(
                "Tipo de telhado. OBRIGATÓRIO (ex: '2', 'fibrocimento', 'metal', 'ceramica')."
              ),
            cidade: z.string().optional().describe("Nome da cidade para o motor calcular HSP"),
            estado: z
              .string()
              .optional()
              .describe("Sigla do estado (UF) para o motor calcular HSP"),
          }),
          execute: async (args: any) => {
            try {
              let token = "";
              try {
                const session = await auth0.getSession();
                if (session) {
                  try {
                    const authResult = await auth0.getAccessToken({
                      audience: process.env["AUTH0_AUDIENCE"],
                    });
                    token = authResult.token || session.accessToken || session.idToken || "";
                  } catch (e) {
                    token = session.idToken || session.accessToken || "";
                  }
                }
              } catch (e) {
                console.warn("Sessão Auth0 não encontrada:", e);
              }

              const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
              const headers: any = {};
              if (token) headers["Authorization"] = `Bearer ${token}`;

              const finalQuotes = await calculateDistributorQuotes({
                baseURL,
                headers,
                messages,
                ...args,
              });

              return {
                success: true,
                ofertasDistribuidores:
                  finalQuotes.length > 0
                    ? finalQuotes
                    : "Nenhum distribuidor retornou kits com estoque na API.",
              };
            } catch (e: any) {
              return {
                success: false,
                ofertasDistribuidores: "Falha ao buscar distribuidores da API real. " + e.message,
              };
            }
          },
        }),
        cadastrar_cliente_crm: tool({
          description:
            "Registra um novo cliente/lead no CRM da plataforma EnergivIA, salva a cotação e anexa o PDF da fatura.",
          parameters: z.object({
            nomeDoCliente: z.string().describe("Nome do cliente final extraído da conversa"),
            numeroWhatsapp: z.string().describe("WhatsApp numérico do cliente"),
            cotacaoSelecionada: z
              .string()
              .optional()
              .describe("Detalhes da cotação/kit escolhido para salvar no card do cliente"),
          }),
          execute: async (args: any) => {
            try {
              let rawNome = args.nomeDoCliente || args.clientName || args.nome || "";
              let rawWhatsapp = args.numeroWhatsapp || args.clientWhatsapp || args.whatsapp || "";
              const cotacao = String(args.cotacaoSelecionada || "").trim();

              if (
                !rawNome ||
                !rawWhatsapp ||
                String(rawNome).toLowerCase().includes("undefined") ||
                String(rawNome).includes("null")
              ) {
                const userMsgs = messages.filter((m: any) => m.role === "user");
                if (userMsgs.length >= 2) {
                  const lastMsg = userMsgs[userMsgs.length - 1].content;
                  const penultMsg = userMsgs[userMsgs.length - 2].content;
                  if (typeof lastMsg === "string" && typeof penultMsg === "string") {
                    rawWhatsapp = lastMsg;
                    rawNome = penultMsg;
                  }
                }
              }

              const nome = String(rawNome).trim();
              const whatsapp = String(rawWhatsapp).trim();

              let token = "";
              try {
                const session = await auth0.getSession();
                if (session) {
                  try {
                    const authResult = await auth0.getAccessToken({
                      audience: process.env["AUTH0_AUDIENCE"],
                    });
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
                return {
                  success: true,
                  message: `Diga EXATAMENTE isto: "O sistema não encontrou um token válido na sua sessão. Por favor, faça login novamente."`,
                };
              }

              if (nome.length < 2) {
                return {
                  success: true,
                  message: `Diga EXATAMENTE isto: "Tentei cadastrar mas a ferramenta não encontrou o nome do cliente no histórico. Por favor, tente fornecer o nome e o whatsapp juntos em uma única mensagem."`,
                };
              }

              if (whatsapp.length < 8) {
                return {
                  success: true,
                  message: `Diga EXATAMENTE isto: "Preciso que me confirme o WhatsApp novamente com DDD, pois o valor '${whatsapp}' recebido foi inválido."`,
                };
              }

              const res = await fetch(`${baseURL}/leads`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                const errText = await res.text().catch(() => "");
                return {
                  success: true,
                  message: `Diga EXATAMENTE isto: "Falha na criação do Lead. Status ${res.status}. Detalhes: ${errText.substring(0, 150)}"`,
                };
              }

              const leadData = await res.json();
              const leadId = leadData.id;

              // Create Deal
              const dealPayload = {
                title: `Sistema Fotovoltaico - ${nome}`,
                stage: "NEGOTIATION",
              };

              const resDeal = await fetch(`${baseURL}/leads/${leadId}/deals`, {
                method: "POST",
                headers,
                body: JSON.stringify(dealPayload),
              });

              if (!resDeal.ok) {
                const errTextDeal = await resDeal.text().catch(() => "");
                return {
                  success: true,
                  message: `Diga EXATAMENTE isto: "Cliente criado, mas falha ao criar o card de negociação. Status ${resDeal.status}. Detalhes: ${errTextDeal.substring(0, 150)}"`,
                };
              }

              // Adicionar nota com a cotação
              if (cotacao) {
                await fetch(`${baseURL}/leads/${leadId}/activity`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    kind: "NOTE",
                    text: `Cotação escolhida no Chat:\n\n${cotacao}`,
                  }),
                });
              }

              // Procurar a fatura (PDF ou Imagem) no histórico e fazer upload
              try {
                let fileToUpload = null;
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].imageUrl) {
                    fileToUpload = messages[i].imageUrl;
                    break;
                  }
                }

                if (fileToUpload) {
                  const match = fileToUpload.match(/^data:(.+);base64,(.+)$/);
                  if (match) {
                    const mimeType = match[1];
                    const base64Data = match[2];
                    const buffer = Buffer.from(base64Data, "base64");
                    const ext =
                      mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1] || "png";
                    const fileName = `fatura_${leadId}.${ext}`;

                    const presignRes = await fetch(
                      `${baseURL}/leads/${leadId}/energy-bills/presign`,
                      {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ fileName, contentType: mimeType }),
                      }
                    );

                    if (presignRes.ok) {
                      const presignData = await presignRes.json();
                      const uploadRes = await fetch(presignData.uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": mimeType },
                        body: buffer,
                      });
                      if (uploadRes.ok) {
                        await fetch(`${baseURL}/leads/${leadId}/energy-bills`, {
                          method: "POST",
                          headers,
                          body: JSON.stringify({ fileUrl: presignData.fileUrl, fileName }),
                        });
                      }
                    }
                  }
                }
              } catch (uploadErr) {
                console.error("Erro ao subir fatura no chat:", uploadErr);
              }

              return {
                success: true,
                leadId,
                message: `Cliente, Cotação e Fatura registrados com sucesso! [MENSAGEM DE SISTEMA PARA A IA: O LEAD_ID GERADO É '${leadId}'. SALVE ISSO AGORA!] Diga para o usuário EXATAMENTE isto: 'Cadastro e Card de Negociação criados com sucesso na plataforma, incluindo a sua fatura e cotação! Se precisar de algo mais, a equipe da EnergivIA está à disposição.'`,
              };
            } catch (e: any) {
              return {
                success: true,
                message: `Diga EXATAMENTE isto: "Erro fatal de conexão: ${e.message}"`,
              };
            }
          },
        }),
        listar_templates_proposta: tool({
          description:
            "Busca os modelos de template de proposta disponíveis na plataforma para que o usuário possa escolher um pelo número.",
          parameters: z.object({
            leadId: z
              .string()
              .describe(
                "O ID do cliente recém-cadastrado. OBRIGATÓRIO passar ele aqui para o sistema memorizar."
              ),
          }),
          execute: async (args: any) => {
            try {
              const session = await auth0.getSession();
              if (!session) return { success: false, message: "Sessão Auth0 não encontrada." };
              let token = "";
              try {
                const authResult = await auth0.getAccessToken({
                  audience: process.env["AUTH0_AUDIENCE"],
                });
                token = authResult.token || session.accessToken || session.idToken || "";
              } catch (e) {
                token = session.idToken || session.accessToken || "";
              }
              const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
              const res = await fetch(`${baseURL}/proposal-templates`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error("Falha ao buscar templates");
              const templates = await res.json();
              const activeTemplates = (Array.isArray(templates) ? templates : []).filter(
                (t: any) => t && t.status !== "ARCHIVED" && !t.deletedAt
              );

              if (activeTemplates.length === 0) {
                return {
                  success: true,
                  message:
                    "Diga EXATAMENTE isto: Nenhum template de proposta encontrado na sua conta. Crie um em Configurações > Templates de Proposta.",
                };
              }

              const list = activeTemplates
                .map((t: any, i: number) => `${i + 1} - ${t.name} (ID: ${t.id})`)
                .join("\n");

              return {
                success: true,
                templates: list,
                message: `Diga para o usuário escolher o número do template desejado. Apresente apenas a lista com Número e Nome. Lembrete INTERNO vitalício para você: o leadId do cliente é '${args.leadId || "não-fornecido"}'. Guarde esse ID para passar para gerar_proposta_crm.`,
              };
            } catch (e: any) {
              return { success: false, message: `Erro: ${e.message}` };
            }
          },
        }),
        gerar_proposta_crm: tool({
          description:
            "Gera a proposta a partir do kit selecionado, cria o dimensionamento, a simulação e atrela ao lead criado.",
          parameters: z.object({
            leadId: z.string().describe("O ID do cliente/lead (retornado no passo anterior)."),
            templateId: z.string().describe("O ID do template escolhido pelo usuário."),
            distributorId: z.string().optional().describe("O ID da distribuidora do kit cotado."),
            consumoMensalKwh: z.number().describe("O consumo médio mensal do cliente em kWh."),
            potenciaSistemaKw: z.number().describe("A potência real do kit em kWp."),
            valorKitTotal: z.number().describe("O valor total do kit em Reais (R$)."),
            kitItems: z
              .array(
                z.object({
                  productId: z.string().optional().describe("ID do produto, se houver."),
                  productName: z.string().describe("Nome do produto/equipamento."),
                  brandName: z.string().optional().describe("Marca do produto."),
                  quantity: z.number().describe("Quantidade."),
                  unitPrice: z.number().describe("Preço unitário em R$."),
                  lineTotal: z.number().describe("Total da linha em R$."),
                  categoryName: z.string().optional().describe("Categoria do produto."),
                  imageUrl: z.string().optional().describe("URL da imagem do equipamento."),
                  specs: z.record(z.any()).optional().describe("Especificações do equipamento."),
                })
              )
              .optional()
              .describe("Lista de itens do kit cotado na conversa."),
          }),
          execute: async (args: any) => {
            try {
              const session = await auth0.getSession();
              if (!session) return { success: false, message: "Sessão Auth0 não encontrada." };
              let token = "";
              try {
                const authResult = await auth0.getAccessToken({
                  audience: process.env["AUTH0_AUDIENCE"],
                });
                token = authResult.token || session.accessToken || session.idToken || "";
              } catch (e) {
                token = session.idToken || session.accessToken || "";
              }

              const headers: any = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              };
              const baseURL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

              // 1. Get the Deal ID for the Lead

              let finalLeadId = args.leadId;
              if (!finalLeadId || finalLeadId === "undefined" || finalLeadId.trim() === "") {
                const latestRes = await fetch(`${baseURL}/leads?page=1&pageSize=1`, { headers });
                if (latestRes.ok) {
                  const latestData = await latestRes.json();
                  if (latestData?.data && latestData.data.length > 0) {
                    finalLeadId = latestData.data[0].id;
                  } else if (latestData?.items && latestData.items.length > 0) {
                    finalLeadId = latestData.items[0].id;
                  } else if (Array.isArray(latestData) && latestData.length > 0) {
                    finalLeadId = latestData[0].id;
                  }
                }
              }
              if (!finalLeadId || finalLeadId === "undefined") {
                return {
                  success: false,
                  message: `Não foi possível identificar o cliente (nenhum lead recente foi encontrado para atrelar). ID recebido: ${args.leadId}`,
                };
              }
              const leadRes = await fetch(`${baseURL}/leads/${finalLeadId}`, { headers });

              if (!leadRes.ok) {
                const errTxt = await leadRes.text();
                return {
                  success: false,
                  message: `Falha ao encontrar o cliente no sistema. LeadID: ${args.leadId}. Status: ${leadRes.status}. Detalhes: ${errTxt.substring(0, 100)}`,
                };
              }
              const leadData = await leadRes.json();
              if (!leadData.deals || leadData.deals.length === 0) {
                return { success: false, message: "Nenhuma negociação aberta para este cliente." };
              }
              const dealId = leadData.deals[0].id;

              // 2. Resolve Kit Items, Subtotal, SystemKwp and DistributorId
              let systemKwp = Number(args.potenciaSistemaKw) || 0;
              let equipmentSubtotalBrl = Number(args.valorKitTotal) || 0;
              let rawKitItems: any[] = args.kitItems ?? [];
              let chosenDistributorId = args.distributorId || undefined;

              // If kit items are empty or equipmentSubtotalBrl <= 0, auto-resolve quotes from catalog
              if (rawKitItems.length === 0 || equipmentSubtotalBrl <= 0 || systemKwp <= 0) {
                try {
                  const calculatedQuotes = await calculateDistributorQuotes({
                    baseURL,
                    headers,
                    messages,
                    monthlyConsumption: args.consumoMensalKwh,
                    targetKWp: args.potenciaSistemaKw,
                  });

                  if (calculatedQuotes.length > 0) {
                    let selectedQuote = calculatedQuotes[0];
                    if (chosenDistributorId) {
                      const match = calculatedQuotes.find(
                        (q: any) => q.distribuidoraId === chosenDistributorId
                      );
                      if (match) selectedQuote = match;
                    } else {
                      const userTexts = messages
                        .filter((m: any) => m.role === "user")
                        .map((m: any) =>
                          typeof m.content === "string" ? m.content.toLowerCase() : ""
                        );
                      for (let i = userTexts.length - 1; i >= 0; i--) {
                        const text = userTexts[i];
                        if (
                          text.includes("2") ||
                          (calculatedQuotes[1] &&
                            text.includes(calculatedQuotes[1].distribuidora.toLowerCase()))
                        ) {
                          if (calculatedQuotes[1]) {
                            selectedQuote = calculatedQuotes[1];
                            break;
                          }
                        } else if (
                          text.includes("3") ||
                          (calculatedQuotes[2] &&
                            text.includes(calculatedQuotes[2].distribuidora.toLowerCase()))
                        ) {
                          if (calculatedQuotes[2]) {
                            selectedQuote = calculatedQuotes[2];
                            break;
                          }
                        } else if (
                          text.includes("1") ||
                          (calculatedQuotes[0] &&
                            text.includes(calculatedQuotes[0].distribuidora.toLowerCase()))
                        ) {
                          selectedQuote = calculatedQuotes[0];
                          break;
                        }
                      }
                    }

                    if (selectedQuote) {
                      if (!chosenDistributorId && selectedQuote.distribuidoraId) {
                        chosenDistributorId = selectedQuote.distribuidoraId;
                      }
                      if (equipmentSubtotalBrl <= 0 && selectedQuote.valor_kit_num) {
                        equipmentSubtotalBrl = selectedQuote.valor_kit_num;
                      }
                      if (systemKwp <= 0 && selectedQuote.potencia_kwp) {
                        systemKwp = selectedQuote.potencia_kwp;
                      }
                      if (rawKitItems.length === 0 && selectedQuote.itens_estruturados?.length) {
                        rawKitItems = selectedQuote.itens_estruturados;
                      }
                    }
                  }
                } catch (calcErr) {
                  console.warn("Falha ao re-calcular cotações na proposta:", calcErr);
                }
              }

              // 3. Buscar cost-rules (mão de obra, margem etc) cadastradas pelo integrador
              let costRules: any[] = [];
              try {
                const costRulesRes = await fetch(`${baseURL}/cost-rules`, { headers });
                if (costRulesRes.ok) {
                  costRules = await costRulesRes.json();
                }
              } catch (e) {
                console.warn("Falha ao buscar cost rules:", e);
              }

              const costCalc = computeProjectCostSection(
                equipmentSubtotalBrl,
                systemKwp,
                costRules
              );
              const quotedSaleBrl =
                costCalc.computedSaleFromCostRulesBrl > 0
                  ? costCalc.computedSaleFromCostRulesBrl
                  : equipmentSubtotalBrl > 0
                    ? equipmentSubtotalBrl
                    : 10000;

              // 4. Create Sizing
              const sizingInput = {
                monthlyConsumptionKwh: Number(args.consumoMensalKwh) || 300,
              };
              const sizingRes = await fetch(`${baseURL}/leads/${finalLeadId}/sizing`, {
                method: "POST",
                headers,
                body: JSON.stringify({ input: sizingInput, name: "Dimensionamento IA" }),
              });
              if (!sizingRes.ok) {
                const errTxt = await sizingRes.text();
                return {
                  success: false,
                  message: `Falha ao criar dimensionamento. Status: ${sizingRes.status}. Detalhes: ${errTxt.substring(0, 100)}`,
                };
              }
              const sizingData = await sizingRes.json();

              // 5. Create Simulation
              const simulationInput = {
                systemSizeKw: systemKwp || 3,
                investmentAmount: Math.round(quotedSaleBrl),
                financingType: "CASH",
                sizing: sizingInput,
              };
              const simRes = await fetch(`${baseURL}/leads/${finalLeadId}/simulations`, {
                method: "POST",
                headers,
                body: JSON.stringify({ input: simulationInput, name: "Simulação IA" }),
              });
              if (!simRes.ok) {
                const errTxt = await simRes.text();
                return {
                  success: false,
                  message: `Falha ao criar simulação. Status: ${simRes.status}. Detalhes: ${errTxt.substring(0, 100)}`,
                };
              }
              const simData = await simRes.json();

              // 6. Build kitItems from conversation / distributor quote
              const kitItemsMapped = rawKitItems.map((item: any) => ({
                productId: item.productId || "",
                productName: item.productName || "Equipamento",
                brandName: item.brandName || "",
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                lineTotal:
                  Number(item.lineTotal) ||
                  (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1) ||
                  0,
                categoryName: item.categoryName || "equipment",
                imageUrl: item.imageUrl || undefined,
                specs: item.specs || undefined,
              }));

              const integratorSnapshot = {
                version: 1 as const,
                kitItems: kitItemsMapped,
                equipmentSubtotalBrl,
                quotedSaleBrl,
                systemPowerKw: systemKwp,
                sourceType: "distributor" as const,
                distributorId: chosenDistributorId,
                projectCostLines: costCalc.projectCostLines,
                defaultEssentialCostNames: costCalc.defaultEssentialCostNames,
                computedSaleFromCostRulesBrl: quotedSaleBrl,
              };

              // 6. Create Proposal with full renderedData
              const propPayload = {
                simulationId: simData.id,
                title: `Proposta - ${leadData.name}`,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                proposalTemplateId: args.templateId,
                renderedData: { integrator: integratorSnapshot },
              };
              const propRes = await fetch(`${baseURL}/deals/${dealId}/proposals`, {
                method: "POST",
                headers,
                body: JSON.stringify(propPayload),
              });
              if (!propRes.ok) {
                const errText = await propRes.text();
                return {
                  success: false,
                  message: `Falha ao gerar proposta (Status ${propRes.status}): ${errText.substring(0, 200)} | Payload enviado: templateId=${args.templateId}, simulationId=${simData.id}, dealId=${dealId}`,
                };
              }
              const propData = await propRes.json();
              const originHeader = req.headers.get("origin") || req.headers.get("referer");
              let baseUrlForLinks = process.env["NEXT_PUBLIC_APP_URL"];
              if (!baseUrlForLinks && originHeader) {
                try {
                  const parsed = new URL(originHeader);
                  baseUrlForLinks = parsed.origin;
                } catch {}
              }
              if (!baseUrlForLinks) {
                const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
                const proto = req.headers.get("x-forwarded-proto") || "http";
                if (host) {
                  baseUrlForLinks = `${proto}://${host}`;
                }
              }
              if (!baseUrlForLinks) {
                baseUrlForLinks = "https://app.energivia.com.br";
              }

              const proposalUrl = `${baseUrlForLinks}/proposta/${propData.id}`;

              return {
                success: true,
                urlDaProposta: proposalUrl,
                message: `SUCESSO! Link real da proposta gerada: ${proposalUrl}`,
              };
            } catch (e: any) {
              return { success: false, message: `Erro ao gerar proposta: ${e.message}` };
            }
          },
        }),
      },
      stopWhen: isStepCount(5),
      onError: (err) => {
        console.error("[STREAMTEXT ERROR]", err);
      },
      onFinish: async (event) => {},
    });

    return result.toUIMessageStreamResponse({
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error: any) {
    console.error("Erro na API de Chat:", error);
    return new Response(
      `Desculpe, ocorreu um erro interno: ${error?.message}. Por favor, tente novamente.`,
      {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
      }
    );
  }
}
