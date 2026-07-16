import { Injectable } from "@nestjs/common";
import { normalizeGeoName, parseBillLocation } from "@energivia/proposal-economia";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  listStates() {
    return this.prisma.state.findMany({
      select: {
        id: true,
        uf: true,
        name: true,
        ibgeCode: true,
      },
      orderBy: { name: "asc" },
    });
  }

  listCities(stateId: string) {
    return this.prisma.city.findMany({
      where: { stateId },
      select: {
        id: true,
        name: true,
        ibgeCode: true,
        stateId: true,
        solarResource: true,
      },
      orderBy: { name: "asc" },
    });
  }

  findCityById(id: string) {
    return this.prisma.city.findFirst({
      where: { id },
      select: { id: true, name: true, solarResource: true },
    });
  }

  async findCityByLocationString(location: string) {
    const { cityName, uf } = parseBillLocation(location);
    if (!cityName?.trim() || !uf) return null;
    const target = normalizeGeoName(cityName);
    const state = await this.prisma.state.findUnique({
      where: { uf: uf.toUpperCase() },
      select: { id: true },
    });
    if (!state) return null;
    const cities = await this.prisma.city.findMany({
      where: { stateId: state.id },
      select: { id: true, name: true, solarResource: true },
    });
    for (const c of cities) {
      if (normalizeGeoName(c.name) === target) {
        return c;
      }
    }
    return null;
  }
}
