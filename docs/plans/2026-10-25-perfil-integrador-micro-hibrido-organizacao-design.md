# Documento de Design: Organização do Perfil do Integrador e Preferências de Microinversores e Inversores Híbridos

**Data:** 25 de Outubro de 2026  
**Status:** Aprovado pelo Usuário  
**Autor:** Antigravity (Pair Programming)

---

## 1. Problema e Objetivos

### 1.1 Sintomas Observados

1. **Falta de Variedade em Microinversores:** Em cotações via WhatsApp e Web para tecnologia `Microinversor`, todas as três opções (Standard, Elite, Premium) foram geradas com microinversores da marca **GoodWe**, levando à insatisfação do cliente final (_"Só tem inversor Goodwe?"_).
2. **Inexistência de Configuração no Perfil:** O integrador não possuía opções para configurar marcas de **Microinversores** ou **Inversores Híbridos** no "Perfil do Integrador", apenas Módulos e Inversores String tradicionais.
3. **Exclusão de Microinversores na API:** O endpoint `/brands/distributor-available` filtrava e excluía marcas de microinversores do catálogo e não agrupava produtos de inversores híbridos.
4. **Desorganização Visual da Interface:** A tela `/gestao/perfil-integrador` empilhava blocos extensos verticalmente em uma coluna contínua de mais de 4.000 pixels, gerando fadiga visual e desordem na configuração.

### 1.2 Objetivos

- **Redesign Arquitetural da Tela:** Reorganizar a interface em abas ergonômicas (_Regras Comerciais & kWp_ vs _Catálogo & Preferências de Marcas_), com alternador em pílulas (Segmented Pills) entre as 4 categorias de tecnologia:
  1. Módulos Fotovoltaicos
  2. Inversores Tradicionais (String)
  3. Microinversores (Deye, Hoymiles, NEP, SAJ, GoodWe, etc.)
  4. Inversores Híbridos & Armazenamento (Deye, Solis, Growatt, GoodWe, Huawei, etc.)
- **Persistência Completa no Backend:** Estender o modelo do Tenant/Organização para armazenar `microInverterBrandTiers` e `hybridInverterBrandTiers`, além dos compilados `preferredMicroInverterBrands` e `preferredHybridInverterBrands`.
- **Inteligência no Motor de Dimensionamento (`KitGenerationService`):**
  - Identificar a tecnologia selecionada (`microinverter` ou `hybrid`).
  - Aplicar as preferências e prioridades da respectiva tecnologia nos tiers (Standard, Elite, Premium).
  - Configurar defaults técnicos de mercado para que os tiers nunca repitam a mesma marca de microinversor quando houver alternativas disponíveis.
- **Sincronização no WhatsApp Bot:** Garantir que o bot no WhatsApp repasse a tecnologia correta e utilize os novos tiers especializados.

---

## 2. Arquitetura da Solução

### 2.1 Frontend (`apps/web`)

#### A. Estrutura da Página `PerfilIntegradorPage`

- **Cabeçalho Unificado:** Título, badge de setor e botão fixo de salvamento global ("Salvar Alterações") com feedback de carregamento e sucesso.
- **Abas Superiores (Root Tabs):**
  - **Aba 1: Regras Comerciais & kWp**
    - Layout em Grid de 2 Colunas equilibradas:
      - _Coluna Esquerda:_ Preço Base de Venda por kWp (com input monetário, presets rápidos de R$ 2.400 a R$ 3.500 e card de Impacto Estimado em Propostas para 3.5 kWp, 7 kWp, 15 kWp e 40 kWp).
      - _Coluna Direita:_ Taxas Padrão de Maquininha / Cartão de Crédito (métodos: Repassar Taxa, Juros a.m. ou Manual; parcelas 1x a 21x; simulação ao vivo para R$ 20.000,00 com valor de parcela e encargo embutido).
  - **Aba 2: Catálogo & Preferências de Marcas**
    - **Barra de Pílulas Segmentadas (Segmented Controls):**
      - `[ ☀️ Módulos (N) ]`
      - `[ ⚡ Inversores Tradicionais (N) ]`
      - `[ 🔌 Microinversores (N) ]`
      - `[ 🔋 Inversores Híbridos (N) ]`
    - Contadores visuais em cada pílula refletindo o número de marcas configuradas.
    - Renderização do `BrandTierSelector` específico com:
      - Marcas ativas com produtos no catálogo para aquela tecnologia.
      - 3 Quadrantes com profundidade: Standard (Econômico), Elite (Custo-Benefício) e Premium (Alta Performance).
      - Seleção de Marca Prioritária Principal com estrela dourada ★.
      - Botão "Sugestão Rápida" com preenchimento inteligente específico da tecnologia selecionada.

