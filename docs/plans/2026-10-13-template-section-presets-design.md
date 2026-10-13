# Design Doc: Modelos Pré-Prontos de 1-Clique para Seções do Editor (Depoimentos & FAQ)

## 1. Contexto & Problema

No editor de templates de proposta comercial, o integrador solar precisa cadastrar conteúdos repetitivos como depoimentos de clientes e perguntas frequentes (FAQ). Atualmente, a interface oferece apenas o botão de adicionar linha em branco, exigindo que o integrador pense e digite do zero nomes, subtítulos, textos e perguntas. Isso gera atrito, atrasa a criação de modelos e resulta em propostas com textos genéricos ou incompletos.

## 2. Objetivo

Permitir que o integrador insira depoimentos e perguntas frequentes reais, de alta conversão no mercado fotovoltaico brasileiro, com apenas 1 clique através de um menu de modelos categorizados (ex.: Residencial, Comercial, Rural, Industrial no caso de depoimentos; e Funcionamento, Garantias e Financeiro no caso de FAQ), mantendo total liberdade para edição posterior.

## 3. Escopo

- **Seção de Depoimentos (`testimonials`):**
  - Categorias: Residencial, Comercial, Rural / Agronegócio, Industrial.
  - Campos preenchidos: Nome, Subtítulo (segmento/cidade), Texto (relato realista sobre economia e pós-venda).
- **Seção de Perguntas Frequentes (`faq`):**
  - Categorias: Funcionamento & Rede, Garantias & Manutenção, Economia & Payback, Padrão & Concessionária.
  - Campos preenchidos: Pergunta e Resposta técnica/comercial clara.
- **Botão de Ação:**
  - Inserido junto ao botão de "+ Adicionar", com visual refinado, ícone e popover categorizado.
  - Preservação do botão existente para adicionar em branco.

## 4. Arquitetura da Solução

### 4.1. Banco de Presets (`src/components/proposals/editor/presets/template-section-presets.ts`)

Estrutura de dados tipada contendo os modelos fotovoltaicos:

```typescript
export interface SectionPresetItem {
  id: string;
  category: string;
  title: string;
  preview: string;
  data: Record<string, string>;
}

export interface SectionPresetGroup {
  sectionType: "testimonials" | "faq";
  category: string;
  items: SectionPresetItem[];
}
```

#### Conteúdos de Depoimentos:

1. **Residencial:**
   - _Família Silva (Residencial)_: "Redução de R$ 980 para a taxa mínima. Hoje usamos o ar-condicionado em todos os quartos sem medo da conta."
   - _Ana Clara (Residencial)_: "Processo muito ágil da homologação à instalação. Telhado limpo e equipe super educada."
   - _Carlos Eduardo (Casa de Praia)_: "Gero crédito na cidade e compenso na casa de praia. O sistema já se pagou."
2. **Comércio:**
   - _Mercado & Padaria Central (Comércio)_: "Câmaras frias e fornos consumiam todo nosso lucro. Reduzimos o custo fixo em mais de 90%."
   - _Clínica Odontológica São Paulo (Comércio)_: "Instalação rápida de fim de semana sem atrapalhar nosso atendimento aos pacientes."
3. **Rural / Agro:**
   - _Fazenda Boa Esperança (Agronegócio)_: "Irrigação e bomba d'água funcionando o dia todo com energia do sol. Mudou a rentabilidade da safra."
   - _Sítio Recanto (Produtor de Leite)_: "Resfriadores de leite rodando 24h sem susto na conta de luz no final do mês."
4. **Industrial:**
   - _Metalúrgica São José (Industrial)_: "Nossa fatura de média tensão caiu drasticamente. Investimento estratégico para a competitividade da fábrica."

#### Conteúdos de FAQ:

1. **Funcionamento & Rede:**
   - _"O que acontece em dias nublados ou chuvosos?"_ -> "O sistema continua gerando energia através da radiação difusa, mesmo com céu encoberto ou chuva fraca."
   - _"E se faltar luz na rede pública da concessionária?"_ -> "Por segurança técnica (anti-ilhamento), o inversor on-grid desliga automaticamente para proteger os operadores da rede."
   - _"Como funciona a compensação de créditos de energia?"_ -> "Toda energia gerada e não consumida instantaneamente é injetada na rede, gerando créditos válidos por até 60 meses."
2. **Garantias & Durabilidade:**
   - _"Qual é a vida útil dos módulos e inversores?"_ -> "Os painéis solares têm garantia de desempenho de 25 a 30 anos e vida útil superior a 35 anos. Os inversores duram de 10 a 15 anos."
   - _"O sistema necessita de muita manutenção?"_ -> "Não. A chuva realiza a maior parte da limpeza dos módulos. Recomenda-se apenas uma inspeção visual e lavagem 1 a 2 vezes por ano."
3. **Economia & Imóvel:**
   - _"A instalação de energia solar valoriza o imóvel?"_ -> "Sim. Estudos imobiliários apontam valorização média de 6% a 10%, além de tornar o imóvel muito mais atrativo para venda ou locação."
   - _"Em quanto tempo recupero o investimento (payback)?"_ -> "O retorno médio ocorre entre 2,5 e 4 anos, proporcionando mais de 20 anos de energia praticamente gratuita após quitado."

### 4.2. Componente de UI (`SectionPresetsMenu.tsx`)

- Renderiza botão compacto com ícone de `Sparkles` ("Modelos prontos").
- Abre popover flutuante com abas por categoria (ex.: Todos, Residencial, Comércio, Rural, etc.).
- Ao clicar no item, chama `onSelect(presetData)` que insere o item imediatamente na tabela de dados da seção do editor.
- Ao clicar fora ou selecionar, fecha suavemente.

### 4.3. Integração em `renderers.tsx`

- No `renderTableField`, verifica se o campo `items` pertence à seção `testimonials` ou `faq`.
- Se pertencer, renderiza o `SectionPresetsMenu` ao lado do botão padrão `field.tableAddRowLabel`.

## 5. Plano de Testes e Validação

1. **Testes Unitários:**
   - Testar o catálogo de presets garantindo que todas as categorias e campos obrigatórios de `testimonials` e `faq` estão presentes e válidos.
   - Testar inserção do preset no array de items do formulário.
2. **Validação de Interface & Linter:**
   - Executar `vitest run` e `eslint` sem erros.
3. **Persistência & Visual:**
   - Confirmar que a inserção reflete imediatamente no Preview dinâmico do template sem falhas de layout.
