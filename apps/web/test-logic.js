const mockEdeltec = {
    id: 1,
    name: "Edeltec",
    nome: "Edeltec",
    products: [
        { price: 600, descricao: "Módulo Solar 610W Monocristalino", product: { name: "Módulo Solar 610W Monocristalino", specs: { power_w: 610, isc: 13.5 } } },
        { price: 5000, descricao: "Inversor String 5kW 220V", product: { name: "Inversor String 5kW 220V", specs: { max_input_power_w: 7000, mppts: 2, max_input_current_per_mppt: 15 } } },
        { price: 8000, descricao: "Inversor String 10kW 220V", product: { name: "Inversor String 10kW 220V", specs: { max_input_power_w: 13000, mppts: 2, max_input_current_per_mppt: 15 } } },
        { price: 4, descricao: "Cabo Solar Preto 4mm", product: { name: "Cabo Solar Preto 4mm", specs: {} } },
        { price: 4, descricao: "Cabo Solar Vermelho 4mm", product: { name: "Cabo Solar Vermelho 4mm", specs: {} } },
        { price: 15, descricao: "Conector MC4 Par", product: { name: "Conector MC4 Par", specs: {} } },
        { price: 250, descricao: "Estrutura Metálica para Telhado Cerâmica (Colonial)", product: { name: "Estrutura Metálica para Telhado Cerâmica (Colonial)", specs: {} } },
        { price: 200, descricao: "Estrutura Metálica para Telhado Fibromadeira", product: { name: "Estrutura Metálica para Telhado Fibromadeira", specs: {} } },
        { price: 300, descricao: "Estrutura Metálica para Laje", product: { name: "Estrutura Metálica para Laje", specs: {} } },
        { price: 400, descricao: "Estrutura de Solo", product: { name: "Estrutura de Solo", specs: {} } }
    ]
};

const finalTargetKWp = 6.2; // roughly what a 799 kWh / 5h / 30 might be

const invs = mockEdeltec.products.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('inversor'));
const mods = mockEdeltec.products.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('módulo'));
const cabs = mockEdeltec.products.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('cabo'));
const cons = mockEdeltec.products.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('conector'));
const ests = mockEdeltec.products.filter(p => p.price > 0 && JSON.stringify(p).toLowerCase().includes('estrutura'));

const validMods = mods.filter(m => m.product.specs && m.product.specs.isc && m.product.specs.power_w);
const mod = validMods.length > 0 ? validMods[0] : mods[0];
const modPowerW = mod.product.specs ? (Number(mod.product.specs.power_w) || 550) : 550;
const moduleQ = Math.ceil((finalTargetKWp * 1000) / modPowerW);
const totalDcPower = modPowerW * moduleQ;
const modIsc = mod.product.specs ? (Number(mod.product.specs.isc) || 0) : 0;

console.log("Mods:", moduleQ, totalDcPower, modIsc);

let validInvs = [];
for (const invObj of invs) {
    const specs = invObj.product.specs;
    const name = (invObj.product?.name || invObj.descricao || "").toUpperCase();
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
    const overloadFactor = isSaj ? 2.0 : 1.3;

    console.log("Testing Inversor", name, invKWp, specs, overloadFactor);

    if (specs && specs.max_input_current && specs.max_dc_power) {
        console.log("Has full specs");
    } else {
        // Sem specs, aplica overload pelo nome
        console.log("Checking overload", totalDcPower, invKWp * 1000 * overloadFactor);
        if (totalDcPower > (invKWp * 1000) * overloadFactor) continue;
    }

    if (totalDcPower < (invKWp * 1000) * 0.7) {
        console.log("Underload check failed for", invKWp, totalDcPower);
        continue;
    }
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

console.log("Valid Invs:", validInvs);
