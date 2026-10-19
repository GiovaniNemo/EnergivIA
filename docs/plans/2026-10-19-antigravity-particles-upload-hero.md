# Partículas Cinéticas Estilo Google Antigravity no Card de Upload - Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Integrar um efeito de fundo de partículas cinéticas dinâmicas estilo Google Antigravity no card de upload de fatura (`upload-hero`) do Dashboard, reagindo ao movimento do mouse com repulsão fluida, rotação e retorno elástico (spring-damping) a 60fps.

**Architecture:** Módulo isolado de física vetorial (`antigravity-particles-engine.ts`) com funções puras de aceleração, amortecimento, repulsão por distância e rotação angular. Componente React `AntigravityParticlesCanvas.tsx` que gerencia o `<canvas>`, redimensionamento com `devicePixelRatio`, pausa inteligente com `IntersectionObserver` e renderização dos traços orientados e micro-pontos na paleta Solar-Tech. Integração no `.upload-hero` mantendo acessibilidade e drag-and-drop intactos.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, HTML5 Canvas 2D, Vitest para testes unitários.

---

### Task 1: Módulo de Física Cinética das Partículas e Testes Unitários

**Files:**

- Create: `apps/web/src/components/dashboard/antigravity-particles-engine.ts`
- Create: `apps/web/src/components/dashboard/antigravity-particles-engine.spec.ts`

**Step 1: Escrever teste unitário automatizado cobrindo as regras físicas**

- Testar inicialização de partículas dentro dos limites do container (bounding box).
- Testar força de repulsão quando o cursor está dentro do raio de influência ($d < R$).
- Testar ausência de força de repulsão quando o cursor está fora do raio ($d \ge R$).
- Testar amortecimento e retorno por mola (spring force) em direção à posição de ancoragem.
- Testar rotação dinâmica em direção ao vetor de aceleração.

**Step 2: Executar testes para verificar falha (RED)**

- Run: `pnpm --filter web test apps/web/src/components/dashboard/antigravity-particles-engine.spec.ts`
- Expected: FAIL com "module not found".

**Step 3: Implementar `antigravity-particles-engine.ts`**

- Definir tipos `AntigravityParticle`, `PointerState`, `EngineConfig`.
- Implementar paleta EnergivIA Solar-Tech:
  - Esmeralda (#10B981, #34D399)
  - Ciano / Teal (#06B6D4, #14B8A6)
  - Ouro Solar (#F59E0B)
  - Violeta / Índigo (#818CF8)
- Implementar proporção de 75% traços / 25% pontos.
- Implementar `updateParticle(p, pointer, bounds, deltaTime)` com spring-damping e vetor de impulso.
- Implementar `drawParticle(ctx, p)` com traços de cantos arredondados (`lineCap = "round"`) e micro-pontos.

**Step 4: Executar testes para verificar sucesso (GREEN)**

- Run: `pnpm --filter web test apps/web/src/components/dashboard/antigravity-particles-engine.spec.ts`
- Expected: PASS (todos os testes de física aprovados).

**Step 5: Commit**

- Git commit das regras e testes de física.

---

### Task 2: Componente `AntigravityParticlesCanvas.tsx`

**Files:**

- Create: `apps/web/src/components/dashboard/AntigravityParticlesCanvas.tsx`

**Step 1: Implementar ciclo de vida e renderização em Canvas**

- `useRef` para `<canvas>` e animation frame ID.
- Suporte a alta densidade de pixels (`window.devicePixelRatio`).
- `ResizeObserver` para atualizar dimensões e reposicionar partículas de forma responsiva.
- `IntersectionObserver` para suspender o loop de animação quando o elemento não estiver visível na janela.
- Verificação de `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Ouvintes de `pointermove` e `pointerleave` passivos para atualização suave das coordenadas do cursor.

**Step 2: Validar tipagens TypeScript e ESLint**

- Run: `pnpm --filter web lint`
- Expected: 0 erros de lint.

**Step 3: Commit**

- Git commit do componente de canvas.

---

### Task 3: Integração no Card `upload-hero` em `dashboard/page.tsx`

**Files:**

- Modify: `apps/web/src/app/(authenticated)/dashboard/page.tsx:455-535`

**Step 1: Inserir `AntigravityParticlesCanvas` no fundo do card de upload**

- Garantir que o container `.upload-hero` tenha `relative overflow-hidden`.
- Inserir `<AntigravityParticlesCanvas className="absolute inset-0 z-[1] pointer-events-none" />`.
- Garantir que a área de drop (`upload-drop`) e o aside (`upload-aside`) tenham `relative z-10` para manter drag-and-drop e cliques 100% acessíveis e operacionais.

**Step 2: Ajustar estilos em `<style jsx>` se necessário**

- Garantir que os gradientes de fundo do `.upload-hero` permaneçam translúcidos para permitir que as partículas dancem de forma luminosa e sutil.

**Step 3: Commit**

- Git commit da integração na página de dashboard.

---

### Task 4: Validação Completa, Testes e Sincronização

**Files:**

- Verify: Todas as rotas e componentes modificados

**Step 1: Executar suíte de testes Vitest**

- Run: `pnpm test` ou `pnpm --filter web test`
- Expected: 100% dos testes aprovados.

**Step 2: Executar validação de Lint e Build Next.js**

- Run: `pnpm --filter web build`
- Expected: Compilação de 80+ rotas com código 0.

**Step 3: Commit e Push para origin/main**

- Enviar alterações sincronizadas para o repositório remoto conforme regra estrita do projeto.
