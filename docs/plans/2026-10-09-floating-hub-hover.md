# Floating Hub Hover Interaction Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fazer o menu inteligente EnergivIA (botão orbital com ícone neural) abrir suavemente ao passar o mouse (`hover`) com tolerância de saída de 250ms para evitar fechamentos prematuros, preservando suporte a clique para dispositivos touch.

**Architecture:** Encapsular os ouvintes de evento `onMouseEnter` e `onMouseLeave` no container raiz de `EnergiviaFloatingHub.tsx`. O temporizador cancelável com ref previne fechamentos acidentais durante a transição do cursor até as opções satélite.

**Tech Stack:** Next.js (App Router), React, TypeScript, Framer Motion, Tailwind CSS.

---

### Task 1: Implementar lógica de hover com grace period em EnergiviaFloatingHub.tsx

**Files:**

- Modify: `apps/web/src/components/layout/EnergiviaFloatingHub.tsx`

**Step 1: Implementar timeout de fechamento e manipuladores de hover**
No arquivo `EnergiviaFloatingHub.tsx`:

- Adicionar `closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);`
- Criar `handleMouseEnter`:
  ```ts
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsExpanded(true);
  };
  ```
- Criar `handleMouseLeave`:
  ```ts
  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 250);
  };
  ```
- No `useEffect` de desmontagem/limpeza, garantir `clearTimeout(closeTimeoutRef.current)`.
- Atribuir `onMouseEnter={handleMouseEnter}` e `onMouseLeave={handleMouseLeave}` à tag `<div ref={hubRef} ...>`.
- Preservar `onClick={() => setIsExpanded((prev) => !prev)}` no botão principal.

**Step 2: Verificar compilação e tipagem**
Executar verificação de lint / build para garantir ausência de erros.

**Step 3: Commit**

```bash
git add apps/web/src/components/layout/EnergiviaFloatingHub.tsx
git commit -m "feat(web): enable smooth hover expansion on EnergiviaFloatingHub"
```

---

### Task 2: Validação Automatizada e Visual com Browser Subagent

**Files:**

- Test: `apps/web`

**Step 1: Executar suite de testes Vitest**
Verificar se todos os testes passam sem regressões.

**Step 2: Validar visualmente com Browser Subagent**
Abrir uma página do sistema, simular hover no botão flutuante e verificar se as opções "Assistente EnergivIA" e "Avaliar EnergivIA" surgem suavemente e permanecem visíveis ao passar o cursor sobre elas.

---

### Task 3: Commit e Push para o Repositório Remoto

**Files:**

- Repository root

**Step 1: Enviar commits para origin/main**

```bash
git push origin main
```
