import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DistributorsService } from "./distributors.service";
import { CreateDistributorDto } from "./dto/create-distributor.dto";
import { UpdateDistributorDto } from "./dto/update-distributor.dto";
import { CreateDistributorProductDto } from "./dto/create-distributor-product.dto";
import { QueryDistributorProductsDto } from "./dto/query-distributor-products.dto";
import { BulkDistributorProductsDto } from "./dto/bulk-distributor-products.dto";
import { EdeltecService } from "./integrations/edeltec.service";
import { SpreadsheetImportService } from "./spreadsheet-import.service";

@Controller("distributors")
export class DistributorsController {
  constructor(
    private readonly distributorsService: DistributorsService,
    private readonly edeltecService: EdeltecService,
    private readonly spreadsheetImportService: SpreadsheetImportService
  ) {}

  @Post(":id/sync")
  syncCatalog(@Param("id", ParseUUIDPipe) id: string) {
    return this.edeltecService.syncCatalog(id);
  }

  @Post(":id/upload-spreadsheet")
  @UseInterceptors(FileInterceptor("file"))
  uploadSpreadsheet(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new Error("Arquivo não fornecido.");
    }
    return this.spreadsheetImportService.importSpreadsheet(id, file.buffer, file.originalname);
  }

  @Get(":id/import-logs/latest")
  getLatestImportLog(@Param("id", ParseUUIDPipe) id: string) {
    return this.spreadsheetImportService.getLatestImportLog(id);
  }

  @Patch("import-logs/:logId/dismiss-generic/:productId")
  dismissGenericInLog(
    @Param("logId", ParseUUIDPipe) logId: string,
    @Param("productId", ParseUUIDPipe) productId: string
  ) {
    return this.spreadsheetImportService.dismissGenericInLog(logId, productId);
  }

  @Patch("products/:id/brand")
  updateProductBrand(@Param("id", ParseUUIDPipe) id: string, @Body() body: { brandId: string }) {
    return this.spreadsheetImportService.updateProductBrand(id, body.brandId);
  }

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
