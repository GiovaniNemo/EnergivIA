# Design da Arquitetura: Acessos Especiais (Whitelist) & Revogação Unificada (Web + WhatsApp)

## 1. Visão Geral e Objetivo

Permitir a liberação profissional e descomplicada de acesso completo à plataforma EnergivIA (Web + WhatsApp Bot com plano Plus ilimitado) para profissionais parceiros (ex.: equipe de marketing, parceiros estratégicos ou convidados), sem a necessidade de emissão de cupons manuais, cartões de crédito ou checkout no Stripe.

A revogação do acesso deve ser **única e instantânea**: ao revogar o usuário no painel de administração ou remover o e-mail da variável de ambiente, **cai tudo de uma vez** (plataforma web e bot do WhatsApp). Caso a pessoa queira continuar utilizando a EnergivIA após a revogação, o sistema a redireciona para a tela oficial de contratação de planos via Stripe.

---

## 2. Nomenclatura Institucional

- **Nome da Seção no Admin:** **Acessos Especiais (Whitelist)** (ou **Contas Autorizadas**).
- **Terminologia do Status:**
  - 🟢 **Autorizado (Acesso Especial Ativo)**
  - 🔴 **Acesso Revogado / Expirado**

---

## 3. Arquitetura da Solução

### 3.1 Concessão de Acesso via Variável de Ambiente (`COMPLIMENTARY_ACCESS_EMAILS`)

1. No Railway / Vercel, o administrador pode listar os e-mails liberados:
   ```env
   COMPLIMENTARY_ACCESS_EMAILS="marketing@empresa.com,parceiro@exemplo.com"
   ```
2. Ao criar a conta ou logar com o e-mail autorizado:
   - O backend identifica que o usuário está na lista de **Acessos Especiais**.
   - Automaticamente concede os privilégios do **Plano Plus** (sem expiração de 5 dias de trial, sem limite de 20 propostas e com suporte total ao WhatsApp Bot).
   - Não exige dados de pagamento no Stripe nem geração de cupons.

### 3.2 O "Kill-Switch" Único (Derrubada Unificada em 1 Clique)

Quando o administrador clica em **"Revogar Acesso"** no painel de administração (`/admin/acessos-especiais` ou `/admin/sistema`):

1. **Prioridade do Bloqueio no Banco de Dados (`SystemSetting` ou status de revogação no Tenant)**:
   - A revogação gravada no banco tem prioridade absoluta sobre a variável de ambiente do Railway.
   - O administrador não precisa correr para reiniciar o Railway: o bloqueio passa a valer em milissegundos.
2. **Derrubada Simultânea do WhatsApp**:
   - O número de telefone vinculado do usuário é imediatamente deletado da tabela `tenant_whatsapp_inbound_phones`.
   - Qualquer mensagem subsequente enviada pelo usuário no WhatsApp é respondida pelo bot com mensagem comercial padrão:
     > _"O assistente de inteligência artificial da EnergivIA é um recurso exclusivo para assinantes ativos. Para continuar utilizando, contrate um plano em: https://www.energivia.com.br"_
3. **Derrubada Simultânea da Web**:
   - O status de plano da organização é rebaixado instantaneamente para `TRIAL` expirado (`trialExpired = true`, `isTrialProposalLimitReached = true`, `isTrialLocked = true`).
   - No próximo clique ou atualização de página na web, o usuário é bloqueado pela camada `TrialLockOverlay` e direcionado para a tela de contratação de planos (`/gestao/meus-planos`), sendo obrigado a assinar via Stripe se quiser continuar usando.

---

## 4. Componentes e Fluxo Técnico

### Backend (NestJS / API)

1. **Config & Helper (`special-access.service.ts` ou extensão em `plan-limits.ts`)**:
   - Lê `COMPLIMENTARY_ACCESS_EMAILS` das variáveis de ambiente.
   - Checa se o e-mail ou organização consta na lista de revogações registradas no banco.
   - Se autorizado e não revogado, `getTenantPlanDetails` retorna tier `PLUS`, `isTrial: false`, sem travas.
2. **Endpoint de Gestão Administrativa**:
   - `GET /api/admin/special-access`: Lista os e-mails com acesso especial configurado, status da conta (criada/pendente), organização vinculada, status (Ativo/Revogado) e telefone de WhatsApp pareado.
   - `POST /api/admin/special-access/:id/revoke`: **Revogação unificada** — marca status como revogado e expurga o registro de `TenantWhatsappInboundPhone`.
   - `POST /api/admin/special-access/:id/restore`: Restaura a autorização caso o administrador queira reativar.
3. **WhatsApp Bot Guard (`whatsapp-bot.service.ts`)**:
   - `resolveAuthorizedTenant` e `isTenantPlanActive`: Se o tenant tiver sido revogado, bloqueia o processamento e descarta o número imediatamente.

### Frontend (Next.js / Web)

1. **Painel Admin (`apps/web/src/app/(authenticated)/admin/acessos-especiais/page.tsx` ou aba integrada em `/admin`)**:
   - Card com estatísticas de contas parceiras.
   - Tabela limpa com:
     - E-mail
     - Organização / Usuário
     - Status (Badge: Ativo / Revogado)
     - WhatsApp vinculado (Número ou "Não vinculado")
     - Ação: Botão **"Revogar Acesso Completo"** (com confirmação rápida) ou **"Reativar"**.
   - Guia informativo claro: _"Para adicionar novas contas, configure na variável `COMPLIMENTARY_ACCESS_EMAILS` no Railway ou adicione na lista abaixo."_

---

## 5. Casos de Borda e Segurança

1. **E-mail na variável do Railway, mas revogado no Admin**:
   - O bloqueio no banco vence sem necessidade de redeploy imediato.
2. **Usuário tenta reconectar o WhatsApp após ser revogado**:
   - O código de pareamento do WhatsApp valida o status da organização. Se estiver revogada, recusa o pareamento e não gera o vínculo.
3. **Tentativa de contornar via API**:
   - Todos os endpoints de proposta, dimensionamento e bot do WhatsApp checam a validade do plano no nível de serviço e guardas de autenticação.

---

## 6. Critérios de Sucesso

- [x] Concessão automática de plano Plus sem necessidade de passar pelo Stripe.
- [x] Configuração via variável de ambiente simples (`COMPLIMENTARY_ACCESS_EMAILS`).
- [x] Interface no Painel de Admin para visualização do status e WhatsApp vinculado.
- [x] Ação de "Revogar Acesso" unificada: derruba Web e WhatsApp em 1 clique.
- [x] Se o usuário revogado quiser voltar a usar, é direcionado para a tela de pagamento do Stripe.
