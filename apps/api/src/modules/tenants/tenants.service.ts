import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

import { softDeleteWhere as soft } from "../../prisma/soft-delete";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, ...soft },
    });
    if (!tenant) throw new NotFoundException("Organização não encontrada.");
    return tenant;
  }
}
