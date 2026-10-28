# Edição de Minuta Contratual em Tempo Real Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Eliminar os cards estáticos de personalização e observações e disponibilizar um editor de minuta contratual em tempo real (fullscreen studio modal) na ficha da venda, permitindo abrir, alterar o texto diretamente no corpo do documento, adicionar novas cláusulas e salvar com atualização do PDF e integridade jurídica.

**Architecture:** A ficha da venda (`/vendas/[id]`) remove os cards de personalização e oferece ações diretas para abrir e editar a minuta do contrato e da procuração. O componente `LiveContractEditorModal` renderiza o documento em folha A4 com `contentEditable`, ferramentas de formatação e inserção de cláusulas. O backend persiste o `contentHtml` em `SaleDocument`, regenera o PDF com hash SHA-256 e o `SignatureAuditService` preserva a versão editada para a assinatura eletrônica do cliente.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, Lucide Icons, NestJS, Prisma, Vitest, Puppeteer PDF.

---

### Task 1: Backend - Obtenção e Atualização de Documento com Suporte a Rascunho

**Files:**

- Modify: `apps/api/src/modules/sales/sales.service.ts`
- Modify: `apps/api/src/modules/sales/sales.controller.ts`
- Test: `apps/api/src/modules/sales/__tests__/sales.service.spec.ts`

**Step 1: Write the failing unit tests for getDocumentForEditor and updateDocumentContent**
Test cases:

- Retorna o documento existente com `contentHtml` populado.
- Atualiza o `contentHtml`, regenera o hash SHA-256 e bloqueia edição se o status for `SIGNED`.

**Step 2: Run tests to verify failure**
Run: `pnpm --filter @energivia/api test sales.service.spec.ts`

**Step 3: Implement minimal code in sales.service.ts and sales.controller.ts**
Ensure `getDocumentForEditor` preenche o HTML base com variáveis da venda caso `contentHtml` esteja nulo.
Ensure `updateDocumentContent` persiste `contentHtml` e bloqueia status `SIGNED`.

**Step 4: Run tests to verify they pass**
Run: `pnpm --filter @energivia/api test sales.service.spec.ts`

**Step 5: Commit**

```bash
git add apps/api/src/modules/sales/sales.service.ts apps/api/src/modules/sales/sales.controller.ts apps/api/src/modules/sales/__tests__/sales.service.spec.ts
git commit -m "feat(api): endpoints de obtencao e atualizacao de minuta contratual editavel"
```

---

### Task 2: Backend - Preservação do HTML Customizado em SignatureAuditService

**Files:**

- Modify: `apps/api/src/modules/sales/signature-audit.service.ts`
- Test: `apps/api/src/modules/sales/__tests__/signature-audit.service.spec.ts`

**Step 1: Write failing test verifying custom contentHtml is preserved during final signature generation**
Check that when `doc.contentHtml` is present, it uses `doc.contentHtml` rather than regenerating from raw template.

**Step 2: Run test to verify behavior**
Run: `pnpm --filter @energivia/api test signature-audit.service.spec.ts`

**Step 3: Implement minimal verification and code adjustment**
Ensure placeholders `{{bloco_assinatura_cliente}}` and `{{folha_auditoria_anexa}}` are seamlessly replaced.

**Step 4: Run tests to verify pass**
Run: `pnpm --filter @energivia/api test signature-audit.service.spec.ts`

**Step 5: Commit**

```bash
git add apps/api/src/modules/sales/signature-audit.service.ts
git commit -m "feat(api): integracao de contentHtml editado no fluxo de assinatura e auditoria"
```

---

### Task 3: Frontend - Remover Cards de Personalização e Observações e Integrar Ação de Edição

**Files:**

- Modify: `apps/web/src/app/(authenticated)/vendas/[id]/page.tsx`
- Modify: `apps/web/src/lib/sales-api.ts`

**Step 1: Remover o card "Personalização do Contrato" e o card "Cláusulas Específicas / Cláusula 15ª"**
Remover os cards da aba Ficha Cadastral e da aba Documentos.

**Step 2: Adicionar botões de ação na aba Documentos**

- "Abrir e Editar Contrato (PF/PJ)"
- "Abrir e Editar Procuração (PF/PJ)"
  Se o documento ainda não existir, cria o documento e abre o modal. Se já existir, abre diretamente.

**Step 3: Adicionar botão "Editar Documento em Tempo Real" na listagem de documentos**
Permite reabrir qualquer minuta para edição imediata.

**Step 4: Run linter/build check on web**
Run: `pnpm --filter @energivia/web lint`

**Step 5: Commit**

```bash
git add apps/web/src/app/\(authenticated\)/vendas/\[id\]/page.tsx apps/web/src/lib/sales-api.ts
git commit -m "feat(web): remover cards de personalizacao e adicionar acoes de edicao de contrato"
```

---

### Task 4: Frontend - Refinar o Editor de Contrato em Tempo Real (LiveContractEditorModal)

**Files:**

- Modify: `apps/web/src/components/sales/live-contract-editor-modal.tsx`

**Step 1: Refinar UI do canvas A4 e toolbar**

- Suporte a inserção inteligente de cláusula ("+ Nova Cláusula").
- Ferramentas de formatação (Bold, Italic, Underline, List).
- Atalho `Ctrl+S` para salvar.
- Feedback de salvamento e botão de prévia do PDF.
- Modo somente leitura quando o contrato estiver assinado.

**Step 2: Run linter/build check on web**
Run: `pnpm --filter @energivia/web lint`

**Step 3: Commit**

```bash
git add apps/web/src/components/sales/live-contract-editor-modal.tsx
git commit -m "feat(web): studio modal de edicao de minuta contratual em tempo real"
```

---

### Task 5: Validação Completa, Testes Automatizados e Sincronização

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar testes unitários do backend**
Run: `pnpm --filter @energivia/api test`

**Step 2: Executar lint e verificação de tipos do frontend**
Run: `pnpm --filter @energivia/web build`

**Step 3: Atualizar docs/plans/task.md e commitar**
Commit e push para `origin/main`.
