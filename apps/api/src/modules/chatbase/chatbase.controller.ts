import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ChatbaseService } from "./chatbase.service";

@Controller("chatbase")
@UseGuards(UnifiedAuthGuard)
export class ChatbaseController {
  constructor(private readonly chatbase: ChatbaseService) {}

  @Get("identity-hash")
  getIdentityHash(@CurrentUser() user: JwtPayload) {
    return this.chatbase.getIdentityHash(user.sub);
  }

  @Public()
  @Post("lead")
  async createLeadFromChat(@Body() data: { tenantId: string; name: string; whatsapp: string; email?: string; source?: string }) {
    // Rota pública acessível pelo Chatbase para criar leads durante a conversa
    return this.chatbase.createLead(data);
  }
}
