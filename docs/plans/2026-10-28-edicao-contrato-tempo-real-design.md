# Design: Editor de Minuta Contratual em Tempo Real e Remoção de Cards de Personalização

## 1. Visão Geral e Objetivo

Substituir os cards estáticos e desarticulados de personalização (como "Personalização do Contrato (Logo e Cláusulas)" e "Cláusulas Específicas do Integrador na Cláusula 15ª") por uma experiência dinâmica de edição de documentos em tempo real semelhante a um editor de templates/documentos. O integrador pode abrir o documento pronto da venda e alterar diretamente qualquer texto, adicionar cláusulas numeradas ou remover trechos antes de enviar para assinatura do cliente.

## 2. Mudanças de Interface (Frontend)

### 2.1. Ficha da Venda (`apps/web/src/app/(authenticated)/vendas/[id]/page.tsx`)

1. **Remoção de Cards de Personalização:**
   - Remover da aba Documentos o card `Personalização do Contrato (Logo da Empresa & Cláusulas do Integrador)`.
   - Remover da aba Ficha Cadastral o card `Cláusulas Específicas do Contrato & Observações` (que injetava texto na Cláusula 15ª).
2. **Ações Rápidas de Documentos:**
   - Botão **"Abrir e Editar Contrato"** (PF ou PJ conforme tipo do cliente).
   - Botão **"Abrir e Editar Procuração"** (PF ou PJ).
   - Ao clicar, se o documento ainda não existir, cria o rascunho com as variáveis da venda e abre instantaneamente no editor. Se já existir, abre a minuta atual.
3. **Lista de Documentos:**
   - Botão **"Editar Documento em Tempo Real"** (ou "Ver Minuta" se já estiver assinado) em cada item da listagem de documentos gerados.

### 2.2. Modal do Editor de Contratos (`apps/web/src/components/sales/live-contract-editor-modal.tsx`)

1. **Header do Studio:**
   - Botão de fechar/voltar (`X`).
   - Título e badge de status (Editável vs. Assinado/Somente Leitura).
   - Barra de formatação: Negrito, Itálico, Sublinhado, Lista de Marcadores.
   - Botão **"+ Nova Cláusula"** (insere título e texto numerado antes das assinaturas).
   - Atalho `Ctrl+S` para salvar.
   - Botão **"Visualizar PDF"** (proxy com regeneração).
   - Botão **"Salvar Alterações"** com feedback de sucesso.
2. **Canvas A4:**
   - Folha de documento A4 estilizada, simulando a página impressa com margens profissionais.
   - Edição inline direta (`contentEditable`) de qualquer cláusula existente.

## 3. Modelo de Dados e Backend (API)

### 3.1. Prisma Schema & Migração

- O modelo `SaleDocument` conta com o campo `contentHtml String? @db.Text` para persistir o HTML customizado editado pelo usuário.

### 3.2. Endpoints e Serviços

- `GET /sales/:id/documents/:docId/editor` (ou criação automática de rascunho): retorna os dados e o HTML editável preenchido.
- `PATCH /sales/:id/documents/:docId/content`: salva o `contentHtml`, recompila o PDF no disco e recalcula o hash SHA-256.
- `SignatureAuditService`: utiliza o `contentHtml` salvo como base do contrato assinado, injetando os blocos bilaterais de assinatura e a folha probatória anexa.
- Proteção contra edição caso o documento já esteja com status `SIGNED`.

## 4. Estratégia de Testes e Validação

- Testes unitários no backend para garantir que `contentHtml` é recuperado, atualizado e protegido após assinatura.
- Validação de compilação da API e do frontend (`@energivia/web`).
- Teste de fluxo completo: geração -> edição em tempo real -> salvamento -> verificação da minuta.
