import { Controller, Post, Body } from "@nestjs/common";
import { AiExtractionService } from "./ai-extraction.service";

@Controller("products/ai")
export class AiExtractionController {
  constructor(private readonly aiExtractionService: AiExtractionService) {}

  @Post("extract-datasheet")
  async extractDatasheet(@Body() body: { datasheetUrl: string }) {
    return this.aiExtractionService.extractSpecsFromDatasheetUrl(body.datasheetUrl);
  }
}
