# Design Doc: Destaque de Suporte Prioritário no Plano Plus

## 1. Contexto & Objetivo

No painel de gestão de assinaturas (`/gestao/meus-planos`), o **Plano Plus** é a opção voltada para empresas em grande escala e franquias. Para reforçar a percepção de alto valor e atender à demanda do cliente, o card do Plano Plus deve incluir:

1. Uma linha divisória horizontal limpa.
2. Logo abaixo da linha, um bloco profissional destacando que os assinantes deste plano têm acesso a **Suporte Prioritário Exclusivo / Dedicado**.

## 2. Abordagem Visual Escolhida

- **Posicionamento**: Entre a lista de recursos e o botão de ação inferior ("Plano Atual em Uso" / "Fazer Upgrade").
- **Divisor Horizontal**: `border-t border-slate-200/80 dark:border-white/10` para harmonizar com o design system sem excessos.
- **Card de Destaque**:
  - Container suave com bordas arredondadas (`rounded-2xl`).
  - Cores dinâmicas e sem contraste estridente:
    - Se for o plano atual ativo: acentos em esmeralda refinado (`emerald-500/10` e `border-emerald-500/20`).
    - Se for opção de upgrade: acentos em âmbar elegante (`amber-500/10` e `border-amber-500/20`).
  - Ícone: Lucide `<Headphones className="w-4 h-4" />`.
  - Título / Badge: `SUPORTE PRIORITÁRIO DEDICADO`.
  - Descrição: _"Assinantes deste plano contam com fila prioritária exclusiva e atendimento direto com especialistas técnicos."_

## 3. Arquitetura & Componentes Afetados

- `apps/web/src/app/(authenticated)/gestao/meus-planos/page.tsx`:
  - Adição do ícone `Headphones` na importação de `lucide-react`.
  - Renderização condicional do bloco para o Plano Plus (`isPlus`).
- `apps/web/src/components/TrialLockOverlay.tsx` (consistência visual opcional):
  - Inclusão do selo compacto de suporte prioritário no modal de bloqueio.

## 4. Diretrizes de Qualidade

- Sem emojis de WhatsApp.
- Sem gradientes neon ou glows artificiais.
- Responsivo em mobile, tablet e desktop.
- Compatibilidade estrita com Dark Mode e Light Mode.
