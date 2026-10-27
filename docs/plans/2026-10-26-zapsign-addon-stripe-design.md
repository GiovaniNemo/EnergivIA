# Design: Add-on Opcional ZapSign (R$ 59,90/mês) no Stripe & Integração de Assinatura Digital

**Data:** 2026-10-26
**Status:** Aprovado

## 1. Visão Geral e Objetivos

Permitir que as organizações contratem o módulo de assinatura digital com validade jurídica **ZapSign** como um **Add-on opcional mensal de R$ 59,90/mês** vinculado aos planos mensais no Stripe, vindo **pré-marcado por padrão** nos cards de planos (Order Bump) para que o cliente possa desmarcar caso não queira, e também disponível dentro do próprio Stripe Checkout (`optional_items`) caso tenha desmarcado no card. Além disso, remover todos os ícones de estrelinhas (`Sparkles`) da tela de planos e modal de trial.

## 2. Arquitetura Comercial e Stripe (`StripeService` + `Prisma`)

- **Campos em `Subscription` (`schema.prisma`):**
  - `zapsignAddonActive Boolean @default(false) @map("zapsign_addon_active")`
  - `zapsignSubscriptionItemId String? @map("zapsign_subscription_item_id")`
- **Preço Recorrente no Stripe (`R$ 59,90/mês`):**
  - Método `ensureZapSignAddonPrice()` em `StripeService` que cria/recupera o Produto `"Add-on Assinatura Digital ZapSign - EnergivIA"` e Preço recorrente mensal (`unit_amount: 5990`, `currency: "brl"`) e armazena o ID em `SystemSetting` (`STRIPE_ZAPSIGN_ADDON_PRICE_ID`).
- **Checkout Híbrido (`createCheckoutSession`):**
  - Recebe `includeZapSignAddon?: boolean` (default `true`).
  - Quando `includeZapSignAddon === true`: inclui o preço do plano e o preço do Add-on ZapSign em `line_items` (com `adjustable_quantity: { enabled: false }` ou item recorrente composto), e grava `includeZapSignAddon: "true"` em `metadata`.
  - Quando `includeZapSignAddon === false`: envia apenas o plano em `line_items` e adiciona o preço do Add-on ZapSign em `optional_items` do Stripe Checkout, permitindo que o cliente marque a opção diretamente dentro da tela do Stripe se mudar de ideia.
- **Gestão Pós-Assinatura (`toggleZapSignAddon`):**
  - Endpoint `POST /stripe/subscription/zapsign-addon` permitindo a um assinante ativo adicionar ou remover o item recorrente do ZapSign (`stripe.subscriptionItems.create` / `stripe.subscriptionItems.del`) sem cancelar o plano principal.
- **Sincronização em Webhooks e `verifySession`:**
  - Inspeciona os itens da assinatura no Stripe (`stripeSub.items.data`) e/ou `metadata.includeZapSignAddon` para atualizar `zapsignAddonActive` e `zapsignSubscriptionItemId`.

## 3. Interface de Planos e Remoção do Ícone `Sparkles`

- **Remoção de `Sparkles`:**
  - Remover completamente o ícone `Sparkles` de `apps/web/src/app/(authenticated)/gestao/meus-planos/page.tsx` e `apps/web/src/components/providers/TrialLockOverlay.tsx`, utilizando ícones sóbrios (`Tag`, `Award`, `CheckCircle2`, `ShieldCheck`).
- **Checkbox Pré-Marcado (Order Bump) nos Cards (`PaymentForm.tsx`, `meus-planos/page.tsx`, `TrialLockOverlay.tsx`):**
  - Exibir seletor interativo pré-marcado (`includeZapSign = true` por padrão) em cada card:
    - Título: **Assinatura Digital ZapSign (+ R$ 59,90/mês)**
    - Subtítulo: **Contratos e propostas com validade jurídica**
  - Atualizar dinamicamente o texto/resumo do botão de assinatura conforme marcado/desmarcado.
  - No banner de assinatura ativa em `/gestao/meus-planos`, permitir ativar ou desativar o Add-on ZapSign.

## 4. Integração Técnica com API do ZapSign nas Propostas

- **Campos em `Proposal` (`schema.prisma`):**
  - `zapsignDocToken String? @map("zapsign_doc_token")`
  - `zapsignSignerToken String? @map("zapsign_signer_token")`
  - `zapsignSignUrl String? @map("zapsign_sign_url")`
  - `zapsignStatus String? @map("zapsign_status")` (`PENDING`, `SIGNED`, `REFUSED`)
  - `zapsignSignedPdfUrl String? @map("zapsign_signed_pdf_url")`
  - `zapsignSignedAt DateTime? @map("zapsign_signed_at")`
- **Serviço `ZapSignService` (`apps/api/src/modules/proposals/zapsign.service.ts`):**
  - Verifica se a organização possui o módulo ZapSign habilitado (`subscription.zapsignAddonActive`, acesso vitalício/especial ou token próprio em `tenant.settings.zapsignApiToken`).
  - Envia o documento PDF da proposta para `POST https://api.zapsign.com.br/api/v1/docs/` (ou sandbox `https://sandbox.api.zapsign.com.br/api/v1/docs/`) com os dados do signatário (nome, e-mail, WhatsApp do Lead/Cliente).
  - Salva `zapsignDocToken`, `zapsignSignerToken`, `zapsignSignUrl` e `zapsignStatus = "PENDING"`.
  - Endpoint `POST /proposals/:id/zapsign` para gerar/obter o link de assinatura do ZapSign e `POST /public/proposals/webhooks/zapsign` para receber o webhook `doc_signed` e marcar a proposta como `ACCEPTED`.
