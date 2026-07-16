import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";
import { StockService } from "./stock.service";
import { CreateStockItemDto } from "./dto/create-stock-item.dto";
import { UpdateStockItemDto } from "./dto/update-stock-item.dto";

@Controller("stock")
@UseGuards(UnifiedAuthGuard)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  list(@TenantId() organizationId: string, @CurrentUser() user: JwtPayload) {
    return this.stock.findAll(organizationId, user.sub);
  }

  @Get("products")
  searchProducts(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtPayload,
    @Query("search") search?: string,
    @Query("category") category?: string
  ) {
    return this.stock.searchProducts(organizationId, user.sub, { search, category });
  }

  @Get("freight")
  getFreightRules(@TenantId() organizationId: string, @CurrentUser() user: JwtPayload) {
    return this.stock.getFreightRules(organizationId, user.sub);
  }

  @Put("freight")
  setFreightRules(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { rules: Array<{ state: string; value: number }> }
  ) {
    return this.stock.setFreightRules(organizationId, user.sub, body?.rules ?? []);
  }

  @Post()
  create(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStockItemDto
  ) {
    return this.stock.create(organizationId, user.sub, dto);
  }

  @Put(":id")
  update(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStockItemDto
  ) {
    return this.stock.update(organizationId, id, user.sub, dto);
  }

  @Delete(":id")
  remove(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.stock.remove(organizationId, id, user.sub);
  }

  @Get(":id/movements")
  movements(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.stock.listMovements(organizationId, id, user.sub);
  }
}
