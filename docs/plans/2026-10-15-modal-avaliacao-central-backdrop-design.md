# Design Doc: Modal de Avaliação Centralizado com Fundo Embaçado (Backdrop Blur) e Bloqueio Pós-Resposta

**Data:** 15 de Outubro de 2026  
**Status:** Aprovado  
**Objetivo:** Transformar o card flutuante de avaliação em um modal centralizado de alto impacto visual, com fundo embaçado (backdrop blur), proporções confortáveis e garantia definitiva de exibição única com bloqueio permanente após resposta.

---

## 1. Contexto e Problema Atual

Atualmente, o componente `FeedbackPromptCard.tsx` é renderizado como um card flutuante fixado no canto inferior direito (`fixed bottom-6 right-5`).
Problemas identificados:

1. **Posicionamento periférico:** No canto inferior direito, disputa atenção com o hub flutuante do cérebro (`EnergiviaFloatingHub.tsx`) e pode passar despercebido ou ser cortado em dispositivos móveis.
2. **Ausência de foco imersivo:** Não possui máscara de fundo (backdrop overlay), permitindo que cliques e movimentações ocorram por trás do formulário.
3. **Persistência apenas local:** A confirmação de envio (`energivia_feedback_submitted`) é gravada apenas no `localStorage` do navegador. Se o usuário mudar de máquina, limpar cookies ou navegar em aba anônima, o formulário poderia reabrir.

---

## 2. Solução Arquitetural

### 2.1 Posicionamento e Estrutura Visual

- **Overlay com Fundo Embaçado:**
  - Container fixo de tela cheia: `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto`
  - Máscara translúcida: `fixed inset-0 bg-[#02040a]/80 backdrop-blur-md transition-opacity`
  - O backdrop bloqueia interações acidentais na página enquanto o modal estiver aberto e foca 100% da atenção do usuário.
- **Dimensões e Proporções Confortáveis:**
  - Largura máxima: `w-full max-w-xl` (576px), garantindo espaçamento generoso para leitura, toques e digitação.
  - Card com estética obsidian e acabamento premium:
    - Fundo: `bg-[#0a0f1d]/95` com borda sutil `border-amber-500/30`
    - Sombra profunda: `shadow-2xl shadow-black/90`
    - Cantos arredondados: `rounded-2xl sm:rounded-3xl`
    - Micro-animação suave de entrada: fade-in e scale-up (`initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}`).

### 2.2 Hierarquia Interna de Conteúdo

1. **Header Executivo:**
   - Ícone com gradiente dourado/âmbar `MessageSquareHeart`
   - Badge institucional contextual: `"Sua Experiência"` ou `"Período de Testes"`
   - Título em destaque: `"Como está sendo sua experiência com a EnergivIA?"`
   - Subtítulo explicativo: `"Sua opinião direciona diretamente o desenvolvimento de novas ferramentas e melhorias."`
   - Botão sutil de fechar (`X`) no topo superior direito.
2. **Seletor de Estrelas (1 a 5) Ampliado:**
   - Estrelas grandes com feedback de hover e escala suave (`scale-110`).
   - Legenda descritiva com cor dinâmica correspondente à nota (Péssimo a Excelente).
3. **Tags Rápidas de Destaque:**
   - Chips selecionáveis com borda ativa para capturar os pontos fortes da plataforma em 1 clique.
4. **Área de Comentário Aumentada:**
   - Textarea com 3 a 4 linhas, placeholder contextual e tipografia nítida.
5. **Ações:**
   - Botão `"Avaliar mais tarde"` sutil à esquerda.
   - Botão principal `"Enviar Avaliação"` com gradiente de alta conversão à direita.
6. **Tela de Agradecimento Pós-Envio:**
   - Ícone `CheckCircle2` em esmeralda, mensagem de agradecimento calorosa e fechamento automático após 2 segundos.

### 2.3 Regra de Bloqueio Permanente ("Não aparecer mais após respondido")

1. **Frontend:**
   - Salva `energivia_feedback_submitted = "true"` e `energivia_feedback_submitted_${userId} = "true"` no `localStorage`.
   - Registra `energivia_feedback_auto_shown = "true"` para nunca disparar automaticamente mais de uma vez.
2. **Backend / API Status:**
   - Cria endpoint leve `GET /feedbacks/user-status` (ou `/api/feedbacks/status`) que verifica se o usuário autenticado (`userId` ou `tenantId` ou `userEmail`) já possui registros na tabela `PlatformFeedback`.
   - Se já respondeu, o frontend marca imediatamente `energivia_feedback_submitted = "true"` e não agenda o modal em hipótese alguma.
3. **Hub Flutuante:**
   - No menu do cérebro (`EnergiviaFloatingHub.tsx`), se o usuário já respondeu a avaliação, o botão "Avaliar EnergivIA" é ocultado, mantendo a interface leve e sem redundância.

---

## 3. Plano de Implementação

1. **Backend / API de Feedbacks:**
   - Criar endpoint `GET /feedbacks/status` para retornar `{ hasSubmitted: boolean }`.
   - Expor no `apps/web/src/app/api/feedbacks/status/route.ts` para consumo pelo cliente.
2. **Refatoração do Componente `FeedbackPromptCard.tsx`:**
   - Converter layout para modal centralizado com `backdrop-blur-md` e proporções `max-w-xl`.
   - Conectar checagem inicial de status (backend + localStorage).
   - Persistir status definitivo no sucesso do envio.
3. **Ajuste no `EnergiviaFloatingHub.tsx`:**
   - Sincronizar estado de resposta para ocultar o botão satélite de feedback se já tiver sido respondido.
4. **Validação:**
   - Testes automatizados no backend e validação de compilação/build do Next.js.
