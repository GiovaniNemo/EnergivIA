import type { ModuleSpec, StringInverterSpec, MicroInverterSpec } from "../product-specs";
import type {
  ProductWithSpecs,
  StringConfiguration,
  StringSizingResult,
  MicroSizingResult,
  SizingResult,
} from "./types";

export interface SolarSizingInput {
  system_kw: number;
  preferred_module_brand?: string;
  preferred_module_id?: string;
  preferred_inverter_brands?: string[];
  target_inverter_qty?: number;
  modules: ProductWithSpecs<ModuleSpec>[];
  stringInverters: ProductWithSpecs<StringInverterSpec>[];
  microInverters: ProductWithSpecs<MicroInverterSpec>[];
}

function selectMicroInverter(
  microInverters: ProductWithSpecs<MicroInverterSpec>[],
  module: ProductWithSpecs<ModuleSpec>,
  preferredInverterBrands?: string[]
): ProductWithSpecs<MicroInverterSpec> | null {
  const compatible = microInverters.filter(
    (m) =>
      module.specs.voc <= m.specs.max_input_voltage &&
      module.specs.imp <= m.specs.max_input_current &&
      module.specs.power_w <= m.specs.max_module_power &&
      module.specs.power_w >= m.specs.min_module_power
  );
  if (compatible.length === 0) return null;
  const prefs = preferredInverterBrands ?? [];
  const matchesPref = (brand: string) =>
    prefs.length === 0 || prefs.some((p) => brand.toLowerCase().includes(p.toLowerCase()));

  compatible.sort((a, b) => {
    if (prefs.length > 0) {
      const aPref = matchesPref(a.brandName) ? 1 : 0;
      const bPref = matchesPref(b.brandName) ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
    }
    return a.specs.max_module_power - b.specs.max_module_power;
  });
  return compatible[0] ?? null;
}

function computeStringConfiguration(
  module: ProductWithSpecs<ModuleSpec>,
  inverter: ProductWithSpecs<StringInverterSpec>,
  moduleQuantity: number
): { config: StringConfiguration; validated: StringSizingResult["validated"] } {
  const inv = inverter.specs;
  const mod = module.specs;

  const maxModulesPerString = Math.floor(inv.max_dc_voltage / mod.voc);
  const minModulesPerString = Math.ceil(inv.mppt_voltage_min / mod.vmp);

  const dcPower = moduleQuantity * mod.power_w;
  const acPower = inv.nominal_power_w || inv.max_dc_power / 1.4;
  const dcAcRatio = dcPower / acPower;

  const isPowerExceeded = dcPower > inv.max_dc_power;
  const ratioOk =
    !isPowerExceeded &&
    dcAcRatio >= (inv.recommended_dc_ac_ratio_min || 1.0) &&
    dcAcRatio <= (inv.recommended_dc_ac_ratio_max || 1.5);

  const upperBound = Math.min(maxModulesPerString, moduleQuantity);
  for (let mps = upperBound; mps >= minModulesPerString; mps--) {
    const stringCount = Math.ceil(moduleQuantity / mps);
    const maxStringsPerMppt = Math.ceil(stringCount / (inv.mppt_count || 1));
    const maxCurrentOnOneMppt = mod.imp * maxStringsPerMppt;
    const currentOk = maxCurrentOnOneMppt <= inv.max_input_current;
    const actualMps = Math.floor(moduleQuantity / stringCount);
    if (currentOk && ratioOk) {
      return {
        config: {
          modules_per_string: actualMps,
          string_count: stringCount,
          total_modules: moduleQuantity,
          dc_power_w: dcPower,
          dc_ac_ratio: dcAcRatio,
        },
        validated: { voltage: true, current: true, dc_ac_ratio: true },
      };
    }
  }

  const modulesPerString = Math.min(maxModulesPerString, moduleQuantity);
  const stringCount = Math.ceil(moduleQuantity / (modulesPerString || 1));
  const maxStringsPerMppt = Math.ceil(stringCount / (inv.mppt_count || 1));
  const maxCurrentOnOneMppt = mod.imp * maxStringsPerMppt;

  return {
    config: {
      modules_per_string: modulesPerString || moduleQuantity,
      string_count: stringCount,
      total_modules: moduleQuantity,
      dc_power_w: dcPower,
      dc_ac_ratio: dcAcRatio,
    },
    validated: {
      voltage: true,
      current: maxCurrentOnOneMppt <= inv.max_input_current,
      dc_ac_ratio: ratioOk,
    },
  };
}

