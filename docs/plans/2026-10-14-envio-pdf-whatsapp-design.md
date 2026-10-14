# Design Doc: Envio de PDF Sob Demanda no WhatsApp Bot

- **Data:** 14/10/2026
- **Status:** Aprovado pelo usuário
- **Autor:** Antigravity & Giovani

---

## 1. Visão Geral e Contexto

O usuário solicitou que o envio de PDF da proposta comercial no WhatsApp **não seja automático**, e sim **sob demanda**, caso o integrador solicite expressamente no chat.

Ao gerar a proposta, o bot entrega a mensagem de conferência com o link de preview (que não dispara alertas de visualização) e a mensagem seguinte limpa para encaminhar ao cliente. Na mensagem de conferência, adiciona-se uma dica discreta de que o PDF pode ser solicitado a qualquer momento respondendo "PDF".

Quando o integrador digitar "PDF", "baixar PDF" ou variações, o bot gera o PDF da última proposta em memória via Puppeteer e envia o arquivo anexado diretamente no WhatsApp via Evolution API (Base64).

---

## 2. Requisitos e Regras de Negócio

1. **Envio Não Automático:**
   - Na conclusão da proposta, o fluxo continua enviando a Mensagem 1 (Integrador com link `?preview=true`) e a Mensagem 2 (Cliente, pronta para encaminhar).
   - O documento em PDF só é gerado e despachado se o integrador solicitar explicitamente.

2. **Dica na Mensagem de Conferência do Integrador:**
   - Adicionar ao final da Mensagem 1:
     `_📄 Caso precise do documento em PDF aqui no WhatsApp, basta responder *PDF*._`

3. **Reconhecimento do Comando:**
   - Variações aceitas (case-insensitive e com limpeza de pontuações):
     `pdf`, `PDF`, `enviar pdf`, `baixar pdf`, `gerar pdf`, `manda o pdf`, `mandar pdf`, `quero o pdf`.

4. **Persistência de Contexto da Proposta:**
   - Salvar `lastProposalId`, `lastClientName` e `lastProposalNumber` no `conversation.metadata` ao gerar a proposta.
   - Fallback: se não estiver no metadata por qualquer motivo, buscar a proposta mais recente vinculada àquela organização / cliente.

5. **Feedback Imediato ao Usuário:**
   - Quando o comando de PDF é reconhecido, o bot responde imediatamente:
     `_Gerando o arquivo PDF da sua proposta, aguarde um instante..._ ⏳`
   - Em seguida, processa a renderização e dispara o arquivo anexo.

6. **Envio do Arquivo via Evolution API:**
   - Endpoint: `POST /message/sendMedia/{instance}`
   - Tipo de mídia: `document`
   - Mime: `application/pdf`
   - Nome do arquivo: `Proposta_Comercial_[Nome_Cliente].pdf`
   - Conteúdo: `data:application/pdf;base64,[buffer_base64]`
   - Suporte a fallback de 9º dígito (`altNumber`).

---

## 3. Arquitetura e Componentes

### 3.1 `apps/api/src/modules/whatsapp/whatsapp-cloud.service.ts`

- Novo método `sendDocumentMessage(params)`:
  - `phoneNumberId: string`
  - `toWaId: string`
  - `documentBase64?: string`
  - `documentUrl?: string`
  - `fileName: string`
  - `caption?: string`
- Implementação de envio via Evolution API com tratamento de erros e fallback de número telefônico.
- Suporte a envio via Meta Cloud API caso configurado.

### 3.2 `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

- Na conclusão da proposta (linha ~3881-3950):
  - Salvar no `conversation.metadata`: `lastProposalId`, `lastClientName`.
  - Adicionar a dica discreta de PDF no `integratorSummaryMsg`.
- No processamento de mensagens recebidas:
  - Detectar se `incomingText` é solicitação de PDF (`isPdfRequest(incomingText)`).
  - Se for solicitação de PDF:
    - Recuperar a proposta.
    - Chamar `sendTextMessage` com a mensagem de status ("Gerando PDF...").
    - Renderizar o PDF chamando `proposalsService.generatePdfForProposal(proposalId)`.
    - Converter o buffer retornado para Base64.
    - Disparar `whatsappCloud.sendDocumentMessage(...)`.

---

## 4. Testes e Validação

- Teste unitário em `apps/api/src/modules/whatsapp/__tests__/whatsapp-pdf-on-demand.spec.ts` validando:
  1. Detecção da intenção de PDF.
  2. Envio da mensagem de aguardo ("Gerando o arquivo PDF...").
  3. Chamada a `generatePdfForProposal` e envio do documento com o Base64 e nome do arquivo corretos.
  4. Resposta apropriada quando não há proposta recente na conversa.
- Testes de envio de documento em `apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-send.spec.ts`.
