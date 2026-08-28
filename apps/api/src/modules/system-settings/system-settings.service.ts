import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSetting(key: string): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? "";
  }

  async setSetting(key: string, value: string): Promise<string> {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return setting.value;
  }

  async getBranding() {
    const brandLogoUrl = await this.getSetting("brandLogoUrl");
    const brandLogoDarkUrl = await this.getSetting("brandLogoDarkUrl");
    const brandLogoLightUrl = await this.getSetting("brandLogoLightUrl");
    const whatsappLogoUrl = await this.getSetting("whatsappLogoUrl");
    return {
      brandLogoUrl: brandLogoUrl || "",
      brandLogoDarkUrl: brandLogoDarkUrl || "",
      brandLogoLightUrl: brandLogoLightUrl || "",
      whatsappLogoUrl: whatsappLogoUrl || "",
    };
  }

  async setBranding(
    brandLogoUrl: string,
    whatsappLogoUrl: string,
    brandLogoDarkUrl?: string,
    brandLogoLightUrl?: string
  ) {
    await this.setSetting("brandLogoUrl", brandLogoUrl || "");
    if (brandLogoDarkUrl !== undefined) {
      await this.setSetting("brandLogoDarkUrl", brandLogoDarkUrl || "");
    }
    if (brandLogoLightUrl !== undefined) {
      await this.setSetting("brandLogoLightUrl", brandLogoLightUrl || "");
    }
    await this.setSetting("whatsappLogoUrl", whatsappLogoUrl || "");
    return {
      brandLogoUrl,
      brandLogoDarkUrl: brandLogoDarkUrl || brandLogoUrl,
      brandLogoLightUrl: brandLogoLightUrl || brandLogoUrl,
      whatsappLogoUrl,
    };
  }
}
