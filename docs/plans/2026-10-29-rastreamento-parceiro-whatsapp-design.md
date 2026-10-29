# Design de Arquitetura: Rastreamento e Atribuição de Parceiro via WhatsApp Bot ("Coleira Dupla")

**Data:** 29 de Outubro de 2026  
**Status:** Aprovado  
**Objetivo:** Garantir a atribuição e o vínculo automático de novos integradores à carteira de comissões de parceiros comerciais quando o primeiro contato ocorrer através da divulgação do Bot de WhatsApp da EnergivIA.

---

## 1. Contexto e Motivação

Atualmente, a plataforma EnergivIA já conta com um sistema de vendedores e parceiros comerciais (`SalesRepModule` e `referral_code` em `Tenant` e `User`), onde clientes que se cadastram pelo link `energivia.com.br/cadastro?ref=CODIGO` têm o código gravado em cookie/localStorage e são vinculados à carteira do parceiro no momento da criação da organização (`/create-organization`).

No entanto, parceiros frequentemente divulgam a EnergivIA em **grupos de WhatsApp de integradores solares** compartilhando o contato do próprio **Bot de WhatsApp** (assistente de dimensionamento solar e degustação de 3 propostas gratuitas). Caso o cliente inicie sua experiência pelo WhatsApp e depois decida criar sua conta na plataforma web pelo computador ou por outro canal, a trilha de atribuição convencional de cookies web poderia ser perdida, deixando o parceiro sem o comissionamento devido.

Este documento estabelece a arquitetura da **"Coleira Blindada"**, unindo cookies web, link de ponte rápida (`/w/:code`), persistência de número de WhatsApp e cruzamento de telefone no momento do cadastro.

---

## 2. Visão Geral da Arquitetura

O fluxo completo é composto por 4 elos interdependentes e redundantes:

```
1. Compartilhamento do Link Curto:
   Parceiro divulga: energivia.com.br/w/:codigo (ou link direto wa.me com tag)

2. Ponte Web Rápida (Next.js):
   - Grava cookie de 30 dias (energivia_ref=codigo) e localStorage no navegador do celular
   - Redireciona via deep link para o WhatsApp com mensagem pré-formatada:
     "Olá! Quero testar o assistente de IA da EnergivIA (ref: :codigo)"

3. Webhook do Bot no WhatsApp (NestJS):
   - Intercepta a tag (ref: codigo) na mensagem recebida
   - Registra na tabela InboundLeadAttribution:
     { phoneDigits: fromWaId, referralCode: :codigo, salesRepId: rep.id }
   - Emite mensagens com links de proposta e planos já carimbados com ?ref=:codigo

4. Cruzamento no Cadastro da Empresa (organizations.service.ts):
   - Se o cadastro já veio com referralCode (via cookie/URL), prioriza o código
   - Se veio sem referralCode (ex: acessou por PC sem cookie), normaliza o telefone fornecido
     no cadastro e consulta InboundLeadAttribution
   - Encontrando correspondência, vincula salesRepId e referralCode ao Tenant automaticamente
   - Marca convertedTenantId e convertedAt no registro de atribuição
```

---

## 3. Modelo de Dados (Neon PostgreSQL / Prisma)

Criação da tabela dedicada e indexada `InboundLeadAttribution`:

```prisma
model InboundLeadAttribution {
  id                 String    @id @default(cuid())
  phoneDigits        String    @unique @map("phone_digits") // Ex: "5534996851400"
  referralCode       String    @map("referral_code")
  salesRepId         String?   @map("sales_rep_id")
  source             String    @default("whatsapp_bot") @map("source")
  firstMessage       String?   @map("first_message") @db.Text
  convertedTenantId  String?   @map("converted_tenant_id")
  convertedAt        DateTime? @map("converted_at")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  salesRep           User?     @relation(fields: [salesRepId], references: [id], onDelete: SetNull)
  convertedTenant    Tenant?   @relation(fields: [convertedTenantId], references: [id], onDelete: SetNull)

  @@index([referralCode])
  @@index([salesRepId])
  @@index([phoneDigits])
  @@map("inbound_lead_attributions")
}
```

