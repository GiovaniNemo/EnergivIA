import "./instrument";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const apiEnvDir = path.join(__dirname, "..", "..", "api");
loadEnv({ path: path.join(apiEnvDir, ".env") });
loadEnv({ path: path.join(apiEnvDir, ".env.local"), override: true });

async function bootstrap() {
  console.log(
    "[Worker] O processamento e geração de PDF foi centralizado diretamente na API NestJS (PdfRendererService) com concorrência controlada."
  );
  console.log(
    "[Worker] O serviço worker foi colocado em modo suspenso/standby. Para economizar custos de infraestrutura no Railway, este serviço pode ser pausado ou deletado com segurança."
  );

  // Mantém o processo vivo sem consumo de CPU ou polling desnecessário
  const keepAlive = setInterval(() => {}, 86_400_000);
  process.on("SIGINT", () => clearInterval(keepAlive));
  process.on("SIGTERM", () => clearInterval(keepAlive));
}

void bootstrap();
