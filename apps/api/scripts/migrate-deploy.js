#!/usr/bin/env node

const { execSync } = require("child_process");

function runMigrate() {
  console.log("🚀 [Pre-Deploy] Preparando execução das migrações do Prisma...");

  // Identifica URL direta do Neon: se DIRECT_URL não estiver explícita,
  // remove "-pooler" da DATABASE_URL para conectar direto ao compute e evitar
  // timeout de advisory lock (P1002) causado pelo PgBouncer em transaction pooling.
  let directUrl = process.env.DIRECT_URL;
  const rawDbUrl = process.env.DATABASE_URL || "";

  if (!directUrl && rawDbUrl) {
    if (rawDbUrl.includes("-pooler.")) {
      directUrl = rawDbUrl.replace("-pooler.", ".");
    }
  }

  const env = { ...process.env };
  if (directUrl) {
    env.DIRECT_URL = directUrl;
    // Para migrate deploy, força também DATABASE_URL na conexão direta
    env.DATABASE_URL = directUrl;
    console.log(
      "ℹ️ [Pre-Deploy] Conexão direta ao PostgreSQL configurada (PgBouncer bypass ativo)."
    );
  }

  try {
    console.log("📦 [Pre-Deploy] Executando: prisma migrate deploy...");
    execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", {
      stdio: "inherit",
      env,
    });
    console.log("✅ [Pre-Deploy] Migrações aplicadas com sucesso!");
    process.exit(0);
  } catch (err) {
    console.warn(
      "⚠️ [Pre-Deploy] Falha ao executar 'prisma migrate deploy'. Verificando integridade do schema..."
    );
    try {
      const statusOutput = execSync("npx prisma migrate status --schema=prisma/schema.prisma", {
        encoding: "utf-8",
        env,
      });
      console.log(statusOutput);

      if (
        statusOutput.includes("Database schema is up to date") ||
        statusOutput.includes("No pending migrations")
      ) {
        console.log(
          "✅ [Pre-Deploy] O schema do banco de dados já está 100% atualizado! Prosseguindo com o deploy com segurança."
        );
        process.exit(0);
      }
    } catch (statusErr) {
      console.error(
        "❌ [Pre-Deploy] Erro ao consultar status das migrações:",
        statusErr instanceof Error ? statusErr.message : String(statusErr)
      );
    }

    console.error(
      "❌ [Pre-Deploy] Erro fatal: existem migrações pendentes que não puderam ser aplicadas."
    );
    process.exit(1);
  }
}

runMigrate();
