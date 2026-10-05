# Dimensionamento de Kits com Múltiplos Inversores e Seleção Flexível

## 1. Visão Geral e Contexto

Atualmente, o motor de dimensionamento de kits solares (`solar-sizing.service.ts`, `KitGenerationService` e rota de chat) foi concebido assumindo estritamente **1 único inversor** por kit.

Quando um cliente possui uma conta de energia alta (ex.: usinas de 30 kWp a 150 kWp+) e a potência do arranjo ultrapassa a capacidade máxima ou o limite de sobrecarga (Overload) do maior inversor cadastrado no distribuidor/estoque, o dimensionamento falha e retorna nulo (`"Não foi possível montar o kit: catálogo sem módulo/inversor compatível"`). Além de travar o fluxo na plataforma web, isso impede o bot do WhatsApp de retornar uma cotação para clientes de médio e grande porte.

Além disso, para projetos menores ou telhados com múltiplas orientações/águas, o integrador não possuía a opção de escolher explicitamente 2 ou mais inversores menores em vez de 1 único.

---

## 2. Requisitos e Regras de Negócio

### 2.1. Prioridade Padrão: 1 Único Inversor

- Para qualquer tamanho de usina solicitado (ex.: 5 kWp, 40 kWp, 75 kWp):
  - O sistema **sempre tenta primeiramente encontrar 1 único inversor** que atenda à demanda dentro dos limites técnicos (faixas de MPPT, corrente máxima de entrada e faixa de overload CC/CA de 100% a 150% do fabricante).
  - Exemplo: se o sistema precisa de 40 kWp e o catálogo possui inversor de 40 kW ou 50 kW compatível, o sistema seleciona **1 inversor**. Ele **NÃO** deve dividir em 2x 20 kW por padrão.

### 2.2. Fallback Automático para Múltiplos Inversores (Apenas se Exceder Limite Técnico)

- Se **nenhum inversor individual** no catálogo tiver capacidade para suportar a usina (ex.: usina de 120 kWp onde o maior inversor disponível é de 60 kW ou 75 kW):
  - O motor calcula o menor multiplicador $N \ge 2$ de inversores necessários para atender à potência da usina.
  - **Regra de Compatibilidade Homogênea (Marca e Modelo Idênticos):** Todos os inversores adicionados a mais no kit **devem obrigatoriamente ser do mesmo fabricante e mesmo modelo** (ex.: 2x GoodWe GW50K-MT). É estritamente proibido misturar marcas (ex.: GoodWe com Growatt) ou modelos incompatíveis no mesmo arranjo para prevenir erros de instalação, incompatibilidade de comunicação/monitoramento e desbalanceamento de fases.
  - O arranjo de módulos é dividido de forma equilibrada entre os $N$ inversores ($\lfloor Q_{módulos} / N \rfloor$), garantindo que as strings de cada unidade atendam às tensões mínima e máxima de MPPT.

### 2.3. Controle Manual pelo Integrador (Plataforma Web)

- No card de edição de equipamentos da proposta (`ProposalEquipmentEditorCard`):
  - O integrador ganha um seletor explícito de **Quantidade de Inversores**:
    - `Automático` _(Padrão: 1 inversor se couber; escala se exceder)_
    - `1 Inversor`
    - `2 Inversores`
    - `3 Inversores`
    - `4 Inversores`
  - Caso o integrador selecione manualmente 2 inversores para um kit menor (ex.: usina de 10 kWp dividida em 2x 5 kW), o sistema recalcula buscando o melhor inversor de 5 kW (da mesma marca) e divide o arranjo.
  - Na tabela de itens da proposta, a linha de inversores passa a permitir ajuste de quantidade ou substituição consistente.

### 2.4. Microinversores e Inversores Híbridos

- **Microinversores:** O dimensionamento modular já é natural por canais ($Q_{micros} = \lceil Q_{módulos} / canais \rceil$). O sistema consolida todos os microinversores como itens do kit multiplicando a quantidade pelo preço unitário e informando a configuração correta.
- **Inversores Híbridos:** Seguem a mesma lógica do inversor string: tenta 1 único híbrido; se o consumo exceder a potência do maior híbrido disponível (ou se o integrador forçar), calcula $N$ híbridos idênticos da mesma marca para operar em paralelo.

### 2.5. Reflexo no WhatsApp e Apresentação

- No WhatsApp (`whatsapp-bot.service.ts` e `whatsapp-formatter.service.ts`):
  - Em vez de texto estático `1x Inversor`, exibir a quantidade real dimensionada:
    `• {N}x Inversor {Marca} {Potência}kW` (ou `• {N}x Inversores {Marca} {Potência}kW` no plural quando $N > 1$).
  - O cálculo do custo dos materiais multiplica o valor unitário do inversor pela quantidade $N$.

---

## 3. Arquitetura e Contratos de Dados

### 3.1. `solar-sizing.service.ts` & `types.ts`

- Atualizar `StringSizingResult`:
  ```typescript
  export interface StringSizingResult {
    module: ProductWithSpecs<ModuleSpec>;
    inverter: ProductWithSpecs<StringInverterSpec>;
    module_quantity: number;
    inverter_quantity: number; // Suporte a 1 ou N inversores idênticos
    string_configuration: StringConfiguration; // Por inversor ou total
    validated: {
      voltage: boolean;
      current: boolean;
      dc_ac_ratio: boolean;
    };
  }
  ```
- Atualizar `SolarSizingInput`:
  ```typescript
  export interface SolarSizingInput {
    system_kw: number;
    preferred_module_brand?: string;
    preferred_module_id?: string;
    preferred_inverter_brands?: string[];
    target_inverter_qty?: number; // Manual override (ex: 2) ou undefined para automático
    modules: ProductWithSpecs<ModuleSpec>[];
    stringInverters: ProductWithSpecs<StringInverterSpec>[];
    microInverters: ProductWithSpecs<MicroInverterSpec>[];
  }
  ```

### 3.2. `KitGenerationService` (`kit-generation.service.ts`)

- Adicionar `target_inverter_qty?: number` em `GenerateKitInput`.
- Ao gerar as linhas do kit (`kitItems`), calcular o total do inversor multiplicando pela quantidade real:
  ```typescript
  const inverterQuantity = isStringSizingResult(sizingResult)
    ? sizingResult.inverter_quantity || 1
    : sizingResult.microinverter_quantity;
  ```
- Atualizar `DistributorTierKit` com `inverter_qty: number`.

### 3.3. `whatsapp-bot.service.ts` & `whatsapp-formatter.service.ts`

- Utilizar `t.inverter_qty` (ou `inverter.quantity`) na composição da mensagem e no item estruturado do kit (`structuredItems`), evitando valor hardcoded de `1x Inversor`.
