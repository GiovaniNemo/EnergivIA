# Plano de Recuperação de Desastres (Disaster Recovery - DR)

**EnergivIA — Plataforma de Inteligência e Propostas Solares**

---

## 1. Visão Geral e Objetivos

Este documento formaliza as políticas, diretrizes e o procedimento operacional padrão (SOP) para restabelecer a integridade e disponibilidade dos serviços e bancos de dados da EnergivIA na ocorrência de desastres técnicos, operacionais ou de infraestrutura em nuvem.

### 1.1 Metas de Recuperação (SLAs de DR)

| Métrica                            | Meta             | Descrição                                                                                                         |
| :--------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------- |
| **RTO (Recovery Time Objective)**  | **< 60 minutos** | Tempo máximo tolerável desde a declaração do desastre até o restabelecimento da API e banco de dados operacional. |
| **RPO (Recovery Point Objective)** | **< 24 horas**   | Janela máxima tolerada de dados desatualizados (garantida pelos backups automáticos diários externos).            |

---

## 2. Cenários de Risco Cobertos

1. **Falha Crítica ou Queda no Provedor Primário:** Queda massiva ou indisponibilidade prolongada do banco (ex: Railway, Neon ou AWS).
2. **Bloqueio ou Suspensão de Conta:** Suspensão acidental de conta de nuvem ou cobrança interrompida.
3. **Corrupção de Dados ou Ação Humana:** Exclusão acidental (`DROP TABLE`, `DELETE` sem filtro) ou erro em migração de banco de dados (`prisma migrate`).
4. **Comprometimento de Credenciais:** Vazamento de chaves ou invasão que demande migração imediata de instância e rotação de credenciais.

---

## 3. Arquitetura de Backups

### 3.1 Backup Automático Externo (PostgreSQL)