#### B. Sugestões Rápidas por Tecnologia

- **Módulos:**
  - Standard: Leapton, OSDA, DAH Solar, Resun
  - Elite: Astronergy, JA Solar, Trina Solar
  - Premium: Jinko Solar, Canadian Solar, LONGi Solar
- **Inversores Tradicionais (String):**
  - Standard: Solplanet, SAJ, Chint Power
  - Elite: GoodWe, Growatt, Deye
  - Premium: Sungrow, Huawei, Fronius
- **Microinversores:**
  - Standard: NEP, SAJ, Deye Micro, Tsun
  - Elite: Growatt, Deye, Hoymiles
  - Premium: GoodWe, Hoymiles, APsystems, Enphase
- **Inversores Híbridos:**
  - Standard: Deye, Growatt
  - Elite: GoodWe, Solis, Deye
  - Premium: Huawei, Fronius, Sungrow

---

### 2.2 Backend (`apps/api`)

#### A. `BrandsService` (`/brands/distributor-available`)

- Atualizar a resposta para retornar:
  ```typescript
  {
    modules: string[];
    inverters: string[];
    microInverters: string[];
    hybridInverters: string[];
  }
  ```
- Coletar marcas com produtos ativos nas categorias `microinverter` e `hybrid_inverter`, tanto de distribuidores quanto do catálogo base, eliminando o bloqueio artificial de microinversores.

#### B. Modelagem de Dados (`Tenant.settings` / `Organization`)

- Adicionar suporte a:
  - `microInverterBrandTiers?: BrandTierSelection | null`
  - `hybridInverterBrandTiers?: BrandTierSelection | null`
  - `preferredMicroInverterBrands?: string[]`
  - `preferredHybridInverterBrands?: string[]`
- Atualizar `OrganizationsService.update` e DTOs correspondentes.

#### C. `KitGenerationService`

- No método `generateDistributorTiers`:
  - Carregar `microInverterBrandTiers` e `hybridInverterBrandTiers` das configurações do tenant.
  - Se a tecnologia solicitada for `microinverter`, utilizar `microInverterBrandTiers` (ou `DEFAULT_TIER_MICRO_BRANDS`) nos tiers Standard, Elite e Premium.
  - Se a tecnologia solicitada for `hybrid`, utilizar `hybridInverterBrandTiers` (ou `DEFAULT_TIER_HYBRID_BRANDS`).
  - No método `buildTier`, passar as marcas corretas da tecnologia solicitada para o motor de dimensionamento (`sizeSolarSystem`).
  - Quando houver microinversores de marcas diferentes no catálogo (ex: GoodWe, Deye, NEP, Growatt, SAJ), garantir que cada tier priorize e selecione uma marca distinta, garantindo diversidade de opções para o cliente final.

#### D. `WhatsappBotService`

- Em `calculateDistributorKits`:
  - Repassar `inverterType` ("microinverter" | "hybrid") para `KitGenerationService`.
  - No fallback de contingência, utilizar `preferredMicroInverterBrands` e `preferredHybridInverterBrands` do tenant.

---

## 3. Plano de Testes e Validação

1. **Testes Unitários:**
   - Teste no `BrandsService` garantindo listagem correta de `microInverters` e `hybridInverters`.
   - Teste no `KitGenerationService` garantindo que cotação de microinversor distribua marcas distintas em Standard, Elite e Premium quando configurado no perfil ou pelos defaults.
   - Teste no `WhatsappBotService` validando o fluxo de cotação de microinversor com as marcas apropriadas.
2. **Validação de Build:**
   - Compilação do NestJS (`apps/api`) e Next.js (`apps/web`).
   - Lint e verificação de tipagens TypeScript.
3. **Sincronização:**
   - Commit semântico e push para a branch remota.