function trySizeStringInverters(
  modules: ProductWithSpecs<ModuleSpec>[],
  inverters: ProductWithSpecs<StringInverterSpec>[],
  systemPowerW: number,
  inverterQty: number,
  preferredInvBrands: string[]
): StringSizingResult | null {
  const perInverterPowerW = systemPowerW / inverterQty;
  const maxAllowedInverterNominalW = Math.max(perInverterPowerW * 1.6, 6000);

  const candidateInverters = inverters.filter((inv) => {
    const nominalW = inv.specs.nominal_power_w || inv.specs.max_dc_power / 1.3;
    const powerMinOk = inv.specs.max_dc_power >= perInverterPowerW * 0.7;
    const powerMaxOk = nominalW <= maxAllowedInverterNominalW;
    return powerMinOk && powerMaxOk;
  });

  const getInvRank = (brand: string) => {
    if (preferredInvBrands.length === 0) return 0;
    const bLower = brand.toLowerCase().trim();
    const idx = preferredInvBrands.findIndex(
      (p) => bLower.includes(p.toLowerCase()) || p.toLowerCase().includes(bLower)
    );
    return idx === -1 ? 9999 : idx;
  };

  candidateInverters.sort((a, b) => {
    if (preferredInvBrands.length > 0) {
      const aRank = getInvRank(a.brandName);
      const bRank = getInvRank(b.brandName);
      if (aRank !== bRank) return aRank - bRank;
    }
    return (
      Math.abs(a.specs.max_dc_power - perInverterPowerW) -
      Math.abs(b.specs.max_dc_power - perInverterPowerW)
    );
  });

  for (const module of modules.slice(0, 8)) {
    let totalModuleQuantity = Math.round(systemPowerW / module.specs.power_w);
    let subModuleQuantity = Math.round(totalModuleQuantity / inverterQty);
    if (subModuleQuantity < 4) subModuleQuantity = 4;
    totalModuleQuantity = subModuleQuantity * inverterQty;

    // 1. Configuração com ratio ideal
    for (const stringInverter of candidateInverters) {
      const isSmallInverter = stringInverter.specs.max_dc_power <= 10000;
      const finalSubModuleQuantity = isSmallInverter
        ? Math.max(subModuleQuantity, 4)
        : subModuleQuantity;
      const finalTotalModules = finalSubModuleQuantity * inverterQty;

      const { config, validated } = computeStringConfiguration(
        module,
        stringInverter,
        finalSubModuleQuantity
      );
      const isPowerExceeded = config.dc_power_w > stringInverter.specs.max_dc_power;

      if (validated.voltage && validated.current && validated.dc_ac_ratio && !isPowerExceeded) {
        return {
          module,
          inverter: stringInverter,
          module_quantity: finalTotalModules,
          inverter_quantity: inverterQty,
          string_configuration: {
            modules_per_string: config.modules_per_string,
            string_count: config.string_count * inverterQty,
            total_modules: finalTotalModules,
            dc_power_w: config.dc_power_w * inverterQty,
            dc_ac_ratio: config.dc_ac_ratio,
          },
          validated,
        };
      }
    }

    // 2. Fallback de ratio aceitável (0.7 a 1.7)
    for (const stringInverter of candidateInverters) {
      const isSmallInverter = stringInverter.specs.max_dc_power <= 10000;
      const finalSubModuleQuantity = isSmallInverter
        ? Math.max(subModuleQuantity, 4)
        : subModuleQuantity;
      const finalTotalModules = finalSubModuleQuantity * inverterQty;

      const { config, validated } = computeStringConfiguration(
        module,
        stringInverter,
        finalSubModuleQuantity
      );
      const isPowerExceeded = config.dc_power_w > stringInverter.specs.max_dc_power;
      const ratioAcceptable = config.dc_ac_ratio >= 0.7 && config.dc_ac_ratio <= 1.7;

      if (validated.voltage && validated.current && !isPowerExceeded && ratioAcceptable) {
        return {
          module,
          inverter: stringInverter,
          module_quantity: finalTotalModules,
          inverter_quantity: inverterQty,
          string_configuration: {
            modules_per_string: config.modules_per_string,
            string_count: config.string_count * inverterQty,
            total_modules: finalTotalModules,
            dc_power_w: config.dc_power_w * inverterQty,
            dc_ac_ratio: config.dc_ac_ratio,
          },
          validated: { ...validated, dc_ac_ratio: true },
        };
      }
    }
  }

  return null;
}