A automação é executada via GitHub Actions no arquivo [`.github/workflows/db-backup.yml`](file:///.github/workflows/db-backup.yml).

- **Frequência:** Diariamente às **03:00 BRT** (06:00 UTC).
- **Gatilho Manual:** Disponível a qualquer momento via aba **Actions > Database Backup (PostgreSQL) > Run workflow**.
- **Formato:** PostgreSQL Custom Format (`.dump` via `pg_dump -Fc`), contendo compressão nativa e suporte a restauração paralela e seletiva via `pg_restore`.
- **Destino Externo:** Armazenamento seguro de objetos (AWS S3 ou Cloudflare R2 com compatibilidade S3), completamente desacoplado do provedor onde a aplicação está hospedada.
- **Integridade:** Para cada arquivo de dump é gerado e armazenado seu hash `SHA-256` para validação prévia de integridade antes do restore.
- **Estrutura de Pastas no Bucket:**
  ```text
  backups/
  └── postgres/
      └── {ANO}/
          └── {MÊS}/
              ├── energiv_db_{YYYYMMDD_HHMMSSZ}.dump
              └── energiv_db_{YYYYMMDD_HHMMSSZ}.dump.sha256
  ```

### 3.2 Segredos Necessários no GitHub (Repository Secrets)

Para que o workflow execute corretamente, as seguintes chaves devem estar configuradas em `Settings > Secrets and variables > Actions`:

| Secret                            | Descrição                                         | Exemplo                                                    |
| :-------------------------------- | :------------------------------------------------ | :--------------------------------------------------------- |
| `DATABASE_URL`                    | String de conexão do PostgreSQL de produção       | `postgresql://user:pass@host:5432/energiv?sslmode=require` |
| `BACKUP_S3_ACCESS_KEY_ID`         | Access Key ID da AWS ou Cloudflare R2             | `AKIAIOSFODNN7EXAMPLE`                                     |
| `BACKUP_S3_SECRET_ACCESS_KEY`     | Secret Key da AWS ou Cloudflare R2                | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`                 |
| `BACKUP_S3_BUCKET`                | Nome do bucket de destino                         | `energiv-backups`                                          |
| `BACKUP_S3_ENDPOINT` _(opcional)_ | Endpoint para Cloudflare R2 / MinIO               | `https://<account-id>.r2.cloudflarestorage.com`            |
| `BACKUP_S3_REGION` _(opcional)_   | Região do bucket (default: `auto` ou `us-east-1`) | `auto` ou `us-east-1`                                      |

---

## 4. Playbook de Execução: Restauração Passo a Passo

Caso o banco principal falhe e precise ser substituído ou restaurado do zero, siga impreterivelmente estes passos:

### Passo 1: Notificação e Quarentena

1. Suspenda os deploys automáticos temporariamente para evitar conflitos de conexão.
2. Identifique o motivo da falha (ex: indisponibilidade do host, corrupção ou lock).

### Passo 2: Provisionar Novo Banco de Dados PostgreSQL

Suba uma nova instância PostgreSQL 15 ou 16 em um provedor confiável:

- **Opção A (Railway):** Criar novo plugin de PostgreSQL no painel.
- **Opção B (Neon / Supabase):** Criar novo projeto Serverless Postgres.
- **Opção C (AWS RDS / DigitalOcean):** Criar instância gerenciada de PostgreSQL.

Obtenha a nova connection string:

```text
postgresql://novo_usuario:nova_senha@novo_host:5432/energiv?sslmode=require
```

### Passo 3: Baixar o Backup Mais Recente do S3 / R2

Via terminal ou AWS CLI:

```bash
# Definir variáveis de credenciais
export AWS_ACCESS_KEY_ID="sua_access_key"
export AWS_SECRET_ACCESS_KEY="sua_secret_key"
export BUCKET_NAME="energiv-backups"

# Se estiver usando Cloudflare R2, inclua o --endpoint-url:
# ENDPOINT="--endpoint-url https://<account_id>.r2.cloudflarestorage.com"
ENDPOINT=""

# Listar últimos backups
aws s3 ls "s3://${BUCKET_NAME}/backups/postgres/$(date +%Y)/" --recursive $ENDPOINT | sort | tail -n 5

# Baixar o dump e o arquivo de checksum
aws s3 cp "s3://${BUCKET_NAME}/backups/postgres/2026/10/energiv_db_20261005_060000Z.dump" . $ENDPOINT
aws s3 cp "s3://${BUCKET_NAME}/backups/postgres/2026/10/energiv_db_20261005_060000Z.dump.sha256" . $ENDPOINT
```

### Passo 4: Validar Integridade (Checksum SHA-256)

No Linux/macOS:

```bash
sha256sum -c energiv_db_20261005_060000Z.dump.sha256
```

No Windows (PowerShell):

```powershell
Get-FileHash -Algorithm SHA256 energiv_db_20261005_060000Z.dump
# Compare com o hash gravado no arquivo .sha256
```

### Passo 5: Executar a Restauração (`pg_restore`)

Restaure os dados diretamente no novo banco de dados:

```bash
# Restauração limpa e sem proprietários fixos:
pg_restore \
  --dbname="postgresql://novo_usuario:nova_senha@novo_host:5432/energiv?sslmode=require" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  energiv_db_20261005_060000Z.dump
```

> **Nota:** Erros triviais como "relation does not exist" durante o `--clean` são normais se o banco de destino estiver virgem.

### Passo 6: Executar Migrações do Prisma e Validação de Esquema

No repositório do projeto, aponte temporariamente o `DATABASE_URL` para a nova instância e execute:

```bash
# No diretório apps/api
pnpm prisma migrate deploy
```

Esse comando garante que quaisquer migrações pendentes adicionadas após o dump sejam sincronizadas.

### Passo 7: Atualizar Variáveis de Ambiente em Produção

1. Acesse o painel de produção da API (ex: **Railway** ou **Vercel**).
2. Atualize a variável `DATABASE_URL` (e `DIRECT_URL`, se aplicável) com a nova URL de conexão.
3. Dispare o redeploy da API.

### Passo 8: Smoke Tests e Health Check

1. Verifique o endpoint de saúde:
   ```bash
   curl -i https://api.energiv.com.br/health
   ```
   **Resposta esperada (HTTP 200):**
   ```json
   {
     "status": "ok",
     "uptime": 12,
     "checks": {
       "db": "ok"
     }
   }
   ```
2. Realize login de teste e verifique a listagem de clientes e propostas para garantir que os relacionamentos de `Tenant` e `User` estão operacionais.

---

## 5. Monitoramento de Uptime Externo (Item 19)

Para ser alertado instantaneamente caso a API ou o Banco fiquem inacessíveis:

### 5.1 Endpoint Monitorado

- **URL:** `https://api.energiv.com.br/health` (ou o domínio do seu ambiente de produção).
- **Método HTTP:** `GET`
- **Código de Sucesso Esperado:** `200 OK`
- **Mecanismo Interno:** O endpoint `/health` da API EnergivIA executa ativamente um `SELECT 1` no banco via Prisma. Caso o banco caia, o endpoint retorna imediatamente `HTTP 503 Service Unavailable`, alertando o monitor de uptime antes mesmo dos usuários relatarem problemas.

### 5.2 Configuração Recomendada (UptimeRobot ou BetterStack)

1. Crie uma conta gratuita em [UptimeRobot](https://uptimerobot.com) ou [BetterStack](https://betterstack.com).
2. Crie um novo monitor:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `EnergivIA Production API & DB`
   - **URL:** `https://api.energiv.com.br/health`
   - **Monitoring Interval:** `1 minute` ou `5 minutes`
   - **Alert Contacts:** E-mail, Notificação Push, Webhook para Telegram ou WhatsApp.
3. Configure os contatos de plantão (Equipe de Engenharia / DevOps).

---

## 6. Procedimento de Simulação Periódica (DR Drill)

A cada **6 meses**, a equipe técnica deve realizar um teste controlado de recuperação:

1. Baixar o backup mais recente gerado pelo GitHub Actions.
2. Restaurar em um banco PostgreSQL local (`docker-compose` ou container temporário).
3. Conectar a API em modo desenvolvimento ao banco restaurado e rodar a suíte de testes ponta a ponta (`pnpm test`).
4. Documentar o tempo total gasto na restauração e atualizar este documento caso haja gargalos identificados.
