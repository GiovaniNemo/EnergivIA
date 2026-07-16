import "./instrument";
import * as Sentry from "@sentry/node";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { BillParsingService } from "./services/bill-parsing.service";
import { PdfGenerationService } from "./services/pdf-generation.service";

const apiEnvDir = path.join(__dirname, "..", "..", "api");
loadEnv({ path: path.join(apiEnvDir, ".env") });
loadEnv({ path: path.join(apiEnvDir, ".env.local"), override: true });

const HARD_REQUIRED = ["DATABASE_URL"] as const;
const SOFT_REQUIRED: ReadonlyArray<{ name: string; feature: string }> = [
  { name: "AWS_S3_BUCKET", feature: "upload de PDFs gerados" },
];

function assertProductionEnv(): void {
  if (process.env["NODE_ENV"] !== "production") return;
  const missingHard = HARD_REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missingHard.length > 0) {
    console.error(`[FATAL] Worker env críticas faltando — abort: ${missingHard.join(", ")}`);
    process.exit(1);
  }
  const missingSoft = SOFT_REQUIRED.filter((cfg) => !process.env[cfg.name]?.trim());
  if (missingSoft.length > 0) {
    console.warn(
      `[WARN] Worker env opcionais ausentes — jobs afetados:\n` +
        missingSoft.map((cfg) => `  - ${cfg.name}: ${cfg.feature}`).join("\n")
    );
  }
}

async function bootstrap() {
  assertProductionEnv();
  console.log("Worker starting...");

  const billParsing = new BillParsingService();
  const pdfGeneration = new PdfGenerationService();

  const reportJobError = (job: string) => (err: unknown) => {
    Sentry.captureException(err, { tags: { worker_job: job } });
    console.error(`[worker:${job}]`, err);
  };

  setInterval(() => {
    void billParsing.processNext().catch(reportJobError("bill-parsing"));
  }, 30_000);

  setInterval(() => {
    void pdfGeneration.processNext().catch(reportJobError("pdf-generation"));
  }, 30_000);

  console.log("Worker ready. Polling for jobs (mocked).");
}

void bootstrap();
