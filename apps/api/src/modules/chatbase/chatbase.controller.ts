import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
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
  async createLeadFromChat(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>
  ) {
    // Rota pública acessível pelo Chatbase para criar leads durante a conversa
    const data = { ...query, ...body };
    return this.chatbase.createLead(
      data as unknown as Parameters<typeof this.chatbase.createLead>[0]
    );
  }

  @Public()
  @Post("proposta")
  async createProposalFromChat(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>
  ) {
    // Rota pública para Chatbase gerar simulação/proposta rápida
    const data = { ...query, ...body };
    return this.chatbase.createFastSimulation(
      data as unknown as Parameters<typeof this.chatbase.createFastSimulation>[0]
    );
  }
}
