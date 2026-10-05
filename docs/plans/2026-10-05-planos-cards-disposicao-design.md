# Design Arquitetural: Disposição Minimalista de Recursos dos Planos & Gestão Check/X

## 1. Diretrizes & Critérios

- **Foco no que vende:** Apenas os recursos reais de alto valor comercial da plataforma EnergivIA.
- **Zero invenções:** Nenhuma menção a whitelabel, domínio próprio ou itens inexistentes.
- **Minimalista e Equilibrado:** 7 linhas essenciais e idênticas em todos os cards, gerando altura e proporção 100% alinhadas.
- **Clareza de Upgrade:** O plano Essencial mostra claramente com **✕** que não tem o _Radar Solar ANEEL_ e nem os _Alertas em tempo real_, incentivando a conversão para o Pro.
- **100% Editável no Admin:** Cada linha pode ser editada, reordenada ou alternada entre `[✓ Incluso]` e `[✕ Não incluso]` com um clique.

---

## 2. A Matriz dos 3 Planos (7 Itens Reais & Minimalistas)

| #   | Recurso Real da Plataforma  |            Essencial (R$ 99,99)            |              Pro (R$ 199,99)               |              Plus (R$ 399,99)              |
| --- | --------------------------- | :----------------------------------------: | :----------------------------------------: | :----------------------------------------: |
| 1   | **Propostas Comerciais**    |       ✓ Até 50 propostas com IA/mês        |       ✓ Até 120 propostas com IA/mês       |       ✓ Propostas com IA ilimitadas        |
| 2   | **Equipe & Vendedores**     |    ✓ 2 Usuários na equipe (1 convidado)    |         ✓ Até 5 usuários na equipe         |     ✓ Usuários e vendedores ilimitados     |
| 3   | **WhatsApp com IA 24/7**    |      ✓ 1 Número de WhatsApp integrado      |        ✓ Até 2 números de WhatsApp         |      ✓ Múltiplos números de WhatsApp       |
| 4   | **Templates de Proposta**   |   ✓ 1 Template personalizado (+ padrão)    |   ✓ Templates personalizados ilimitados    |   ✓ Templates personalizados ilimitados    |
| 5   | **CRM Solar & Funil**       |       ✓ CRM Solar e funil de vendas        |   ✓ CRM Solar com histórico e follow-up    |   ✓ CRM Solar com histórico e follow-up    |
| 6   | **Radar Solar ANEEL**       |   ✕ Radar Solar ANEEL (Prospecção ativa)   |     ✓ Radar Solar ANEEL na sua região      |      ✓ Radar Solar Nacional ilimitado      |
| 7   | **Alertas de Visualização** | ✕ Alertas quando o cliente abre a proposta | ✓ Alertas em tempo real (WhatsApp e Email) | ✓ Alertas em tempo real (WhatsApp e Email) |

---

## 3. Estrutura Técnica

### 3.1 Modelo de Dados (`packages/shared-types/src/plans.ts`)

```typescript
export interface PlanFeatureItem {
  text: string;
  included: boolean;
}
```

Normalizador `normalizePlanFeatures`:

- Transforma itens em `{ text: string, included: boolean }`.
- Suporta strings legadas (`[x] ` vira `included: false`, string padrão vira `included: true`).
- Defaults dos planos Essencial, Pro e Plus ajustados exatamente para os 7 itens acima.

### 3.2 Gestão de Planos no Admin (`/admin/planos`)

- Na lista de benefícios de cada plano:
  - Botão interativo de toggle: `[✓ Incluso]` (verde) / `[✕ Não incluso]` (cinza/vermelho sutil).
  - Um clique inverte o estado `included`.
  - Reordenação (arraste e setas) e edição de texto inline com lápis.
  - Ao salvar o plano, persiste no banco o array estruturado.

### 3.3 Visualização dos Cards (`/gestao/meus-planos` e `TrialLockOverlay`)

- Itens inclusos: ícone `CheckCircle2` com cor do plano (esmeralda, dourado ou roxo), texto destacado.
- Itens não inclusos: ícone `XCircle` neutro sutil, texto atenuado (`text-[var(--color-muted-foreground)]`), demonstrando com clareza o que o plano não possui.
- Cartões com alturas perfeitamente simétricas.
