import { Controller, Get, UseGuards } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ChatbaseService } from "./chatbase.service";

@Controller("chatbase")
@UseGuards(UnifiedAuthGuard)
export class ChatbaseController {
  constructor(private readonly chatbase: ChatbaseService) {}

  @Get("identity-hash")
  getIdentityHash(@CurrentUser() user: JwtPayload) {
    return this.chatbase.getIdentityHash(user.sub);
  }
}