export function sizeSolarSystem(input: SolarSizingInput): SizingResult | null {
  const systemPowerW = input.system_kw * 1000;

  let modules = [...input.modules];
  if (input.preferred_module_id) {
    modules = modules.filter((m) => m.id === input.preferred_module_id);
  } else if (input.preferred_module_brand) {
    const prefBrandLower = input.preferred_module_brand.toLowerCase().trim();
    modules.sort((a, b) => {
      const aPref = a.brandName.toLowerCase().trim() === prefBrandLower ? 1 : 0;
      const bPref = b.brandName.toLowerCase().trim() === prefBrandLower ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });
  }
  if (modules.length === 0) return null;

  const preferredInvBrands = input.preferred_inverter_brands ?? [];
  const manualQty =
    input.target_inverter_qty && input.target_inverter_qty >= 1
      ? Math.round(input.target_inverter_qty)
      : null;

  if (manualQty !== null) {
    // Integrador escolheu quantidade manual explícita
    const manualResult = trySizeStringInverters(
      modules,
      input.stringInverters,
      systemPowerW,
      manualQty,
      preferredInvBrands
    );
    if (manualResult) return manualResult;
  } else {
    // 1. Prioridade Padrão: Tentar estritamente 1 único inversor
    const singleResult = trySizeStringInverters(
      modules,
      input.stringInverters,
      systemPowerW,
      1,
      preferredInvBrands
    );
    if (singleResult) return singleResult;

    // 2. Fallback Automático: Apenas se exceder os limites do maior inversor cadastrado,
    // calcula o menor N de inversores idênticos da mesma marca para cobrir a usina.
    // Para usinas comerciais e de grande porte (>= 200 kWp / MWp / GWp), escala a quantidade de inversores de alta potência.
    const allStringInvs = input.stringInverters;
    const highestDcPower = Math.max(...allStringInvs.map((i) => i.specs.max_dc_power || 0), 1);

    // Se a usina for grande, prioriza inversores de grande porte (>= 30kW ou >= 50% da maior potência disponível)
    const minPowerFilter =
      input.system_kw >= 1000
        ? Math.min(highestDcPower, 60_000)
        : input.system_kw >= 200
          ? Math.min(highestDcPower, 30_000)
          : 0;

    const filteredStringInvs =
      minPowerFilter > 0
        ? allStringInvs.filter((inv) => (inv.specs.max_dc_power || 0) >= minPowerFilter)
        : allStringInvs;

    const usableInverters = filteredStringInvs.length > 0 ? filteredStringInvs : allStringInvs;
    const maxInvDc = Math.max(...usableInverters.map((i) => i.specs.max_dc_power || 0), 1);

    const minN = Math.max(2, Math.ceil(systemPowerW / (maxInvDc * 1.35)));
    const maxAutoN =
      input.system_kw < 200 ? 6 : Math.max(6, Math.ceil(systemPowerW / (maxInvDc * 0.75)) + 2);

    const endN = Math.min(maxAutoN, minN + 8);

    const viableAutoInverters = usableInverters.filter(
      (inv) => (inv.specs.max_dc_power || 0) * endN >= systemPowerW * 0.7
    );

    if (viableAutoInverters.length > 0) {
      for (let n = minN; n <= endN; n++) {
        const multiResult = trySizeStringInverters(
          modules,
          viableAutoInverters,
          systemPowerW,
          n,
          preferredInvBrands
        );
        if (multiResult) return multiResult;
      }
    }
  }

  // 3. Fallback ou escolha por microinversor
  for (const module of modules.slice(0, 8)) {
    let moduleQuantity = Math.round(systemPowerW / module.specs.power_w);
    if (moduleQuantity < 4) moduleQuantity = 4;

    const microInverter = selectMicroInverter(
      input.microInverters,
      module,
      input.preferred_inverter_brands
    );
    if (microInverter) {
      const channels = microInverter.specs.channels;
      const microQuantity = Math.ceil(moduleQuantity / channels);
      const voltageOk = module.specs.voc <= microInverter.specs.max_input_voltage;
      const currentOk = module.specs.imp <= microInverter.specs.max_input_current;
      const powerOk =
        module.specs.power_w <= microInverter.specs.max_module_power &&
        module.specs.power_w >= microInverter.specs.min_module_power;

      if (voltageOk && currentOk && powerOk) {
        return {
          module,
          inverter: microInverter,
          module_quantity: moduleQuantity,
          microinverter_quantity: microQuantity,
          validated: { voltage: voltageOk, current: currentOk, power: powerOk },
        } satisfies MicroSizingResult;
      }
    }
  }

  return null;
}
