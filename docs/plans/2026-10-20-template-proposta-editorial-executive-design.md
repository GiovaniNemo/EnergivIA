# Design Doc: Template de Proposta Comercial Completa "Editorial Solar Executive"

## 1. Contexto & Objetivo

No mercado de energia solar fotovoltaica, a proposta comercial é o ponto focal de conversão de clientes. Uma proposta incompleta, com visual amador ou sem fotos reais diminui drasticamente a confiança do contratante.

O objetivo deste projeto é disponibilizar um modelo de proposta completo, profissional e de altíssima conversão dentro da EnergivIA, denominado **Editorial Solar Executive**. Este template conta com 16 seções estratégicas ativas, tipografia Inter refinada, paleta institucional nobre (branco/esmeralda) e fotografias reais em alta resolução de instalações fotovoltaicas residenciais e comerciais de padrão internacional (sem fotos geradas por IA, sem marcas d'água e sem emojis).

## 2. Identidade Visual & Configuração Global de Estilos

- **Tema de Cores:**
  - `backgroundColor`: `#FAFFFC` (branco sutil institucional, alto conforto visual)
  - `textColor`: `#0F172A` (slate escuro de alto contraste e legibilidade)
  - `primaryColor`: `#059669` (verde esmeralda nobre para acentos, títulos e botões)
  - `secondaryColor`: `#10B981` (verde luminoso para gráficos e indicadores)
- **Tipografia:**
  - `fontFamily`: `Inter`
  - `preset`: `medium` (titleSize: 30, subtitleSize: 20, bodySize: 14)
- **Layout & Acabamento:**
  - `pageWidth`: `medium`
  - `spacing`: `normal`
  - `borderRadius`: `16px`
  - `shadowIntensity`: `3`
- **Capa Global & Rodapé:**
  - `cover`: Imagem real de alta resolução de telhado solar monocristalino contemporâneo, overlay sutil para leitura perfeita e título dinâmico com tokens.
  - `footer`: Nome institucional da empresa integradora (`{{nome_empresa}}`), canais de contato e numeração de página ativa.

## 3. Arquitetura das 16 Seções Estratégicas

1. **Capa (`cover` - `hero-cinematic`):**
   - Imagem de fundo real fotográfica em alta definição.
   - Título: "Estudo de Viabilidade Fotovoltaica para {{nome_cliente}}".
   - Subtítulo com data de elaboração e escopo técnico.
   - Selo / Badge: "Projeto de Engenharia Personalizado".

2. **Introdução (`introduction` - `carta`):**
   - Saudação formal e cordial ao cliente.
   - Contextualização do levantamento técnico realizado e apresentação dos objetivos: autossuficiência, sustentabilidade e redução tarifária duradoura.

3. **Sobre a Empresa (`about_company` - `split-proof`):**
   - Fotografia real de engenheiro e equipe de montagem em campo.
   - Indicadores de credibilidade (Selo de homologação junto à concessionária, projetos entregues, responsabilidade técnica ART).
   - Manifesto de conformidade com normas ABNT NBR 16690 e segurança NR-10/NR-35.

4. **Diagnóstico Energético (`diagnostic_energy` - `cards`):**
   - Apresentação visual dos impactos negativos do modelo convencional: inflação contínua da tarifa de energia, bandeiras tarifárias imprevistas e vulnerabilidade da rede.
   - Destaque da independência energética conquistada com o gerador solar.

5. **Nossa Solução (`solution` - `cards`):**
   - Três benefícios centrais:
     1. _Economia Imediata_: Redução de até 95% na fatura de energia.
     2. _Valorização Patrimonial_: Valorização imediata do imóvel comercial ou residencial.
     3. _Monitoramento em Tempo Real_: Acompanhamento de geração 24/7 direto no smartphone.

6. **Geração & Consumo (`generation_consumption` - `modern`):**
   - Matriz sazonal com 12 meses de dados comparativos (kWh consumido vs kWh gerado).
   - Previsão de geração anual e cobertura percentual das necessidades energéticas.

7. **Equipamentos da Proposta (`proposal_equipment` - `cards`):**
   - Módulos solares Tier 1 monocristalinos de alta eficiência com tecnologia Half-Cell / N-Type.
   - Inversor solar inteligente com monitoramento Wi-Fi e proteções elétricas integradas.
   - Estrutura de fixação em alumínio anodizado de alta durabilidade e cabos solares com proteção UV.

8. **Galeria de Obras Realizadas (`gallery` - `grid_uniform`):**
   - Grade uniforme com 4 imagens reais de obras fotovoltaicas finalizadas com acabamento de alto padrão.
   - Demonstração visual de qualidade na organização de cabos e estética da instalação.

9. **Poder de Compra & Economia (`economy_purchases` - `split`):**
   - Projeção de economia acumulada ao longo de 25 anos.
   - Comparação prática do valor poupado em realizações concretas (reforma, estudos, reservas de investimento ou expansão do negócio).

10. **Investimento (`pricing` - `table`):**
    - Modelo comercial Turn-Key (chave na mão) detalhando tudo o que está incluso: projeto elétrico, aprovação na concessionária, materiais, instalação física e seguro.

11. **Condições & Formas de Pagamento (`financing` - `default`):**
    - À vista com bonificação comercial especial.
    - Parcelamento flexível no cartão de crédito.
    - Linhas de financiamento solar bancário com até 120 dias de carência, onde a parcela mensal é paga com a própria economia da conta de luz.

12. **Garantias Técnicas (`guarantees` - `cards`):**
    - 25 anos de garantia de geração linear dos módulos fotovoltaicos.
    - 10 a 12 anos de garantia de fábrica para o inversor.
    - Garantia total de instalação e suporte de pós-venda.

13. **Etapas do Processo (`process_steps` - `vertical`):**
    - Roteiro sequencial em 4 etapas claras:
      1. Formalização e assinatura digital do contrato.
      2. Visita técnica de engenharia e protocolo na concessionária.
      3. Montagem das estruturas e fixação dos equipamentos.
      4. Vistoria final da concessionária e troca do medidor para bidirecional.

14. **Depoimentos (`testimonials` - `overlap`):**
    - Relatos autênticos de clientes reais atendidos pela integradora, atestando a tranquilidade com uso de climatização e cumprimento dos prazos prometidos.

15. **Perguntas Frequentes (`faq` - `two_column`):**
    - Respostas às dúvidas mais recorrentes: geração em dias nublados ou chuvosos, manutenção e limpeza, validade de créditos (60 meses) e segurança contra descargas elétricas.

16. **Assinatura & Fechamento (`signature` - `default`):**
    - Termo formal de aceite para validação do cliente e dados do responsável técnico da integradora.

## 4. Estratégia de Implementação e Persistência

1. **Catálogo de Blueprints Oficiais (`ProposalTemplateBlueprint`):**
   - Criação/atualização do registro blueprint oficial com o documento JSON completo, publicado e com prioridade no catálogo.
2. **Template Ativo da Organização (`ProposalTemplate`):**
   - Instanciação do template como modelo padrão oficial da organização do usuário (`cmru2xi440002229w24hdusch`), já pronto para emissão imediata.
3. **Validação:**
   - Verificação de parsing do JSON do editor (`ProposalEditorDocument`), checagem dos seletores de fotos reais e teste de integridade com Vitest.
