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

function selectStringInverter(
  inverters: ProductWithSpecs<StringInverterSpec>[],
  systemPowerW: number
): ProductWithSpecs<StringInverterSpec> | null {
  const adequate = inverters.filter((inv) => inv.specs.max_dc_power >= systemPowerW);
  if (adequate.length === 0) return null;
  adequate.sort((a, b) => a.specs.max_dc_power - b.specs.max_dc_power);
  return adequate[0] ?? null;
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
    return {
      config: {
        modules_per_string: 0,
        string_count: 0,
        total_modules: moduleQuantity,
        dc_power_w: 0,
        dc_ac_ratio: 0,
      },
      validated: { voltage: false, current: false, dc_ac_ratio: false },
    };
  }

  const dcPower = moduleQuantity * mod.power_w;
  const acPower = inv.max_dc_power;
  const dcAcRatio = dcPower / acPower;
  const ratioOk =
    dcAcRatio >= inv.recommended_dc_ac_ratio_min && dcAcRatio <= inv.recommended_dc_ac_ratio_max;

  const upperBound = Math.min(maxModulesPerString, moduleQuantity);
  for (let mps = upperBound; mps >= minModulesPerString; mps--) {
    const stringCount = Math.ceil(moduleQuantity / mps);
    const totalCurrent = mod.imp * stringCount;
    const currentOk = totalCurrent <= inv.max_input_current;
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
  const stringCount = Math.ceil(moduleQuantity / modulesPerString);
  const totalCurrent = mod.imp * stringCount;
  return {
    config: {
      modules_per_string: modulesPerString,
      string_count: stringCount,
      total_modules: moduleQuantity,
      dc_power_w: dcPower,
      dc_ac_ratio: dcAcRatio,
    },
    validated: {
      voltage: true,
      current: totalCurrent <= inv.max_input_current,
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
  const moduleQuantity = Math.ceil(systemPowerW / module.specs.power_w);

  const stringInverter = selectStringInverter(input.stringInverters, systemPowerW);
  if (stringInverter) {
    const { config, validated } = computeStringConfiguration(
      module,
      stringInverter,
      moduleQuantity
    );
    if (validated.voltage && validated.current && validated.dc_ac_ratio) {
      return {
        module,
        inverter: stringInverter,
        module_quantity: moduleQuantity,
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
