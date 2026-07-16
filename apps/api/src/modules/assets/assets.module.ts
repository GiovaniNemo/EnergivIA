import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AssetsController } from "./assets.controller";
import { ImageSearchService } from "./image-search.service";
import { ImageIngestService } from "./image-ingest.service";

@Module({
  imports: [ConfigModule],
  controllers: [AssetsController],
  providers: [ImageSearchService, ImageIngestService],
  exports: [ImageSearchService, ImageIngestService],
})
export class AssetsModule {}
