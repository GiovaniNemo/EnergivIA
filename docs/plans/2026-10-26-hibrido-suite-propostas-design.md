# Design Doc: Suíte de Seções Híbridas de Alto Impacto para Propostas Comerciais

## 1. Contexto e Motivação

Sistemas fotovoltaicos híbridos com baterias (BESS) e Off-Grid possuem um ticket médio significativamente mais elevado que os sistemas convencionais On-Grid. O cliente final não adquire baterias buscando apenas abatimento de tarifa (kWh/R$), mas sim **segurança energética, independência da rede da distribuidora e conforto absoluto contra apagões**.

A versão anterior contava apenas com uma única seção básica (`storage_backup`) que apresentava caixas métricas simplistas e um mockup visual no modal com elementos esteticamente desalinhados (`[🔋 BESS]` e `[⚡ EPS]`).

Este documento estabelece o design de uma **Suíte de 3 Seções Especializadas**, com alto poder de convencimento comercial, argumentos de vendas sólidos e design ultra-moderno e fluido no padrão visual do Google Antigravity.

---

## 2. As 3 Seções Especializadas

### 2.1. Seção 1: `storage_backup` (Armazenamento Inteligente & Banco BESS)

- **Foco**: O poder do equipamento de armazenamento e robustez do hardware.
- **Conteúdo**:
  - Capacidade total e útil de armazenamento (kWh).
  - Potência de saída contínua do EPS / Backup (kW) e potência de pico.
  - Tecnologia química avançada: **LiFePO4 (Lítio Ferro Fosfato)** — química de máxima segurança contra incêndio e degradação térmica.
  - Ciclo de vida estendido: **6.000 a 8.000 ciclos** (>15 anos de durabilidade com 90% DoD).
  - Comutação automática tipo No-Break em **< 10ms** (imperceptível para eletrônicos, servidores e home office).
  - 10 anos de garantia de fábrica.
- **Variantes de Estilo**:
  - `cards`: métricas em cards contemporâneos com linhas sutis.
  - `technical`: tabela detalhada de engenharia e certificações.
  - `executive`: layout minimalista de alto padrão.

### 2.2. Seção 2: `hybrid_flow` (Ecossistema Energético 24h & Modos de Operação)

- **Foco**: Como a casa/empresa funciona de dia, de noite e durante um apagão.
- **Conteúdo**:
  - **🌞 Cenário 1: Durante o Dia**: Geração solar alimenta as cargas do imóvel e a sobra de energia recarrega as baterias a custo zero.
  - **🌙 Cenário 2: Durante a Noite**: As baterias assumem o suprimento das cargas, evitando comprar energia cara da rede no horário de ponta.
  - **⚡ Cenário 3: Queda da Rede da Concessionária (Blackout)**: O inversor híbrido desconecta a rede externa em menos de 10ms (função anti-ilhamento) e assume o circuito de cargas críticas de forma 100% autônoma.
- **Componentes Visuais**:
  - Infográfico linear com 3 blocos bem espaçados, ícones estilizados, micro-interações de hover e narrativa de vendas irresistível.

### 2.3. Seção 3: `critical_loads_autonomy` (Cargas Críticas Protegidas vs Gerador a Combustível)

- **Foco**: Provar o valor do investimento respondendo com clareza "O que continua ligado na minha casa?".
- **Conteúdo**:
  - **Matriz de Cargas Protegidas**:
    - 🧊 Refrigerador & Freezers: Alimentos e medicamentos preservados 24h+.
    - 💻 Internet, Roteadores & Home Office: Trabalho e conectividade sem interrupção.
    - 💡 Iluminação Essencial & Tomadas: Conforto e segurança da família.
    - 🛡️ Portão Eletrônico, Câmeras & Alarmes: Acesso e monitoramento garantidos.
  - **Quadro Comparativo: Bateria Solar Híbrida vs Gerador a Combustível**:
    - _Bateria Solar_: 100% silenciosa, sem fumaça/gás tóxico, acionamento automático em milissegundos, combustível 100% gratuito (Sol), zero manutenção de óleo/velas.
    - _Gerador a Combustível_: Muito barulhento (proibido em vários condomínios à noite), fumaça poluente, estocagem perigosa de combustível inflamável, manutenção frequente e partida manual.

---

## 3. Redesign Visual no Modal de Adicionar Seção (`AddSectionModal.tsx`)

1. **Remoção dos elementos feios**:
   - Remover os botõezinhos `[🔋 BESS]` e `[⚡ EPS]`.
   - Remover o badge amarelo esmagado sobre o mockup.
2. **Novos Mockups Wireframe Limpos**:
   - `storage_backup`: mockup geométrico abstrato de bateria modular e indicadores de nível elegantes com `MockBar`.
   - `hybrid_flow`: mockup de 3 nós conectados simulando o ciclo solar, bateria e rede.
   - `critical_loads_autonomy`: mockup de lista de cargas com checkmarks e comparativo minimalista.
3. **Badges de Exclusividade Híbrido**:
   - Badge minimalista e integrado, posicionado de forma limpa sem quebrar as linhas do card.

---

## 4. Integração com a Plataforma

- **Types (`types.ts`)**: inclusão de `"hybrid_flow"` e `"critical_loads_autonomy"` no `SectionType`.
- **Field Configs (`section-fields.ts`)**: registro de campos editáveis, categorias, labels e valores padrão.
- **Section Registry (`section-registry.tsx`)**: renderizadores visuais das seções no editor e na proposta pública/PDF.
- **WhatsApp Bot**: templates que utilizarem qualquer uma dessas 3 seções são classificados como híbridos compatíveis.
