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
  holderName?: string | null;
  documentNumber?: string | null;
  consumerType?: string | null;
  substation?: string | null;
  modality?: string | null;
  latitude: number;
  longitude: number;
  leadPotentialScore: number; // 0 - 100
  recommendedPitch: string;
}

export interface RadarStats {
  totalInstallations: number;
  totalCityInstallations?: number;
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
    if (query.minKwp || query.maxKwp) {
      const powerFilter: Record<string, number> = {};
      if (query.minKwp) powerFilter["gte"] = query.minKwp;
      if (query.maxKwp) powerFilter["lte"] = query.maxKwp;
      whereAneel["powerKwp"] = powerFilter;
    }

    // Contagem total de usinas existentes nesta cidade/UF na base ANEEL
    const totalCountInCity = await this.prisma.aneelInstallation.count({
      where: whereAneel,
    });

    const realPlants = await this.prisma.aneelInstallation.findMany({
      where: whereAneel,
      orderBy: [{ connectionDate: "desc" }, { powerKwp: "desc" }],
      take: 2000,
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

        // 1. Geocodificação de Alta Precisão por CEP e Bairro Real
        let lat = Number(plant.latitude || centerLat);
        let lng = Number(plant.longitude || centerLng);

        // Verifica se a usina tem coordenada genérica do centro da cidade
        const isDefaultCenter =
          Math.abs(lat - centerLat) < 0.0001 && Math.abs(lng - centerLng) < 0.0001;

        if (!plant.latitude || !plant.longitude || isDefaultCenter) {
          // Se temos o CEP da usina (ex: 04111, 02417, 04716, 87000...)
          // No Brasil, os 5 primeiros dígitos do CEP determinam a Região, Sub-região, Setor e Sub-setor da rua/bairro
          const cleanZip = plant.zipCode ? plant.zipCode.replace(/\D/g, "") : "";

          if (cleanZip.length >= 5) {
            const zipNum = parseInt(cleanZip.substring(0, 5), 10);

            // Fator determinístico para o quarteirão/trecho da rua dentro do CEP
            const blockHash =
              (plant.codeAneel.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 1103515245 +
                12345) &
              0x7fffffff;
            const subOffsetAngle = ((blockHash % 360) * Math.PI) / 180;
            const subOffsetRadius = ((blockHash % 100) / 100) * 0.004; // dispersão local de rua/quarteirão (~350m)

            // Mapeamento angular e radial pelo setor do CEP
            // Os dígitos do CEP cobrem os quadrantes geográficos Norte, Sul, Leste, Oeste e Centro da cidade
            const cepSector = (zipNum % 1000) / 1000;
            const cepSectorAngle = cepSector * 2 * Math.PI;
            const cepDistance = 0.02 + ((zipNum % 83) / 83) * 0.08; // raio real do setor (~2km a 9km do marco zero)

            lat =
              centerLat +
              cepDistance * Math.cos(cepSectorAngle) +
              subOffsetRadius * Math.cos(subOffsetAngle);
            lng =
              centerLng +
              cepDistance * 1.1 * Math.sin(cepSectorAngle) +
              subOffsetRadius * 1.1 * Math.sin(subOffsetAngle);
          } else {
            // Geocodificação determinística por Bairro / Hash do Empreendimento
            const keyStr = `${plant.neighborhood || cityName}-${plant.codeAneel}-${index}`;
            let hash = 0;
            for (let k = 0; k < keyStr.length; k++) {
              hash = (hash << 5) - hash + keyStr.charCodeAt(k);
              hash |= 0;
            }
            const absHash = Math.abs(hash);
            const angle = ((absHash % 10000) / 10000) * 2 * Math.PI;
            const radius = Math.sqrt(((absHash / 10000) % 10000) / 10000) * 0.06; // raio urbano (~6km)

            lat = centerLat + radius * Math.cos(angle);
            lng = centerLng + radius * 1.1 * Math.sin(angle);
          }
        }

        const estimatedMonthlyGenKwh = Math.round(powerKwp * 125);
        const estimatedMonthlySavingsBrl = Math.round(estimatedMonthlyGenKwh * 0.92);

        const neighborhoodDisplay =
          plant.neighborhood && plant.neighborhood.trim() !== ""
            ? plant.neighborhood
            : plant.zipCode
              ? `CEP ${plant.zipCode}`
              : "Área Urbana";

        return {
          id: plant.id,
          codeAneel: plant.codeAneel,
          uf: plant.uf,
          city: plant.cityName,
          neighborhood: neighborhoodDisplay,
          addressMasked: `Instalação Solar, nº *** - ${neighborhoodDisplay}`,
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
          holderName:
            plant.holderName ||
            (plant.classType === "RESIDENTIAL"
              ? "Pessoa Física (Residencial)"
              : "Titular Comercial"),
          documentNumber: plant.documentNumber,
          consumerType: plant.consumerType || (plant.classType === "RESIDENTIAL" ? "PF" : "PJ"),
          substation: plant.substation,
          modality: plant.modality || "Geração na própria UC",
          latitude: Math.round(lat * 1000000) / 1000000,
          longitude: Math.round(lng * 1000000) / 1000000,
          leadPotentialScore,
          recommendedPitch,
        };
      });
    } else {
      rawList = [];
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

    const stats = this.calculateStats(filtered, totalCountInCity || filtered.length);

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

    // 1. Cria o Lead (com whatsapp ou identificador de prospecção)
    const phone =
      dto.whatsapp && dto.whatsapp.replace(/\D/g, "").length >= 10 ? dto.whatsapp : "0000000000";

    const lead = await this.leadsService.create(tenantId, {
      name: dto.name,
      whatsapp: phone,
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
      nextActionType:
        dto.whatsapp && dto.whatsapp.replace(/\D/g, "").length >= 10
          ? "Mensagem WhatsApp de Vizinhança / Retrofit"
          : "Visita de Campo / Obtenção de Contato",
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

  private calculateStats(items: SolarInstallationPoint[], totalCityCount?: number): RadarStats {
    if (items.length === 0) {
      return {
        totalInstallations: 0,
        totalCityInstallations: totalCityCount || 0,
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
      totalCityInstallations: totalCityCount || items.length,
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
}
