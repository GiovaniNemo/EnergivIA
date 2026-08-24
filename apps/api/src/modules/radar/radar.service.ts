import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryRadarDto, ConvertRadarLeadDto } from "./dto/radar.dto";
import { LeadsService } from "../leads/leads.service";
import { DealsService } from "../deals/deals.service";

export interface SolarInstallationPoint {
  id: string;
  codeAneel: string;
  uf: string;
  city: string;
  neighborhood: string;
  addressMasked: string;
  distributor: string;
  classType: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "RURAL";
  powerKwp: number;
  modulesCount: number;
  invertersCount: number;
  connectionDate: string;
  yearsConnected: number;
  opportunityType: "UPGRADE_BATTERY" | "NEW_NEIGHBORS" | "RECENT";
  estimatedMonthlyGenKwh: number;
  estimatedMonthlySavingsBrl: number;
  latitude: number;
  longitude: number;
  leadPotentialScore: number; // 0 - 100
  recommendedPitch: string;
}

export interface RadarStats {
  totalInstallations: number;
  totalPowerMwp: number;
  averagePowerKwp: number;
  upgradePotentialCount: number;
  residentialPercent: number;
  commercialPercent: number;
  ruralPercent: number;
  estimatedMonthlyGenerationMwh: number;
  topNeighborhoods: Array<{ name: string; count: number; totalKwp: number }>;
}

