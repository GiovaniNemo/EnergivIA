import { Controller, Get, Post, Put, Delete, Body, Param } from "@nestjs/common";
import { PlansService } from "./plans.service";
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';
// import { UserRole } from '@prisma/client';

@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async findAll() {
    return this.plansService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.plansService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() data: Record<string, unknown>) {
    return this.plansService.create(data);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @Put(":id")
  async update(@Param("id") id: string, @Body() data: Record<string, unknown>) {
    return this.plansService.update(id, data);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.plansService.deactivate(id);
  }
}
