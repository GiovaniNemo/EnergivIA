import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UploadsService } from "./uploads.service";
import { CreatePresignedUrlDto } from "./dto/create-presigned-url.dto";

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("presigned-url")
  @Throttle({ medium: { ttl: 60_000, limit: 10 } })
  createPresignedUrl(@Body() dto: CreatePresignedUrlDto) {
    return this.uploadsService.createPresignedUrl(dto);
  }
}
