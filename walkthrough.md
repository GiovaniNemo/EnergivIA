# Finalização: Gestão de Planos e Pagamentos (Walkthrough)

Implementamos com sucesso toda a estrutura visual e de banco de dados para a gestão de planos e pagamentos seguros. As telas e as tabelas já estão prontas! 

> [!CAUTION]
> **Segurança (PCI Compliance)**: Como solicitado, configuramos a arquitetura utilizando a técnica de "Tokenização". 
> O componente **`PaymentForm.tsx`** carrega o iframe da operadora (Stripe). O cliente digita os dados do cartão diretamente para eles. Nós recebemos de volta apenas um "Token de Pagamento", que enviamos para o nosso Backend. **O cartão nunca bate no nosso banco de dados.**

## Telas Criadas

1. **Visão do Usuário Comum** ([apps/web/src/app/gestao/meus-planos/page.tsx](file:///c:/Users/Edeltec/EnergivIA/apps/web/src/app/gestao/meus-planos/page.tsx)): Uma interface premium para escolher planos, exibindo os benefícios e o formulário de pagamento seguro integrado.
2. **Visão do Administrador** ([apps/web/src/app/admin/planos/page.tsx](file:///c:/Users/Edeltec/EnergivIA/apps/web/src/app/admin/planos/page.tsx)): Painel de configuração onde apenas Admins podem criar e definir o preço e os benefícios de cada plano.

---

## Próximos Passos (Como configurar sua Conta para receber)

Como você informou que nunca programou algo parecido, preparei um passo a passo do que precisa ser configurado nos ambientes de Hospedagem (Vercel e Railway) para começar a receber o dinheiro na sua conta bancária.

### 1. Criar a Conta no Gateway de Pagamento (Stripe)
Recomendo utilizar a **Stripe** para processar pagamentos globais/nacionais focados em Cartão de Crédito.
- Acesse `stripe.com` e crie uma conta usando os dados da sua Empresa.
- No painel da Stripe, adicione a conta bancária onde você quer que o dinheiro seja depositado semanalmente.
- Vá na aba **Desenvolvedores > Chaves de API**. Lá você encontrará a **Chave Pública** (`pk_live_...` ou `pk_test_...`) e a **Chave Secreta** (`sk_live_...`).

### 2. Configurar Variáveis no Frontend (Vercel)
A Vercel hospeda o "visual" (seu site e telas). Para o componente de pagamento carregar, ele precisa da **Chave Pública**.
- Entre no painel da **Vercel** > Acesse o projeto "EnergivIA" > **Settings** > **Environment Variables**.
- Crie uma variável chamada `NEXT_PUBLIC_STRIPE_KEY` e cole o valor da sua Chave Pública.
- Se usar **Auth0** para Login (o projeto parece já ter uma pasta `auth`), lá também ficam as chaves: `AUTH0_CLIENT_ID`, `AUTH0_DOMAIN`.

### 3. Configurar Variáveis no Backend (Railway)
O Railway hospeda a lógica pesada e o banco de dados. É lá que o dinheiro será efetivamente cobrado usando o token.
- Entre no painel do **Railway** > Selecione o projeto "API" > Aba **Variables**.
- Crie a variável `STRIPE_SECRET_KEY` e coloque a sua **Chave Secreta**.
- Também crie um Endpoint (Webhook) na Stripe para avisar quando um pagamento for aprovado, e cole o segredo gerado lá em uma variável chamada `STRIPE_WEBHOOK_SECRET`.

> [!TIP]
> Apenas a API (Backend) sabe a chave secreta. Isso impede que qualquer pessoa injete dados no frontend.

## Status do Banco de Dados
A tabela `Plan` e a tabela `Subscription` foram inseridas no `schema.prisma`. Quando você fizer o *deploy* (publicação) do código, seu banco de dados receberá essas tabelas automaticamente e o sistema já começará a operar de acordo com essa arquitetura segura.
