import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";

@Controller(["plans", "api/plans"])
@SkipTrialLock()
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async findAll(@Query("includeInactive") includeInactive?: string) {
    return this.plansService.findAll(includeInactive === "true" || includeInactive === "1");
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  async create(@Body() data: Record<string, unknown>) {
    return this.plansService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: Record<string, unknown>) {
    return this.plansService.update(id, data);
  }

  @Patch(":id/toggle-active")
  async toggleActive(@Param("id") id: string, @Body() body: { active?: boolean }) {
    return this.plansService.toggleActive(id, body?.active);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.plansService.deactivate(id);
  }
}
