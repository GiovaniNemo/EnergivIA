import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "@/common/guards/unified-auth.guard";
import { SearchImagesDto } from "./dto/search-images.dto";
import { IngestImageDto } from "./dto/ingest-image.dto";
import { ImageSearchService } from "./image-search.service";
import { ImageIngestService } from "./image-ingest.service";

@Controller("assets")
@UseGuards(UnifiedAuthGuard)
export class AssetsController {
  constructor(
    private readonly imageSearchService: ImageSearchService,
    private readonly imageIngestService: ImageIngestService
  ) {}

  @Post("images/search")
  search(@Body() dto: SearchImagesDto) {
    return this.imageSearchService.search(dto);
  }

  @Post("ingest")
  ingest(@Body() dto: IngestImageDto) {
    return this.imageIngestService.ingest(dto);
  }
}
