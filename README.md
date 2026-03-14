# AXIOMIX

Aplicacao Next.js 16 para operacao de marketing e atendimento com modulos de:

- dashboard
- WhatsApp Intelligence
- Social Publisher
- integrations/settings

## Requisitos

- Node.js 20+
- npm 10+
- projeto Supabase configurado

## Setup local

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

3. Preencha as variaveis obrigatorias do Supabase e da aplicacao.

4. Rode o projeto:

```bash
npm run dev
```

5. Para validar build de producao:

```bash
npm run build
```

## Variaveis de ambiente

### Obrigatorias

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Opcionais por modulo

- `CRON_SECRET`
- `INTEGRATIONS_ENCRYPTION_KEY`
- `SOFIA_CRM_WEBHOOK_TOKEN`
- `APIFY_API_TOKEN`
- `OPENROUTER_MODEL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_BASE_URL`
- `EVOLUTION_API_KEY`
- `UPLOAD_POST_API_URL`
- `UPLOAD_POST_API_BASE_URL`
- `UPLOAD_POST_API_KEY`

## Banco de dados

As migrations SQL ficam em `database/migrations/`.

## Deploy

O projeto inclui `vercel.json` para deploy na Vercel.
O deploy de producao e acionado automaticamente pela Vercel a cada push na branch `main`.
