import { Injectable } from "@nestjs/common";
import { generateSolarKits } from "@energivia/solar-engine";
import type { GenerateSolarKitsInput, GenerateSolarKitsOutput } from "@energivia/shared-types";

@Injectable()
export class SolarService {
  generateKits(input: GenerateSolarKitsInput): GenerateSolarKitsOutput {
    return generateSolarKits(input);
  }
}
