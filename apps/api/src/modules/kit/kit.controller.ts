import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { KitGenerationService } from "./kit-generation.service";
import { GenerateKitDto, KitAlternativesDto } from "./dto/generate-kit.dto";
import { formatKitForWhatsApp } from "./whatsapp-formatter.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { OptionalTenantId } from "../../common/decorators/tenant-id.decorator";

@Controller("generate-kit")
@UseGuards(UnifiedAuthGuard)
export class KitController {
  constructor(private readonly kitGeneration: KitGenerationService) {}

  @Post("source-options")
  async listKitSourceOptions(
    @Body() dto: GenerateKitDto,
    @OptionalTenantId() organizationId: string | undefined
  ) {
    return this.kitGeneration.listKitSourceOptions(
      {
        system_kw: dto.system_kw,
        roof_type: dto.roof_type,
        preferred_brand: dto.preferred_brand,
        inverter_type: dto.inverter_type,
        string_box_id: dto.string_box_id,
        target_inverter_qty: dto.target_inverter_qty,
        monthly_yield: dto.monthly_yield,
      },
      organizationId
    );
  }

  @Post("alternatives")
  async listKitAlternatives(
    @Body() dto: KitAlternativesDto,
    @OptionalTenantId() organizationId: string | undefined
  ) {
    return this.kitGeneration.listKitAlternatives(
      {
        system_kw: dto.system_kw,
        roof_type: dto.roof_type,
        preferred_brand: dto.preferred_brand,
        supplier_id: dto.supplier_id,
        stock_owner_org_id: dto.own_stock ? organizationId : undefined,
        pinned_module_id: dto.pinned_module_id,
        pinned_inverter_id: dto.pinned_inverter_id,
        inverter_type: dto.inverter_type,
        grid_topology: dto.grid_topology,
        string_box_id: dto.string_box_id,
        target_inverter_qty: dto.target_inverter_qty,
        monthly_yield: dto.monthly_yield,
      },
      dto.category,
      {
        includeOtherSources: dto.include_other_sources,
        organizationId,
      }
    );
  }

  @Post("whatsapp-preview")
  async generateKitWhatsAppPreview(
    @Body() dto: GenerateKitDto,
    @OptionalTenantId() organizationId: string | undefined
  ) {
    const result = await this.kitGeneration.generateSolarKit(
      {
        system_kw: dto.system_kw,
        roof_type: dto.roof_type,
        preferred_brand: dto.preferred_brand,
        supplier_id: dto.supplier_id,
        stock_owner_org_id: dto.own_stock ? organizationId : undefined,
        pinned_module_id: dto.pinned_module_id,
        pinned_inverter_id: dto.pinned_inverter_id,
        inverter_type: dto.inverter_type,
        grid_topology: dto.grid_topology,
        string_box_id: dto.string_box_id,
        target_inverter_qty: dto.target_inverter_qty,
        monthly_yield: dto.monthly_yield,
      },
      organizationId
    );
    return {
      json: result,
      whatsapp_message: formatKitForWhatsApp(result),
    };
  }

  @Post("distributor-tiers")
  async generateDistributorTiers(
    @Body() dto: GenerateKitDto,
    @OptionalTenantId() organizationId: string | undefined
  ) {
    const res = await this.kitGeneration.generateDistributorTiers(
      {
        system_kw: dto.system_kw,
        roof_type: dto.roof_type,
        preferred_brand: dto.preferred_brand,
        supplier_id: dto.supplier_id,
        stock_owner_org_id: dto.own_stock ? organizationId : undefined,
        pinned_module_id: dto.pinned_module_id,
        pinned_inverter_id: dto.pinned_inverter_id,
        inverter_type: dto.inverter_type,
        grid_topology: dto.grid_topology,
        string_box_id: dto.string_box_id,
        target_inverter_qty: dto.target_inverter_qty,
        monthly_yield: dto.monthly_yield,
      },
      organizationId
    );
    return {
      tiers: res.tiers.map((t) => ({
        ...t,
        whatsapp_message: t.whatsapp_message || formatKitForWhatsApp(t.kit_result),
      })),
    };
  }
}
