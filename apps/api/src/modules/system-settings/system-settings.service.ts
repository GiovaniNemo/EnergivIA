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
    const whatsappLogoUrl = await this.getSetting("whatsappLogoUrl");
    return { brandLogoUrl, whatsappLogoUrl };
  }

  async setBranding(brandLogoUrl: string, whatsappLogoUrl: string) {
    await this.setSetting("brandLogoUrl", brandLogoUrl || "");
    await this.setSetting("whatsappLogoUrl", whatsappLogoUrl || "");
    return { brandLogoUrl, whatsappLogoUrl };
  }
}
