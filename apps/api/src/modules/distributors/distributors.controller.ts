import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { DistributorsService } from "./distributors.service";
import { CreateDistributorDto } from "./dto/create-distributor.dto";
import { UpdateDistributorDto } from "./dto/update-distributor.dto";
import { CreateDistributorProductDto } from "./dto/create-distributor-product.dto";
import { QueryDistributorProductsDto } from "./dto/query-distributor-products.dto";
import { BulkDistributorProductsDto } from "./dto/bulk-distributor-products.dto";

@Controller("distributors")
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  @Get()
  findAll() {
    return this.distributorsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.distributorsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDistributorDto) {
    return this.distributorsService.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDistributorDto) {
    return this.distributorsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.distributorsService.remove(id);
  }

  @Get(":id/freight")
  getFreightRules(@Param("id", ParseUUIDPipe) id: string) {
    return this.distributorsService.getFreightRules(id);
  }

  @Put(":id/freight")
  setFreightRules(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { rules: Array<{ state: string; value: number }> }
  ) {
    return this.distributorsService.setFreightRules(id, body?.rules ?? []);
  }

  @Get(":id/products")
  findProducts(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: QueryDistributorProductsDto
  ) {
    return this.distributorsService.findProductsByDistributor(id, query);
  }

  @Post(":id/products/bulk")
  bulkAddProducts(@Param("id", ParseUUIDPipe) id: string, @Body() dto: BulkDistributorProductsDto) {
    return this.distributorsService.bulkUpsertDistributorProducts(id, dto.rows);
  }

  @Post(":id/products")
  addProduct(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateDistributorProductDto) {
    return this.distributorsService.addProductToDistributor(id, dto);
  }
}
