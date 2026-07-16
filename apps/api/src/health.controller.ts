import { Controller, Get, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";
import { PrismaService } from "./prisma/prisma.service";

class SentryTestError extends Error {
  constructor() {
    super("Sentry test error — endpoint /debug-sentry");
  }
}

interface HealthResponse {
  status: "ok" | "degraded";
  uptime: number;
  checks: {
    db: "ok" | "fail";
  };
}

@Controller("health")
@Public()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (err) {
      this.logger.error(
        `health: DB unreachable — ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const response: HealthResponse = {
      status: dbOk ? "ok" : "degraded",
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      checks: { db: dbOk ? "ok" : "fail" },
    };

    if (!dbOk) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return response;
  }

  @Get("debug-sentry")
  debugSentry(): never {
    throw new SentryTestError();
  }
}