Atualização das relações existentes nos modelos `User` e `Tenant`:

- `User`: `inboundLeadAttributions InboundLeadAttribution[]`
- `Tenant`: `inboundLeadAttributions InboundLeadAttribution[]`

---

## 4. Ponte de Redirecionamento Web (`/w/[code]`)

Criada em `apps/web/src/app/w/[code]/page.tsx`:

- Extração de `params.code`.
- Sanitização através de `sanitizeReferralCode(code)`.
- Persistência imediata via `document.cookie` e `localStorage` (reutilizando helpers de `referral-tracker.ts`).
- Montagem do link para o bot oficial EnergivIA (`554491585309`):
  `https://wa.me/554491585309?text=Ol%C3%A1%21%20Quero%20testar%20o%20assistente%20de%20IA%20da%20EnergivIA%20%28ref%3A%20${code}%29`
- Redirecionamento instantâneo via `window.location.replace()`, com feedback visual e botão manual de contingência caso o bloqueador de popup restrinja abertura automática.

---

## 5. Inteligência e Webhook do WhatsApp Bot

No serviço `WhatsappBotService` (`apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`):

1. **Parser de Indicação:**
   - Detecta padrões flexíveis como `ref:CODIGO`, `ref=CODIGO`, `#CODIGO` ou `indicação: CODIGO` na primeira mensagem ou em saudações.
2. **Validação do Vendedor:**
   - Consulta o usuário no banco com `role: "PLATFORM_SALES"` ou que possua o `referralCode` cadastrado.
3. **Persistência de Atribuição:**
   - Executa `upsert` na tabela `InboundLeadAttribution` utilizando os dígitos de `fromWaId` (número do cliente).
   - Anexa `referralCode` e `salesRepId` aos metadados da conversa (`conversation.metadata`).
4. **Propagação de Links:**
   - Injeta `?ref=${referralCode}` nos links dinâmicos enviados pelo bot, incluindo o aviso de término de cota de degustação (`buildGuestTrialExceededMessage`) e links de acompanhamento da proposta.

---

## 6. Amarração no Cadastro (`OrganizationsService`)

No método `create()` de `organizations.service.ts`:

1. Avalia se `rawRef` foi enviado no DTO (via cookies/query param).
2. Se `rawRef` for nulo:
   - Extrai os dígitos do telefone informado no cadastro (`dto.phone` ou `user.phone`).
   - Normaliza os dígitos (suportando formatos com ou sem DDI 55 e 8/9 dígitos).
   - Realiza busca em `InboundLeadAttribution` onde `phoneDigits` corresponda ao telefone.
   - Encontrando o registro ativo:
     - Define `assignedSalesRepId = attribution.salesRepId`
     - Define `validReferralCode = attribution.referralCode`
     - Atualiza o registro em `InboundLeadAttribution` com `convertedTenantId = org.id` e `convertedAt = new Date()`.
3. Ao finalizar a criação da organização, a empresa passa a constar na carteira do parceiro no painel comercial (`/admin/comercial`).

---

## 7. Interface Comercial do Parceiro

No componente `SalesRepLinkCard.tsx`:

- Exibição de duas opções claras com botões dedicados de cópia e compartilhamento direto para WhatsApp:
  1. **Link da Plataforma Web:** `https://www.energivia.com.br/cadastro?ref=${code}`
  2. **Link do Bot no WhatsApp:** `https://www.energivia.com.br/w/${code}`
     - Botão "Compartilhar em Grupos" com texto pronto:
       _"Pessoal, testem esse assistente de IA para dimensionar e gerar propostas solares em 30 segundos no WhatsApp: https://www.energivia.com.br/w/${code}"_

---

## 8. Critérios de Sucesso e Testes

1. Testes unitários para o parser de referências do WhatsApp Bot.
2. Testes de persistência e normalização de telefones em `InboundLeadAttribution`.
3. Testes em `organizations.service.spec.ts` garantindo que um cadastro sem referral explícito, mas com telefone previamente registrado pelo bot, seja atribuído com precisão ao vendedor.
4. Validação de build da API (NestJS) e Web (Next.js com rota `/w/[code]`).
