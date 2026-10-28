export const CONTRACT_PF_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Prestação de Serviços e Fornecimento de Usina Solar</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
      background: #ffffff;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    html {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background-color: #ffffff !important;
      color: #1e293b;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      min-height: 100%;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table {
      display: table;
      width: 100%;
    }
    .header-row {
      display: table-row;
    }
    .header-logo-cell {
      display: table-cell;
      vertical-align: middle;
      width: 30%;
      text-align: left;
    }
    .header-title-cell {
      display: table-cell;
      vertical-align: middle;
      width: 70%;
      text-align: right;
    }
    .title {
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .subtitle {
      font-size: 8.5pt;
      color: #059669;
      font-weight: 600;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #0f172a;
      border-left: 3px solid #059669;
      padding-left: 8px;
      page-break-after: avoid !important;
      break-after: avoid !important;
      break-after: avoid-page !important;
    }
    p, li {
      text-align: justify;
      margin: 0 0 6px 0;
      orphans: 2;
      widows: 2;
    }
    ul {
      margin: 4px 0 8px 18px;
      padding: 0;
    }
    li {
      margin-bottom: 4px;
    }
    .box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin: 8px 0;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .grid {
      display: table;
      width: 100%;
    }
    .row {
      display: table-row;
    }
    .cell {
      display: table-cell;
      padding: 3px 6px;
      font-size: 9pt;
      vertical-align: top;
    }
    .cell-label {
      font-weight: 600;
      color: #475569;
      width: 28%;
    }
    table.data-table {
      width: 100%;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      font-size: 8.5pt;
      margin: 8px 0;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    table.data-table thead {
      display: table-header-group !important;
    }
    table.data-table tbody {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    table.data-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
    }
    table.data-table th, table.data-table td {
      border-top: 1px solid #cbd5e1;
      border-left: 1px solid #cbd5e1;
      padding: 5px 8px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box;
      background-color: #ffffff;
    }
    table.data-table th:last-child, table.data-table td:last-child {
      border-right: 1px solid #cbd5e1;
    }
    table.data-table tbody tr:last-child td {
      border-bottom: 1px solid #cbd5e1;
    }
    table.data-table th {
      background-color: #f1f5f9 !important;
      font-weight: 700;
      color: #0f172a;
      text-align: left;
    }
    .signatures-wrapper {
      margin-top: 25px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO COM LOGO DA EMPRESA E TÍTULO -->
  <div class="header">
    <div class="header-table">
      <div class="header-row">
        <div class="header-logo-cell">
          {{bloco_logo_empresa}}
        </div>
        <div class="header-title-cell">
          <h1 class="title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE SISTEMA FOTOVOLTAICO</h1>
          <p class="subtitle">Microgeração / Minigeração Distribuída — Marco Legal da GD (Lei nº 14.300/2022)</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 1. DAS PARTES -->
  <div class="section-title">1. DAS PARTES E QUALIFICAÇÃO</div>
  <p>Pelo presente instrumento particular, têm entre si, justas e contratadas:</p>
  <p>
    <strong>CONTRATADA (Integradora Solar):</strong> {{qualificacao_contratada}}
  </p>
  <p>
    <strong>CONTRATANTE (Cliente Titular):</strong> {{qualificacao_contratante}}
  </p>

  <!-- 2. DO MARCO REGULATÓRIO -->
  <div class="section-title">2. DO MARCO REGULATÓRIO E PREMISSAS TÉCNICAS</div>
  <p>
    2.1. O presente instrumento é regido e executado em estrita conformidade com a <strong>Lei Federal nº 14.300/2022</strong> (Marco Legal da Microgeração e Minigeração Distribuída), a <strong>Resolução Normativa ANEEL nº 1.000/2021</strong>, e as normas técnicas da Associação Brasileira de Normas Técnicas (ABNT), em especial a <strong>NBR 5410</strong> (Instalações Elétricas em Baixa Tensão), <strong>NBR 16690</strong> (Instalações Fotovoltaicas) e <strong>NBR 16149</strong>.
  </p>
  <p>
    2.2. A energia ativa excedente gerada pelo sistema e injetada na rede da Distribuidora <strong>{{concessionaria}}</strong> será cedida a título de empréstimo gratuito e convertida em créditos de energia no âmbito do Sistema de Compensação de Energia Elétrica (SCEE), observadas as regras de transição vigentes.
  </p>

  <!-- 3. DO OBJETO -->
  <div class="section-title">3. DO OBJETO E DO LOCAL DE INSTALAÇÃO</div>
  <p>
    3.1. O presente Contrato tem por objeto a prestação de serviços de engenharia e fornecimento para implantação de uma central geradora solar fotovoltaica conectada à rede (On-Grid), com potência nominal de pico de <strong>{{potencia_kwp}} kWp</strong>, compreendendo:
  </p>
  <ul>
    <li>Elaboração do projeto executivo de engenharia elétrica e emissão da respectiva Anotação de Responsabilidade Técnica (ART/CREA) ou Termo de Responsabilidade Técnica (TRT/CFT);</li>
    <li>Fornecimento e intermediação dos equipamentos e materiais descritos na Cláusula 4ª;</li>
    <li>Montagem mecânica das estruturas de fixação, fixação dos módulos, cabeamento em corrente contínua (CC) e alternada (CA) e instalação dos quadros de proteção (String Box);</li>
    <li>Protocolo, gestão regulatória e assessoria perante a concessionária <strong>{{concessionaria}}</strong> para aprovação de vistoria e solicitação de troca/parametrização do medidor bidirecional.</li>
  </ul>
  <p>
    3.2. <strong>Local de Instalação:</strong> O sistema será implantado no imóvel situado na <strong>{{endereco_instalacao}}</strong>, no município de <strong>{{cidade_instalacao}} - {{estado_instalacao}}</strong>, CEP <strong>{{cep_instalacao}}</strong>, Unidade Consumidora (UC) nº <strong>{{numero_uc}}</strong>.
  </p>

  <!-- 4. DOS EQUIPAMENTOS -->
  <div class="section-title">4. DOS EQUIPAMENTOS E MATERIAIS</div>
  <p>
    4.1. O gerador fotovoltaico contratado é composto pelos itens descritos a seguir:
  </p>
  {{tabela_equipamentos}}
  <p>
    4.2. Os módulos fotovoltaicos e inversores fornecidos possuem, obrigatoriamente, registro e certificação de qualidade e eficiência homologados pelo <strong>INMETRO</strong>.
  </p>
  <p>
    4.3. Na hipótese de descontinuidade fabril ou falta temporária de algum item no distribuidor, a CONTRATADA poderá substituí-lo por outro de tecnologia, potência, eficiência e garantia iguais ou superiores, sem qualquer custo adicional para o(a) CONTRATANTE, mediante comunicação prévia.
  </p>

  <!-- 5. DO VALOR E FORMA DE PAGAMENTO -->
  <div class="section-title">5. DO VALOR E CONDIÇÕES DE PAGAMENTO</div>
  <p>
    5.1. Pela execução completa do objeto (equipamentos, engenharia, ART/TRT, instalação e homologação), o(a) CONTRATANTE pagará à CONTRATADA o valor global certo e irreajustável de <strong>{{valor_total}}</strong>.
  </p>
  <p>
    5.2. O montante estipulado será quitado na seguinte modalidade: <strong>{{forma_pagamento}}</strong>.
  </p>
  <p>
    5.3. Os pagamentos deverão ser realizados exclusivamente nas contas de titularidade oficial da CONTRATADA ou via chave PIX: <strong>{{chave_pix}}</strong>.
  </p>
  <p>
    5.4. Em caso de atraso injustificado no pagamento de parcelas, incidirá multa moratória de 2% (dois por cento), juros moratórios de 1% (um por cento) ao mês <em>pro rata die</em> e atualização monetária pelo índice IPCA/IBGE.
  </p>

  <!-- 6. DOS PRAZOS DE EXECUÇÃO -->
  <div class="section-title">6. DOS PRAZOS DE EXECUÇÃO E DO CRONOGRAMA</div>
  <p>
    6.1. O prazo regulamentar estimado para a conclusão dos serviços de engenharia, entrega de equipamentos, montagem física e protocolo de solicitação de vistoria é de <strong>{{prazo_dias}} dias corridos</strong>, contados a partir da confirmação do pagamento inicial/aprovação do financiamento e fornecimento integral da documentação pelo(a) CONTRATANTE.
  </p>
  <p>
    6.2. <strong>Suspensão Automática de Prazos:</strong> O prazo previsto neste instrumento será automaticamente suspenso e estendido em decorrência de:
  </p>
  <ul>
    <li>Prazos e trâmites de análise, vistoria e troca de medidor exclusivos da Distribuidora <strong>{{concessionaria}}</strong>, que fogem ao controle direto da CONTRATADA;</li>
    <li>Condições climáticas adversas severas (tempestades, chuvas contínuas ou ventos fortes) que impeçam com segurança o trabalho em altura (NR-35) e com instalações elétricas (NR-10);</li>
    <li>Atrasos do(a) CONTRATANTE na liberação de acesso físico ao imóvel ou na regularização de pendências cadastrais perante a concessionária.</li>
  </ul>

  <!-- 7. DAS OBRIGAÇÕES DA CONTRATADA -->
  <div class="section-title">7. DAS OBRIGAÇÕES DA CONTRATADA</div>
  <p>7.1. Constituem obrigações da CONTRATADA:</p>
  <ul>
    <li>Elaborar o projeto técnico e recolher a competente ART/TRT de projeto e execução junto ao respectivo Conselho Profissional (CREA/CFT);</li>
    <li>Disponibilizar profissionais qualificados, certificados para trabalhos elétricos e em altura, assumindo total e exclusiva responsabilidade por encargos trabalhistas, fiscais, previdenciários e acidentários;</li>
    <li>Realizar os testes de isolamento elétrico, comissionamento e parametrização dos inversores;</li>
    <li>Protocolar o pedido de vistoria e prestar suporte até a efetiva energização e autorização de conexão do sistema;</li>
    <li>Reparar, às suas custas, quaisquer danos físicos ou materiais que seus colaboradores comprovadamente causarem ao imóvel decorrentes de imperícia ou negligência na montagem.</li>
  </ul>

  <!-- 8. DAS OBRIGAÇÕES DO CONTRATANTE -->
  <div class="section-title">8. DAS OBRIGAÇÕES DO(A) CONTRATANTE</div>
  <p>8.1. Constituem obrigações do(a) CONTRATANTE:</p>
  <ul>
    <li>Efetuar os pagamentos pontualmente nas condições e vencimentos pactuados na Cláusula 5ª;</li>
    <li>Disponibilizar os documentos pessoais/sociais e assinar a procuração necessária para a tramitação regulatória junto à Distribuidora;</li>
    <li>Garantir livre acesso da equipe da CONTRATADA e dos fiscais da concessionária ao padrão de medição e ao telhado/área de instalação;</li>
    <li><strong>Padrão de Entrada de Energia:</strong> Assegurar que o padrão de entrada (poste, fiação, disjuntor e caixa de medição) atenda às normas vigentes da concessionária. Caso a concessionária exija reformas civis, aumento de carga ou substituição do padrão existente, estes custos correrão por conta exclusiva do(a) CONTRATANTE;</li>
    <li><strong>Estrutura Civil do Telhado:</strong> Atestar a integridade estrutural do telhado. Eventuais necessidades de reparos civis prévios, troca de caibros avariados ou reforço estrutural de alvenaria/madeiramento são de responsabilidade e custeio do(a) CONTRATANTE;</li>
    <li><strong>Conectividade Wi-Fi:</strong> Disponibilizar no ponto do inversor rede de internet Wi-Fi estável na frequência de 2.4 GHz com sinal adequado para o monitoramento eletrônico do sistema. A perda de conexão ou alteração de senha de internet do imóvel não interrompe a geração elétrica e isenta a CONTRATADA de perdas em relatórios do aplicativo;</li>
    <li>Não intervir nem permitir que terceiros não autorizados mexam nos equipamentos instalados durante a vigência da garantia, sob pena de perda imediata da garantia de instalação.</li>
  </ul>

  <!-- 9. DO REGIME DE GARANTIAS -->
  <div class="section-title">9. DO REGIME DE GARANTIAS E ASSISTÊNCIA TÉCNICA</div>
  <p>
    9.1. <strong>Garantia de Instalação:</strong> A CONTRATADA oferece garantia de <strong>{{garantia_meses}} meses</strong> sobre os serviços de montagem, cabeamento e fixação mecânica, contados da data de comissionamento do gerador.
  </p>
  <p>
    9.2. <strong>Garantia dos Equipamentos:</strong> Os equipamentos contam com garantias diretas dos respectivos fabricantes e importadores, conforme seus termos específicos: módulos fotovoltaicos (usualmente 10 a 15 anos contra vícios fabris e 25 a 30 anos de desempenho linear); inversores (usualmente 5 a 10 anos de funcionamento interno); estruturas de fixação (usualmente 10 a 12 anos contra corrosão severa).
  </p>
  <p>
    9.3. Nos primeiros 12 (doze) meses de vigência, a CONTRATADA prestará suporte técnico inicial para diagnóstico e abertura de chamados (RMA) junto ao fabricante sem custo de deslocamento para o primeiro atendimento.
  </p>

  <!-- 10. DA ESTIMATIVA DE GERAÇÃO -->
  <div class="section-title">10. DA ESTIMATIVA DE GERAÇÃO E LIMITAÇÕES TÉCNICAS</div>
  <p>
    10.1. A estimativa média mensal projetada para o sistema é de aproximadamente <strong>{{geracao_estimada_kwh}} kWh/mês</strong>, calculada a partir de índices médios históricos de irradiância solar anual para a região.
  </p>
  <p>
    10.2. O(A) CONTRATANTE reconhece que a geração solar depende de fatores naturais e meteorológicos incontroláveis (estações do ano, chuvas, nebulosidade, poeira acumulada), não havendo garantia de volume exato idêntico a cada mês nem promessa de valor monetário constante em moeda corrente.
  </p>
  <p>
    10.3. A CONTRATADA fica isenta de reposição financeira ou indenizações caso ocorra interrupção de geração por falta de energia na rede da distribuidora, manutenções públicas, ou sombreamento superveniente provocado por crescimento de árvores ou novas edificações vizinhas ocorridas após a instalação.
  </p>

  <!-- 11. INVERSÃO DE FLUXO E ART. 73 DA REN 1.000 -->
  <div class="section-title">11. DO PARECER DE ACESSO E REQUISITOS REGULATÓRIOS (INVERSÃO DE FLUXO)</div>
  <p>
    11.1. Caso a Distribuidora de energia, na análise formal do pedido de acesso (conforme faculdade do Art. 73 da REN ANEEL nº 1.000/2021), aponte critérios de inversão de fluxo na subestação que exijam readequações de potência injetada ou alternativas técnicas de conexão:
  </p>
  <ul>
    <li>As Partes avaliarão em conjunto as opções técnicas indicadas pela engenharia;</li>
    <li>Se as exigências da concessionária inviabilizarem economicamente o projeto ou resultarem em indeferimento sem culpa da CONTRATADA, o contrato poderá ser rescindido amigavelmente com acerto proporcional de despesas incorridas, sem multas punitivas de parte a parte.</li>
  </ul>

  <!-- 12. DA RESCISÃO CONTRATUAL -->
  <div class="section-title">12. DA RESCISÃO CONTRATUAL E PENALIDADES</div>
  <p>
    12.1. O contrato poderá ser rescindido com justa causa pela parte adimplente na hipótese de inadimplemento grave não sanado no prazo de 10 (dez) dias após notificação formal.
  </p>
  <p>
    12.2. Caso o(a) CONTRATANTE solicite a rescisão imotivada antes do início da instalação física no imóvel, incidirá multa compensatória de <strong>{{multa_rescisao_pct}}</strong> sobre o valor total do contrato para cobrir projetos, ART/TRT e despesas operacionais. Se os equipamentos fotovoltaicos já tiverem sido faturados ou expedidos pelo distribuidor, o(a) CONTRATANTE arcará adicionalmente com custos de frete interestadual e tributos não recuperáveis.
  </p>

  <!-- 13. DA LGPD -->
  <div class="section-title">13. DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)</div>
  <p>
    13.1. Em observância à Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018), o(a) CONTRATANTE autoriza expressamente a CONTRATADA a coletar e compartilhar seus dados cadastrais, faturas de energia e fotos do padrão exclusivamente para fins de elaboração do projeto elétrico, faturamento dos equipamentos e homologação regulatória.
  </p>

  <!-- 14. CASO FORTUITO OU FORÇA MAIOR -->
  <div class="section-title">14. DO CASO FORTUITO OU FORÇA MAIOR</div>
  <p>
    14.1. Nenhuma das partes responderá por atrasos decorrentes de eventos caracterizados como caso fortuito ou força maior, nos termos do Artigo 393 do Código Civil Brasileiro, devendo a ocorrência ser comunicada formalmente no prazo de 48 (quarenta e oito) horas.
  </p>

  <!-- 15. CLÁUSULAS ADICIONAIS DO INTEGRADOR -->
  {{bloco_clausulas_personalizadas}}

  <!-- 16. VALIDADE DA ASSINATURA ELETRÔNICA -->
  <div class="section-title">16. DA VALIDADE DA ASSINATURA ELETRÔNICA E TÍTULO EXECUTIVO</div>
  <p>
    16.1. As partes declaram plenamente válida e juridicamente eficaz a assinatura do presente contrato por meio eletrônico, nos exatos termos do § 2º do Artigo 10 da Medida Provisória nº 2.200-2/2001 e da Lei Federal nº 14.063/2020.
  </p>
  <p>
    16.2. O presente instrumento particular constitui Título Executivo Extrajudicial para todos os fins de direito, conforme o Artigo 784, inciso III, do Código de Processo Civil.
  </p>

  <!-- 17. DO FORO -->
  <div class="section-title">17. DO FORO DE ELEIÇÃO</div>
  <p>
    17.1. Fica eleito o foro da comarca de <strong>{{cidade_instalacao}} - {{estado_instalacao}}</strong> como o competente para dirimir quaisquer dúvidas ou litígios decorrentes deste instrumento, renunciando as partes a qualquer outro, por mais privilegiado que seja.
  </p>

  <p style="margin-top: 18px; text-align: center; font-weight: 500;">
    {{cidade_instalacao}} - {{estado_instalacao}}, {{data_atual}}.
  </p>

  <!-- 18. ASSINATURAS E ACEITE FORMAL -->
  <div class="signatures-wrapper">
    <div class="section-title">18. DAS ASSINATURAS E ACEITE FORMAL</div>
    <p style="font-size: 8.5pt; color: #475569; margin-bottom: 12px;">
      Em testemunho da avença, as partes firmam o presente instrumento por meio de assinatura eletrônica:
    </p>

    <div style="display: table; width: 100%; border-spacing: 12px 0; margin-left: -12px; margin-right: -12px;">
      <div style="display: table-row;">
        <!-- CONTRATADA -->
        <div style="display: table-cell; width: 50%; vertical-align: top; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">
          <div style="font-size: 8pt; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            CONTRATADA (Empresa Integradora)
          </div>
          <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            {{nome_empresa}}
          </div>
          <div style="font-size: 8pt; color: #475569; margin-bottom: 8px;">
            Representante: <strong>{{nome_vendedor}}</strong>
          </div>
          <div style="border: 1px dashed #059669; background: #ecfdf5; border-radius: 6px; padding: 8px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #047857; text-transform: uppercase;">
              ✓ ASSINADO DIGITALMENTE
            </div>
            <div style="font-size: 7.5pt; color: #065f46; margin-top: 2px;">
              Autenticado institucionalmente via Plataforma EnergivIA
            </div>
            <div style="font-size: 7pt; font-family: monospace; color: #047857; margin-top: 3px;">
              Emissão e Conformidade: {{data_atual}}
            </div>
          </div>
        </div>

        <!-- CONTRATANTE -->
        <div style="display: table-cell; width: 50%; vertical-align: top; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">
          <div style="font-size: 8pt; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            CONTRATANTE (Cliente Titular)
          </div>
          <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            {{nome_cliente}}
          </div>
          <div style="font-size: 8pt; color: #475569; margin-bottom: 8px;">
            CPF / Documento: <strong>{{cpf_cliente}}</strong>
          </div>
          {{bloco_assinatura_cliente}}
        </div>
      </div>
    </div>
  </div>

  {{folha_auditoria_anexa}}

</body>
</html>
`;
