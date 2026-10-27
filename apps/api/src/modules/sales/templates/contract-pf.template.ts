export const CONTRACT_PF_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Prestação de Serviços e Fornecimento de Usina Solar</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 14pt;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .subtitle {
      font-size: 10pt;
      text-align: center;
      color: #64748b;
      margin: 0;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 18px;
      margin-bottom: 8px;
      color: #0f172a;
      border-left: 3px solid #059669;
      padding-left: 8px;
    }
    p, li {
      text-align: justify;
      margin: 0 0 8px 0;
    }
    .box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
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
      padding: 4px 8px;
      font-size: 10pt;
    }
    .cell-label {
      font-weight: 600;
      color: #475569;
      width: 30%;
    }
    .signatures {
      margin-top: 35px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1 class="title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE SISTEMA FOTOVOLTAICO</h1>
    <p class="subtitle">Microgeração / Minigeração Distribuída — Marco Legal da GD (Lei nº 14.300/2022)</p>
  </div>

  <div class="section-title">1. DAS PARTES</div>
  <p>Pelo presente instrumento particular, de um lado:</p>
  <p>
    <strong>CONTRATADA:</strong> <strong>{{nome_empresa}}</strong>, doravante denominada simplesmente CONTRATADA, representada pelo consultor comercial <strong>{{nome_vendedor}}</strong>.
  </p>
  <p>E de outro lado:</p>
  <p>
    <strong>CONTRATANTE:</strong> <strong>{{nome_cliente}}</strong>, inscrito(a) no CPF/MF sob o nº <strong>{{cpf_cliente}}</strong>, portador(a) do RG nº <strong>{{rg_cliente}}</strong>, doravante denominado(a) simplesmente CONTRATANTE.
  </p>

  <div class="section-title">2. DO OBJETO</div>
  <p>
    O presente contrato tem por objeto o fornecimento, projeto de engenharia, montagem, comissionamento e assessoria para homologação de um <strong>Sistema Gerador Solar Fotovoltaico Conectado à Rede (On-Grid)</strong>, com potência nominal de pico de <strong>{{potencia_kwp}} kWp</strong>, a ser instalado no endereço indicado na Cláusula 3.
  </p>

  <div class="section-title">3. DO LOCAL DA INSTALAÇÃO E UNIDADE CONSUMIDORA</div>
  <div class="box">
    <div class="grid">
      <div class="row">
        <div class="cell cell-label">Endereço de Instalação:</div>
        <div class="cell">{{endereco_instalacao}}</div>
      </div>
      <div class="row">
        <div class="cell cell-label">Município / UF:</div>
        <div class="cell">{{cidade_instalacao}} - {{estado_instalacao}}</div>
      </div>
      <div class="row">
        <div class="cell cell-label">CEP:</div>
        <div class="cell">{{cep_instalacao}}</div>
      </div>
      <div class="row">
        <div class="cell cell-label">Concessionária de Energia:</div>
        <div class="cell"><strong>{{concessionaria}}</strong></div>
      </div>
      <div class="row">
        <div class="cell cell-label">Número da UC (Conta de Luz):</div>
        <div class="cell"><strong>{{numero_uc}}</strong></div>
      </div>
    </div>
  </div>

  <div class="section-title">4. DO VALOR E CONDIÇÕES DE PAGAMENTO</div>
  <p>
    Pelo fornecimento completo dos equipamentos, engenharia, ART e instalação, o(a) CONTRATANTE pagará à CONTRATADA o valor global de <strong>{{valor_total}}</strong>, na modalidade acordada: <strong>{{forma_pagamento}}</strong>.
  </p>

  <div class="section-title">5. DAS OBRIGAÇÕES DAS PARTES</div>
  <p><strong>5.1. Obrigações da CONTRATADA:</strong></p>
  <ul>
    <li>Elaborar o projeto elétrico e emitir Anotação de Responsabilidade Técnica (ART) junto ao CREA/CFT;</li>
    <li>Protocolar a solicitação de Acesso à Distribuição junto à concessionária <strong>{{concessionaria}}</strong>;</li>
    <li>Entregar os equipamentos homologados pelo INMETRO no local da obra e realizar a montagem conforme as normas NBR 5410 e NBR 16690;</li>
    <li>Prestar suporte técnico e garantia de instalação pelo prazo legal e contratual.</li>
  </ul>
  <p><strong>5.2. Obrigações do(a) CONTRATANTE:</strong></p>
  <ul>
    <li>Fornecer a documentação exigida pela concessionária de energia e assinar a procuração específica de homologação;</li>
    <li>Garantir o livre acesso da equipe técnica ao padrão de entrada e telhado/área de instalação;</li>
    <li>Efetuar os pagamentos pontualmente nos prazos acordados.</li>
  </ul>

  <div class="section-title">6. DA VALIDADE JURÍDICA E ASSINATURA ELETRÔNICA</div>
  <p>
    As partes declaram plenamente válida a assinatura do presente contrato por meio eletrônico, reconhecendo sua autenticidade, integridade e eficácia jurídica nos termos do art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e da Lei Federal nº 14.063/2020.
  </p>

  <div class="section-title">7. DO FORO</div>
  <p>
    Fica eleito o foro da comarca de <strong>{{cidade_instalacao}} - {{estado_instalacao}}</strong> para dirimir quaisquer dúvidas oriundas deste contrato, renunciando a qualquer outro por mais privilegiado que seja.
  </p>

  <p style="margin-top: 25px; text-align: center;">
    {{cidade_instalacao}} - {{estado_instalacao}}, {{data_atual}}.
  </p>

</body>
</html>
`;
