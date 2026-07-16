This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter, a custom Google Font.

## About EnergivIA

EnergivIA é uma plataforma para integradores de energia solar gerarem propostas comerciais rapidamente, com um assistente de IA que conversa com o cliente pelo WhatsApp, extrai dados da conta de luz e monta a proposta sozinho.

### Arquitetura

Monorepo Turborepo com os seguintes pacotes:

- `apps/web` — frontend Next.js
- `apps/api` — backend NestJS
- `packages/ai-agent` — agente de IA (OpenAI) que conduz as conversas e chama as ferramentas de CRM
- `packages/ui` — componentes compartilhados

### Banco de dados

O Prisma cuida do schema automaticamente, não é necessário rodar nenhum comando de migração manualmente antes de subir a aplicação pela primeira vez.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
