export const POWER_OF_ATTORNEY_PF_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Procuração Específica para Acesso à Rede de Distribuição</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 25mm 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
      margin-bottom: 25px;
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
      margin-top: 20px;
      margin-bottom: 10px;
      color: #0f172a;
      border-left: 3px solid #059669;
      padding-left: 8px;
    }
    p, li {
      text-align: justify;
      margin: 0 0 12px 0;
    }
    .box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      margin: 15px 0;
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
      padding: 5px 8px;
      font-size: 10.5pt;
    }
    .cell-label {
      font-weight: 600;
      color: #475569;
      width: 32%;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1 class="title">PROCURAÇÃO ESPECÍFICA - ACESSO À REDE DE DISTRIBUIÇÃO</h1>
    <p class="subtitle">Homologação de Micro e Minigeração Distribuída (Resolução Normativa ANEEL nº 1.000/2021 e 1.059/2023)</p>
  </div>

  <div class="section-title">1. OUTORGANTE</div>
  <p>
    <strong>{{nome_cliente}}</strong>, brasileiro(a), portador(a) do RG nº <strong>{{rg_cliente}}</strong> e inscrito(a) no CPF/MF sob o nº <strong>{{cpf_cliente}}</strong>, residente e domiciliado(a) no endereço: <strong>{{endereco_instalacao}}</strong>, na cidade de <strong>{{cidade_instalacao}} - {{estado_instalacao}}</strong>.
  </p>

  <div class="section-title">2. OUTORGADA</div>
  <p>
    <strong>{{nome_empresa}}</strong>, com plenos poderes para atuar por meio de seus responsáveis técnicos, engenheiros eletricistas e prepostos legalmente constituídos.
  </p>

  <div class="section-title">3. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA (UC)</div>
  <div class="box">
    <div class="grid">
      <div class="row">
        <div class="cell cell-label">Concessionária Distribuidora:</div>
        <div class="cell"><strong>{{concessionaria}}</strong></div>
      </div>
      <div class="row">
        <div class="cell cell-label">Número da Conta Contrato / UC:</div>
        <div class="cell"><strong>{{numero_uc}}</strong></div>
      </div>
      <div class="row">
        <div class="cell cell-label">Endereço da Ligação:</div>
        <div class="cell">{{endereco_instalacao}}, {{cidade_instalacao}} - {{estado_instalacao}}</div>
      </div>
    </div>
  </div>

  <div class="section-title">4. DOS PODERES ESPECÍFICOS</div>
  <p>
    Por este instrumento particular de procuração, o(a) OUTORGANTE confere à OUTORGADA amplos poderes específicos para representá-lo(a) perante a distribuidora de energia elétrica <strong>{{concessionaria}}</strong>, a Agência Nacional de Energia Elétrica (ANEEL) e órgãos correlatos, exclusivamente para:
  </p>
  <ul>
    <li>Solicitar Consulta, Informação e Parecer de Acesso para Conexão de Microgeração ou Minigeração Distribuída;</li>
    <li>Protocolar projetos elétricos, memoriais descritivos, diagramas unifilares e Anotações de Responsabilidade Técnica (ART/TRT);</li>
    <li>Acompanhar vistorias técnicas, solicitar re-vistorias e requerer a substituição do medidor de energia convencional por medidor bidirecional;</li>
    <li>Receber notificações, ofícios, orientações de adequação técnica e assinar o Acordo Operativo / Relacionamento Operacional junto à concessionária.</li>
  </ul>

  <div class="section-title">5. VALIDADE E ASSINATURA ELETRÔNICA</div>
  <p>
    Esta procuração tem validade de 12 (doze) meses a contar desta data, podendo ser revogada a qualquer tempo mediante comunicação expressa. As partes reconhecem a plena validade desta assinatura eletrônica conforme o art. 10 da MP nº 2.200-2/2001 e a Lei nº 14.063/2020.
  </p>

  <p style="margin-top: 30px; text-align: center;">
    {{cidade_instalacao}} - {{estado_instalacao}}, {{data_atual}}.
  </p>

  <div class="signature-box" style="margin-top: 35px; text-align: center; page-break-inside: avoid;">
    <div style="max-width: 420px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background: #f8fafc;">
      <div style="font-size: 8.5pt; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
        OUTORGANTE (Titular da Unidade Consumidora)
      </div>
      <div style="font-size: 10pt; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
        {{nome_cliente}}
      </div>
      <div style="font-size: 8.5pt; color: #475569; margin-bottom: 10px;">
        CPF / Documento: <strong>{{cpf_cliente}}</strong>
      </div>
      {{bloco_assinatura_cliente}}
    </div>
  </div>

  {{folha_auditoria_anexa}}

</body>
</html>
`;
