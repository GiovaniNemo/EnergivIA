import { Controller, Put, Delete, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { DistributorsService } from "./distributors.service";
import { UpdateDistributorProductDto } from "./dto/update-distributor-product.dto";

@Controller("distributor-products")
export class DistributorProductsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  @Put(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDistributorProductDto) {
    return this.distributorsService.updateDistributorProduct(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.distributorsService.removeDistributorProduct(id);
  }
}
