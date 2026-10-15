# Design de Unificação Visual: Páginas de SEO e Institucionais (Dark Obsidian & Glassmorphism)

## 1. Contexto & Diagnóstico

A landing page principal da EnergivIA (`/`) adota uma identidade visual ultra-moderna em **dark obsidian** (`#02040a`), com tipografia Plus Jakarta Sans, cartões translúcidos (`.glass-card`, `.glass-panel`, `.glass-pill`), iluminação ambiente sutil em esmeralda/teal e logotipo oficial `/logo-dark.png`.

Entretanto, as páginas de conteúdo/SEO:

- `/proposta-energia-solar`
- `/simulacao-energia-solar`
- `/software-integrador-solar`
- `/crm-energia-solar`
  (renderizadas pelo componente `SeoIntentPage`) e as páginas institucionais:
- `/privacidade`
- `/termos-de-uso`

ainda utilizavam fundo claro/menta (`#edf5f5`), caixas brancas com bordas cinzas (`bg-white border-slate-200`) e logotipo legado para modo claro (`/logo.png`), criando quebra na experiência do usuário e inconsistência de marca.

---

## 2. Decisões Arquiteturais & Componentização

### 2.1. Componentes Reutilizáveis

1. **`LandingSubpageHeader` (`apps/web/src/components/landing/landing-subpage-header.tsx`):**
   - Cabeçalho escuro translúcido com `backdrop-blur-xl`, borda inferior sutil `border-white/10` e fundo `#02040a/70`.
   - Logotipo oficial `/logo-dark.png`.
   - Ações rápidas: Link de retorno à Home, link para Login e botão "Começar Agora &rarr;" estilizado com `.glass-pill`.
   - Drawer responsivo para dispositivos móveis.

2. **`LandingFooter` (`apps/web/src/components/landing/landing-footer.tsx`):**
   - Extração do rodapé corporativo completo da `page.tsx` para componente compartilhado.
   - Navegação completa: Como funciona, Resultados, Cenários, Diferenciais, FAQ, Demonstração, Entrar, Criar conta, Termos de Uso e Privacidade.
   - Identidade institucional com CNPJ e copyright atualizado.

### 2.2. Modernização do `SeoIntentPage`

- **Container Raiz:** `landing-page dark min-h-screen flex flex-col bg-[#02040a] text-white font-plus-jakarta` com `colorScheme: "dark"`.
- **Efeitos de Fundo:** Efeitos atmosféricos sutis com radial gradient esmeralda (`rgba(16,185,129,0.08)`) sem neon excessivo.
- **Hero Section:** Container `.glass-panel`, badge em `.glass-pill` esmeralda, título H1 de alto impacto visual e cards dos 3 pilares em `.glass-card`.
- **Diagnóstico:** Cartão `.glass-card` com chanfro superior de luz e tipografia `text-slate-300`.
- **Fluxo Recomendado:** Grade de passos com numeração destacada em verde esmeralda e transição de hover suave.
- **Aplicações Práticas:** Grade 2 colunas com cards `.glass-card` e micro-interação.
- **Comparativo Operacional:** Tabela com linhas escuras, bordas `border-white/5` e coluna EnergivIA realçada com fundo translúcido esmeralda.
- **FAQ:** Accordions com `.glass-card` e resposta com tipografia limpa.
- **CTA Final:** Banner translúcido com gradiente escuro esmeralda, botão de alta visibilidade e botão de WhatsApp institucional sem emojis.
- **Rodapé:** Integração com `LandingFooter`.

### 2.3. Modernização de `/privacidade` e `/termos-de-uso`

- Blindagem com `landing-page dark min-h-screen bg-[#02040a] text-white font-plus-jakarta`.
- `LandingSubpageHeader` com navegação de retorno.
- Artigo com leitura agradável em `.glass-panel` e `.glass-card`.
- Badges de conformidade legal (LGPD e Responsabilidade Técnica) em `.glass-pill`.
- Ícones com destaque esmeralda e textos com excelente contraste (`text-slate-300`).
- Integração com `LandingFooter`.

---

## 3. Diretrizes de Qualidade

- Zero emojis de WhatsApp.
- Sem gradientes neon estourados ou sombras artificiais.
- Sem travamento de subagente browser local em páginas de autenticação.
- Validação completa com `next build` e testes automatizados.
