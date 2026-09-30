import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(UnifiedAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  globalSearch(
    @TenantId() tenantId: string,
    @Query("q") query: string,
    @CurrentUser() user?: JwtPayload
  ) {
    return this.searchService.globalSearch(tenantId, query, user);
  }
}
