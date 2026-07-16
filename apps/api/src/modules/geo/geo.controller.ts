import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { GeoService } from "./geo.service";

@Controller("geo")
@UseGuards(UnifiedAuthGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get("states")
  listStates() {
    return this.geoService.listStates();
  }

  @Get("cities")
  listCities(@Query("stateId") stateId?: string) {
    if (!stateId?.trim()) {
      throw new BadRequestException("O identificador do estado (stateId) é obrigatório.");
    }
    return this.geoService.listCities(stateId);
  }
}
