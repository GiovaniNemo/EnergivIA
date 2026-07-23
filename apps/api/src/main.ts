import "./instrument";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-client-exception.filter";

const HARD_REQUIRED = ["DATABASE_URL", "AUTH0_DOMAIN", "AUTH0_AUDIENCE"] as const;

const SOFT_REQUIRED: ReadonlyArray<{
  name: string;
  feature: string;
  fallback?: string;
}> = [
  { name: "JWT_SECRET", feature: "legacy email/password login" },
  {
    name: "WHATSAPP_APP_SECRET",
    feature: "appsecret_proof no envio de mensagens (Graph API)",
  },
  { name: "AWS_S3_BUCKET", feature: "S3 uploads (proposta, financiamento, faturas)" },
];

function hasEnv(key: string, fallback?: string): boolean {
  if (process.env[key]?.trim()) return true;
  if (fallback && process.env[fallback]?.trim()) return true;
  return false;
}

function assertProductionEnv(): void {
  if (process.env["NODE_ENV"] !== "production") return;

  const missingHard = HARD_REQUIRED.filter((k) => !hasEnv(k));
  if (missingHard.length > 0) {
    console.error(`[FATAL] Env vars críticas faltando — abort: ${missingHard.join(", ")}`);
    process.exit(1);
  }

  const missingSoft = SOFT_REQUIRED.filter((cfg) => !hasEnv(cfg.name, cfg.fallback));
  if (missingSoft.length > 0) {
    console.warn(
      `[WARN] Env vars opcionais ausentes — features afetadas:\n` +
        missingSoft.map((cfg) => `  - ${cfg.name}: ${cfg.feature}`).join("\n")
    );
  }
}

async function bootstrap() {
  assertProductionEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.useGlobalFilters(new PrismaClientExceptionFilter());
  const apiPrefix =
    process.env["API_PREFIX"] ?? (process.env["NODE_ENV"] === "production" ? "" : "api");
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.enableCors({
    origin: process.env["CORS_ORIGIN"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");
  const basePath = apiPrefix ? `/${apiPrefix}` : "";
  console.log(`API running on http://0.0.0.0:${port}${basePath}`);
}

void bootstrap();
