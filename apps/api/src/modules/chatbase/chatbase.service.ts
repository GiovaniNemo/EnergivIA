import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

@Injectable()
export class ChatbaseService {
  constructor(private readonly config: ConfigService) {}

  getIdentityHash(userId: string): { userId: string; userHash: string } {
    const secret = this.config.get<string>("CHATBASE_SECRET_KEY");
    if (!secret) {
      throw new ServiceUnavailableException(
        "Chatbase não está configurado (CHATBASE_SECRET_KEY ausente)."
      );
    }
    const userHash = createHmac("sha256", secret).update(userId).digest("hex");
    return { userId, userHash };
  }
}