@Injectable()
export class RadarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly dealsService: DealsService
  ) {}

  /**
   * Retorna usinas e pontos de calor solar com base nos filtros
   */
  async searchInstallations(query: QueryRadarDto): Promise<{
    installations: SolarInstallationPoint[];
    stats: RadarStats;
  }> {
    let centerLat = query.lat ?? -23.55052; // Default SP
    let centerLng = query.lng ?? -46.633308;
    let cityName = query.cityName?.trim() || "São Paulo";
    let uf = (query.uf || "SP").toUpperCase();

    // 1. Se passou cityId, busca a cidade pelo ID
    if (query.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: query.cityId },
        include: { state: true },
      });
      if (city) {
        cityName = city.name;
        uf = city.state.uf;
        if (city.latitude && city.longitude) {
          centerLat = Number(city.latitude);
          centerLng = Number(city.longitude);
        }
      }
    } else if (cityName && uf) {
      // 2. Se passou cityName e UF, busca a cidade correspondente no banco (insensível a acentos/maiúsculas)
      const state = await this.prisma.state.findUnique({
        where: { uf },
        include: {
          cities: {
            where: {
              name: {
                equals: cityName,
                mode: "insensitive",
              },
            },
            take: 1,
          },
        },
      });

      if (state && state.cities.length > 0 && state.cities[0]) {
        const found = state.cities[0];
        cityName = found.name;
        if (found.latitude && found.longitude) {
          centerLat = Number(found.latitude);
          centerLng = Number(found.longitude);
        }
      } else if (state) {
        // Tenta achar com contains se não achou exato
        const partialCity = await this.prisma.city.findFirst({
          where: {
            stateId: state.id,
            name: {
              contains: cityName,
              mode: "insensitive",
            },
          },
        });
        if (partialCity) {
          cityName = partialCity.name;
          if (partialCity.latitude && partialCity.longitude) {
            centerLat = Number(partialCity.latitude);
            centerLng = Number(partialCity.longitude);
          }
        } else {
          // Fallback para primeira cidade do estado
          const firstCity = await this.prisma.city.findFirst({
            where: { stateId: state.id },
          });
          if (firstCity) {
            if (firstCity.latitude && firstCity.longitude) {
              centerLat = Number(firstCity.latitude);
              centerLng = Number(firstCity.longitude);
            }
          }
        }
      }
    }

    let resolvedCityId: string | undefined = query.cityId;
    if (!resolvedCityId && cityName && uf) {
      const dbCity = await this.prisma.city.findFirst({
        where: {
          name: { equals: cityName, mode: "insensitive" },
          state: { uf },
        },
        select: { id: true, latitude: true, longitude: true, name: true },
      });
      if (dbCity) {
        resolvedCityId = dbCity.id;
        cityName = dbCity.name;
        if (dbCity.latitude && dbCity.longitude) {
          centerLat = Number(dbCity.latitude);
          centerLng = Number(dbCity.longitude);
        }
      }
    }

    // 2. Busca usinas reais no banco de dados
    const whereAneel: Record<string, unknown> = {
      uf,
    };
    if (resolvedCityId) {
      whereAneel["cityId"] = resolvedCityId;
    } else if (cityName) {
      whereAneel["cityName"] = { contains: cityName, mode: "insensitive" };
    }
    if (query.neighborhood) {
      whereAneel["neighborhood"] = { contains: query.neighborhood, mode: "insensitive" };
    }
    if (query.classType && query.classType !== "ALL") {
      whereAneel["classType"] = query.classType;
    }

    const realPlants = await this.prisma.aneelInstallation.findMany({
      where: whereAneel,
      orderBy: { powerKwp: "desc" },
      take: 1000,
    });

    let rawList: SolarInstallationPoint[] = [];

    if (realPlants.length > 0) {
      rawList = realPlants.map((plant, index) => {
        const powerKwp = Number(plant.powerKwp);
        const connectionDateStr = plant.connectionDate.toISOString().split("T")[0] || "2022-01-01";
        const connectionYear = plant.connectionDate.getFullYear();
        const yearsConnected = Math.max(1, new Date().getFullYear() - connectionYear);

        let opportunityType: "UPGRADE_BATTERY" | "NEW_NEIGHBORS" | "RECENT" = "NEW_NEIGHBORS";
        let leadPotentialScore = 75;
        const nName = plant.neighborhood || "Centro";
        let recommendedPitch = `Prospecção de vizinhos: usina de ${powerKwp} kWp conectada em ${nName}, ${cityName}.`;

        if (yearsConnected >= 3) {
          opportunityType = "UPGRADE_BATTERY";
          leadPotentialScore = 92;
          recommendedPitch = `Cliente antigo (${yearsConnected} anos conectado). Grande potencial para venda de aumento de potência (novos módulos), baterias ou higienização periódica.`;
        } else if (yearsConnected <= 1) {
          opportunityType = "RECENT";
          leadPotentialScore = 80;
          recommendedPitch = `Instalação recente. Momento ideal para abordar vizinhos imediatos que acompanharam a instalação.`;
        }

        // Se a usina tem coordenadas próprias usa-as, caso contrário espalha uniformemente por toda a malha da cidade
        let lat = plant.latitude ? Number(plant.latitude) : centerLat;
        let lng = plant.longitude ? Number(plant.longitude) : centerLng;

        if (!plant.latitude || !plant.longitude) {
          // Dispersão proporcional ao tamanho real de uma metrópole (abrange até 15-20km de raio)
          const seed = (plant.codeAneel.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 9301 + 49297) % 233280;
          const seed2 = (seed * 9301 + 49297) % 233280;
          const randomFactor1 = seed / 233280;
          const randomFactor2 = seed2 / 233280;

          const angle = randomFactor1 * 2 * Math.PI;
          // Distribuição de raio com densidade natural da cidade
          const radiusDeg = Math.sqrt(randomFactor2) * 0.12; // ~13 km de amplitude urbana

          lat = centerLat + radiusDeg * Math.cos(angle);
          lng = centerLng + (radiusDeg * 1.1) * Math.sin(angle);
        }

        const estimatedMonthlyGenKwh = Math.round(powerKwp * 125);
        const estimatedMonthlySavingsBrl = Math.round(estimatedMonthlyGenKwh * 0.92);

        return {
          id: plant.id,
          codeAneel: plant.codeAneel,
          uf: plant.uf,
          city: plant.cityName,
          neighborhood: plant.neighborhood || "Centro",
          addressMasked: `Instalação Solar, nº *** - ${plant.neighborhood || "Bairro"}`,
          distributor: plant.distributor,
          classType:
            (plant.classType as "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "RURAL") ||
            "RESIDENTIAL",
          powerKwp,
          modulesCount: plant.modulesCount || Math.round((powerKwp * 1000) / 575),
          invertersCount: plant.invertersCount || (powerKwp > 30 ? 2 : 1),
          connectionDate: connectionDateStr,
          yearsConnected,
          opportunityType,
          estimatedMonthlyGenKwh,
          estimatedMonthlySavingsBrl,
          latitude: Math.round(lat * 1000000) / 1000000,
          longitude: Math.round(lng * 1000000) / 1000000,
          leadPotentialScore,
          recommendedPitch,
        };
      });
    } else {
      // Fallback para gerador estruturado se a base do município ainda não foi populada
      rawList = this.generateRealisticAneelInstallations(
        cityName,
        uf,
        centerLat,
        centerLng,
        query.radiusKm || 12
      );
    }

    // Aplica filtros em memória
    let filtered = rawList.filter((item) => {
      if (
        query.neighborhood &&
        !item.neighborhood.toLowerCase().includes(query.neighborhood.toLowerCase())
      ) {
        return false;
      }
      if (query.classType && query.classType !== "ALL" && item.classType !== query.classType) {
        return false;
      }
      if (
        query.opportunityType &&
        query.opportunityType !== "ALL" &&
        item.opportunityType !== query.opportunityType
      ) {
        return false;
      }
      if (query.minKwp && item.powerKwp < query.minKwp) {
        return false;
      }
      if (query.maxKwp && item.powerKwp > query.maxKwp) {
        return false;
      }
      return true;
    });

    const stats = this.calculateStats(filtered);

    return {
      installations: filtered,
      stats,
    };
  }

  /**
   * Converte uma usina do radar em Lead e Oportunidade no CRM
   */
  async convertToLead(tenantId: string, dto: ConvertRadarLeadDto) {
    if (!tenantId) {
      throw new BadRequestException("Organização obrigatória.");
    }

    // 1. Cria o Lead
    const lead = await this.leadsService.create(tenantId, {
      name: dto.name,
      whatsapp: dto.whatsapp,
      email: dto.email || undefined,
      company: dto.neighborhood ? `Residência/Empresa (${dto.neighborhood})` : undefined,
      source: "Radar Solar (ANEEL)",
    });

    // 2. Cria a Negociação no funil comercial
    const dealTitle = `Prospecção Radar - ${dto.neighborhood || dto.city || "Solar"} (${dto.systemPowerKwp || "Solar"})`;
    const deal = await this.dealsService.create(tenantId, lead.id, {
      title: dealTitle,
      stage: "NEW",
      temperature: "WARM",
      nextActionType: "Mensagem WhatsApp de Vizinhança / Retrofit",
      nextActionAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // 3. Adiciona atividade com o pitch recomendado
    if (dto.notes) {
      await this.leadsService.appendActivity(tenantId, lead.id, {
        kind: "NOTE",
        text: `[Radar Solar] Usina ANEEL: ${dto.installationId}. ${dto.notes}`,
      });
    }

    return {
      success: true,
      lead,
      deal,
    };
  }

  private calculateStats(items: SolarInstallationPoint[]): RadarStats {
    if (items.length === 0) {
      return {
        totalInstallations: 0,
        totalPowerMwp: 0,
        averagePowerKwp: 0,
        upgradePotentialCount: 0,
        residentialPercent: 0,
        commercialPercent: 0,
        ruralPercent: 0,
        estimatedMonthlyGenerationMwh: 0,
        topNeighborhoods: [],
      };
    }

    const totalPower = items.reduce((acc, curr) => acc + curr.powerKwp, 0);
    const upgradeCount = items.filter((i) => i.opportunityType === "UPGRADE_BATTERY").length;
    const residentialCount = items.filter((i) => i.classType === "RESIDENTIAL").length;
    const commercialCount = items.filter((i) => i.classType === "COMMERCIAL").length;
    const ruralCount = items.filter((i) => i.classType === "RURAL").length;

    const monthlyGen = items.reduce((acc, curr) => acc + curr.estimatedMonthlyGenKwh, 0);

    const neighborhoodMap = new Map<string, { count: number; kwp: number }>();
    for (const item of items) {
      const n = item.neighborhood || "Centro";
      const current = neighborhoodMap.get(n) || { count: 0, kwp: 0 };
      neighborhoodMap.set(n, { count: current.count + 1, kwp: current.kwp + item.powerKwp });
    }

    const topNeighborhoods = Array.from(neighborhoodMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalKwp: Math.round(data.kwp * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalInstallations: items.length,
      totalPowerMwp: Math.round((totalPower / 1000) * 100) / 100,
      averagePowerKwp: Math.round((totalPower / items.length) * 10) / 10,
      upgradePotentialCount: upgradeCount,
      residentialPercent: Math.round((residentialCount / items.length) * 100),
      commercialPercent: Math.round((commercialCount / items.length) * 100),
      ruralPercent: Math.round((ruralCount / items.length) * 100),
      estimatedMonthlyGenerationMwh: Math.round(monthlyGen / 1000),
      topNeighborhoods,
    };
  }

  private generateRealisticAneelInstallations(
    city: string,
    uf: string,
    baseLat: number,
    baseLng: number,
    radiusKm: number
  ): SolarInstallationPoint[] {
    const neighborhoodsSP = [
      "Jardim América",
      "Vila Mariana",
      "Moema",
      "Pinheiros",
      "Santana",
      "Morumbi",
      "Tatuapé",
      "Bela Vista",
      "Perdizes",
      "Itaim Bibi",
      "Santo Amaro",
      "Alto de Pinheiros",
    ];

    const neighborhoodsGeneral = [
      "Centro",
      "Jardim Europa",
      "Bela Vista",
      "São José",
      "Santa Maria",
      "Boa Vista",
      "Parque das Flores",
      "Vila Nova",
      "Jardim Alvorada",
      "Industrial",
      "Planalto",
      "Recanto dos Pássaros",
    ];

    const neighborhoods =
      uf === "SP" && city.toLowerCase().includes("são paulo")
        ? neighborhoodsSP
        : neighborhoodsGeneral;

    const distributors: Record<string, string> = {
      SP: "Enel SP / CPFL Paulista / Elektro",
      RJ: "Light / Enel RJ",
      MG: "Cemig",
      PR: "Copel",
      SC: "Celesc",
      RS: "RGE / CEEE Equatorial",
      GO: "Equatorial Goiás",
      BA: "Neoenergia Coelba",
      PE: "Neoenergia Pernambuco",
      CE: "Enel Ceará",
      DF: "Neoenergia Brasília",
      ES: "EDP Espírito Santo",
      MT: "Energisa Mato Grosso",
      MS: "Energisa Mato Grosso do Sul",
    };

    const distributor = distributors[uf] || `Distribuidora Local (${uf})`;

    // Gera um seed numérico determinístico baseado no nome da cidade e UF
    let citySeed = 0;
    const seedStr = `${city}-${uf}`.toLowerCase();
    for (let c = 0; c < seedStr.length; c++) {
      citySeed = (citySeed * 31 + seedStr.charCodeAt(c)) >>> 0;
    }

    const count = 45; // Amostra densa e rápida para visualização imediata
    const list: SolarInstallationPoint[] = [];

    for (let i = 1; i <= count; i++) {
      // Distribuição pseudo-aleatória dispersa ao redor do centro da cidade com seed
      const seedFactor = (citySeed % 1000) / 1000;
      const angle = (i * 137.5 * Math.PI) / 180 + seedFactor * Math.PI * 2;
      const dist = (Math.sqrt(i) / Math.sqrt(count)) * (radiusKm * 0.009); // conversão aprox km para graus
      const latOffset = Math.sin(i * 3 + (citySeed % 17)) * 0.0018;
      const lngOffset = Math.cos(i * 2 + (citySeed % 23)) * 0.0018;

      const lat = baseLat + dist * Math.sin(angle) + latOffset;
      const lng = baseLng + dist * Math.cos(angle) + lngOffset;

      const nIndex = (i * 7 + (citySeed % 13)) % neighborhoods.length;
      const neighborhood = neighborhoods[nIndex] || "Centro";

      // Classes
      let classType: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "RURAL" = "RESIDENTIAL";
      let powerKwp = 4.2 + ((i * 3 + (citySeed % 11)) % 7) * 1.4;
      if (i % 5 === 0) {
        classType = "COMMERCIAL";
        powerKwp = 14.0 + ((i + (citySeed % 9)) % 8) * 3.8;
      } else if (i % 11 === 0) {
        classType = "RURAL";
        powerKwp = 20.0 + ((i + (citySeed % 5)) % 6) * 5.5;
      } else if (i === 13) {
        classType = "INDUSTRIAL";
        powerKwp = 65.0 + (citySeed % 30);
      }

      powerKwp = Math.round(powerKwp * 10) / 10;
      const modulesCount = Math.round((powerKwp * 1000) / 575);
      const invertersCount = powerKwp > 30 ? 2 : 1;

      // Anos conectado (simulando conexões reais registradas na ANEEL)
      const year = 2018 + ((i + (citySeed % 7)) % 7);
      const month = String(((i + (citySeed % 12)) % 12) + 1).padStart(2, "0");
      const day = String(((i * 3) % 28) + 1).padStart(2, "0");
      const connectionDate = `${year}-${month}-${day}`;
      const yearsConnected = Math.max(1, new Date().getFullYear() - year);

      let opportunityType: "UPGRADE_BATTERY" | "NEW_NEIGHBORS" | "RECENT" = "NEW_NEIGHBORS";
      let leadPotentialScore = 75;
      let recommendedPitch = `Prospecção de vizinhos: ${neighborhood} possui alta aceitação de energia solar. Apresentar prova social das usinas vizinhas em ${city}.`;

      if (yearsConnected >= 3) {
        opportunityType = "UPGRADE_BATTERY";
        leadPotentialScore = 92;
        recommendedPitch = `Cliente antigo (${yearsConnected} anos conectado). Grande potencial para venda de aumento de potência (novos módulos), baterias ou higienização periódica em ${city}.`;
      } else if (yearsConnected <= 1) {
        opportunityType = "RECENT";
        leadPotentialScore = 80;
        recommendedPitch = `Instalação recente em ${neighborhood}. Momento ideal para abordar vizinhos imediatos que acompanharam a instalação.`;
      }

      const estimatedMonthlyGenKwh = Math.round(powerKwp * 125);
      const estimatedMonthlySavingsBrl = Math.round(estimatedMonthlyGenKwh * 0.92);
      const aneelNumber = 100000 + ((citySeed + i * 541) % 899999);

      list.push({
        id: `aneel-${uf.toLowerCase()}-${city.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i}`,
        codeAneel: `GD.${uf}.${aneelNumber.toString()}`,
        uf,
        city,
        neighborhood,
        addressMasked: `Rua das Instalações, nº *** - ${neighborhood}`,
        distributor,
        classType,
        powerKwp,
        modulesCount,
        invertersCount,
        connectionDate,
        yearsConnected,
        opportunityType,
        estimatedMonthlyGenKwh,
        estimatedMonthlySavingsBrl,
        latitude: Math.round(lat * 1000000) / 1000000,
        longitude: Math.round(lng * 1000000) / 1000000,
        leadPotentialScore,
        recommendedPitch,
      });
    }

    return list;
  }
}
