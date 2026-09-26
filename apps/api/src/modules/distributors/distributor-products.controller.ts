import { Controller, Put, Delete, Body, Param } from "@nestjs/common";
import { DistributorsService } from "./distributors.service";
import { UpdateDistributorProductDto } from "./dto/update-distributor-product.dto";
import { BulkActiveDistributorProductsDto } from "./dto/bulk-active-distributor-products.dto";

@Controller("distributor-products")
export class DistributorProductsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDistributorProductDto) {
    return this.distributorsService.updateDistributorProduct(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.distributorsService.removeDistributorProduct(id);
  }

  @Put("bulk-active/:distributorId")
  bulkUpdateActive(
    @Param("distributorId") distributorId: string,
    @Body() dto: BulkActiveDistributorProductsDto
  ) {
    return this.distributorsService.bulkUpdateDistributorProductsActive(
      distributorId,
      dto.ids,
      Boolean(dto.active)
    );
  }
}
