const allDistributors = [{ id: 1, name: "Test Dist" }];
const allProds = [
  { product: { name: "Inversor 5kW", specs: { max_dc_power: 5500 } }, price: 2000 },
  { product: { name: "Módulo 550W", specs: { power_w: 550 } }, price: 500 },
  { product: { name: "Cabo Preto" }, price: 10 },
  { product: { name: "Cabo Vermelho" }, price: 10 },
  { product: { name: "Conector" }, price: 5 },
];

let mappedRoof = "none";
let forcedIncludeStructure = mappedRoof !== "none";
let moduleQ = 10;
let realKWp = 5.5;
let finalTargetKWp = 5;
let geracaoPorKwp = 120;
let fatorFace = 1;

const finalQuotes = [];
for (const d of allDistributors) {
  const invs = allProds.filter(
    (p) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("inversor")
  );
  const mods = allProds.filter(
    (p) =>
      p.price > 0 &&
      (JSON.stringify(p).toLowerCase().includes("módulo") ||
        JSON.stringify(p).toLowerCase().includes("modulo") ||
        JSON.stringify(p).toLowerCase().includes("painel"))
  );
  const cabs = allProds.filter(
    (p) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("cabo")
  );
  const cons = allProds.filter(
    (p) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("conector")
  );
  const ests = allProds.filter(
    (p) =>
      p.price > 0 &&
      (JSON.stringify(p).toLowerCase().includes("estrutura") ||
        JSON.stringify(p).toLowerCase().includes("perfil"))
  );

  const validMods = mods.filter((m) => m.product?.specs?.power_w);
  const mod = validMods.length > 0 ? validMods[0] : mods[0];
  if (!mod) {
    console.log("skip mod");
    continue;
  }

  let modPowerW = Number(mod.product?.specs?.power_w);
  const estGeneration = realKWp * geracaoPorKwp * fatorFace;

  let validInvs = [];
  for (const invObj of invs) {
    const specs = invObj.product?.specs;
    const name = (invObj.product?.name || invObj.descricao || "").toUpperCase();

    let invKWp = null;
    const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
    if (match) {
      invKWp = parseFloat(match[1].replace(",", "."));
      if (match[2] === "W") invKWp = invKWp / 1000;
    } else if (specs && specs.max_dc_power) {
      invKWp = Number(specs.max_dc_power) / 1000;
    } else {
      invKWp = finalTargetKWp;
    }

    const ratio = realKWp / invKWp;
    if (ratio < 0.7 || ratio > 1.35) {
      console.log("ratio skip", ratio);
      continue;
    }

    validInvs.push(invObj);
  }

  if (validInvs.length === 0) {
    console.log("no valid invs");
    continue;
  }

  validInvs.sort((a, b) => Number(a.price) - Number(b.price));
  const inv = validInvs[0];
  if (!inv) {
    console.log("no inv");
    continue;
  }

  const cabPreto = cabs.find((c) => JSON.stringify(c).toLowerCase().includes("preto")) || cabs[0];
  const cabVermelho =
    cabs.find((c) => JSON.stringify(c).toLowerCase().includes("vermelho")) ||
    (cabs.length > 1 && cabs[1] !== cabPreto ? cabs[1] : null);
  const con = cons[0];

  const matchedEsts = ests.filter((p) => {
    const n = (p.product?.name || "").toLowerCase();
    const d = (p.descricao || "").toLowerCase();
    const s = n + " " + d;
    if (mappedRoof === "metal") return s.includes("metal") && !s.includes("fibrometal");
    return s.includes(mappedRoof);
  });
  const parsedEsts = matchedEsts
    .map((p) => {
      const n = (p.product?.name || "").toUpperCase();
      const m = n.match(/(\d+)\s*(MOD|PAIN|PLAC)/);
      let cap = m ? parseInt(m[1], 10) : 0;
      return { ...p, cap };
    })
    .filter((p) => p.cap > 0);

  let selectedStructures = [];
  if (parsedEsts.length > 0) {
    let remaining = moduleQ;
    const bestByCap = {};
    for (const p of parsedEsts) {
      if (!bestByCap[p.cap] || Number(p.price) < Number(bestByCap[p.cap].price)) {
        bestByCap[p.cap] = p;
      }
    }
    const uniqueCaps = Object.values(bestByCap).sort((a, b) => b.cap - a.cap);

    while (remaining > 0) {
      let best = uniqueCaps.find((p) => p.cap <= remaining);
      if (!best) {
        const larger = [...uniqueCaps].sort((a, b) => a.cap - b.cap);
        best = larger.find((p) => p.cap >= remaining);
      }
      if (!best) break;
      selectedStructures.push(best);
      remaining -= best.cap;
    }
  } else if (matchedEsts.length > 0) {
    selectedStructures.push(matchedEsts[0]);
  }

  if (forcedIncludeStructure && selectedStructures.length === 0) {
    console.log("forced but no structs");
    continue;
  }

  let profileQty = 0;
  let profileProd = null;

  if (forcedIncludeStructure) {
    const perfis = ests.filter((p) => {
      const n = (p.product?.name || p.descricao || "").toLowerCase();
      return n.includes("perfil") && !n.includes("s/ perfil") && !n.includes("sem perfil");
    });

    if (perfis.length > 0) {
      profileProd = perfis[0];
      profileQty = moduleQ % 2 === 0 ? moduleQ : moduleQ + 1;
    }
  }

  let precoEst = 0;
  const estLines = [];
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

  finalQuotes.push({
    distribuidora: d.name,
    valor_total_do_kit: `R$ ${somaTotal.toFixed(2).replace(".", ",")}`,
    kit_itens_salvos: [
      `- Inversor: ${inv.product?.name || inv.descricao}`,
      `- Módulos: ${moduleQ}x ${mod.product?.name || mod.descricao}`,
      ...estLines,
      profileProd && profileQty > 0
        ? `- Perfil: ${profileQty}x ${profileProd.product?.name || profileProd.descricao}`
        : null,
      cabPreto ? `- Cabo Preto: ${cabPreto.product?.name || cabPreto.descricao}` : null,
      cabVermelho ? `- Cabo Vermelho: ${cabVermelho.product?.name || cabVermelho.descricao}` : null,
      con ? `- Conectores: 2x ${con.product?.name || con.descricao}` : null,
    ].filter(Boolean),
    info_adicional: `Geração Estimada: ${estGeneration.toFixed(1)} kWh/mês (Kit Real: ${realKWp.toFixed(2)} kWp)`,
  });
}
console.log(JSON.stringify(finalQuotes, null, 2));
