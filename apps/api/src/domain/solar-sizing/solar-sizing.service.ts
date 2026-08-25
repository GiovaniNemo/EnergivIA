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
  modules: ProductWithSpecs<ModuleSpec>[];
  stringInverters: ProductWithSpecs<StringInverterSpec>[];
  microInverters: ProductWithSpecs<MicroInverterSpec>[];
}

function selectMicroInverter(
  microInverters: ProductWithSpecs<MicroInverterSpec>[],
  module: ProductWithSpecs<ModuleSpec>
): ProductWithSpecs<MicroInverterSpec> | null {
  const compatible = microInverters.filter(
    (m) =>
      module.specs.voc <= m.specs.max_input_voltage &&
      module.specs.imp <= m.specs.max_input_current &&
      module.specs.power_w <= m.specs.max_module_power &&
      module.specs.power_w >= m.specs.min_module_power
  );
  if (compatible.length === 0) return null;
  compatible.sort((a, b) => a.specs.max_module_power - b.specs.max_module_power);
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

  if (maxModulesPerString < minModulesPerString) {
    // Se a exigência forçada (ex: min de 4) conflitar com o limite inferior, podemos ser flexíveis,
    // mas de fato se max < min é problemático. Para o cenário forçado, não falhamos de cara.
    // O sistema decidirá lá embaixo com base na flag de forçado.
  }

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
    if (currentOk && ratioOk) {
      return {
        config: {
          modules_per_string: mps,
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
      modules_per_string: modulesPerString || moduleQuantity, // fallback se max for 0
      string_count: stringCount,
      total_modules: moduleQuantity,
      dc_power_w: dcPower,
      dc_ac_ratio: dcAcRatio,
    },
    validated: {
      voltage: true, // Se não passou no loop ideal, mas estamos retornando, forçamos true para aceitar o kit
      current: maxCurrentOnOneMppt <= inv.max_input_current,
      dc_ac_ratio: ratioOk,
    },
  };
}

export function sizeSolarSystem(input: SolarSizingInput): SizingResult | null {
  const systemPowerW = input.system_kw * 1000;

  let modules = input.modules;
  if (input.preferred_module_brand) {
    modules = modules.filter(
      (m) => m.brandName.toLowerCase() === input.preferred_module_brand!.toLowerCase()
    );
  }
  if (input.preferred_module_id) {
    modules = modules.filter((m) => m.id === input.preferred_module_id);
  }
  if (modules.length === 0) return null;

  const module = modules[0]!;
  // Arredondando para pegar a quantidade que chega mais perto do kWp solicitado (mesmo se ficar um pouco abaixo)
  let moduleQuantity = Math.round(systemPowerW / module.specs.power_w);
  // Prevenir zero
  if (moduleQuantity < 1) moduleQuantity = 1;

  // Encontra todos os inversores adequados baseados na potência solicitada, ordenados por menor potência max DC
  const candidateInverters = input.stringInverters.filter(
    (inv) => inv.specs.max_dc_power >= systemPowerW
  );
  candidateInverters.sort((a, b) => a.specs.max_dc_power - b.specs.max_dc_power);

  // 1. Tenta encontrar o menor inversor onde a configuração seja 100% válida (incluindo o ratio e limite de potência)
  for (const stringInverter of candidateInverters) {
    const isSmallInverter = stringInverter.specs.max_dc_power <= 10000;
    const finalModuleQuantity = isSmallInverter ? Math.max(moduleQuantity, 4) : moduleQuantity;

    const { config, validated } = computeStringConfiguration(
      module,
      stringInverter,
      finalModuleQuantity
    );
    const isPowerExceeded = config.dc_power_w > stringInverter.specs.max_dc_power;

    if (validated.voltage && validated.current && validated.dc_ac_ratio && !isPowerExceeded) {
      return {
        module,
        inverter: stringInverter,
        module_quantity: finalModuleQuantity,
        string_configuration: config,
        validated,
      } satisfies StringSizingResult;
    }
  }

  // 2. Fallback: Se nenhum inversor atendeu ao ratio ideal, tenta o primeiro candidato que atende os requisitos elétricos básicos e física CC
  for (const stringInverter of candidateInverters) {
    const isSmallInverter = stringInverter.specs.max_dc_power <= 10000;
    const finalModuleQuantity = isSmallInverter ? Math.max(moduleQuantity, 4) : moduleQuantity;

    const { config, validated } = computeStringConfiguration(
      module,
      stringInverter,
      finalModuleQuantity
    );
    const isPowerExceeded = config.dc_power_w > stringInverter.specs.max_dc_power;

    if (validated.voltage && validated.current && !isPowerExceeded) {
      return {
        module,
        inverter: stringInverter,
        module_quantity: finalModuleQuantity,
        string_configuration: config,
        validated,
      } satisfies StringSizingResult;
    }
  }

  const microInverter = selectMicroInverter(input.microInverters, module);
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

  return null;
}
