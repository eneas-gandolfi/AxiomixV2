FROM node:20-slim AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js precisa das NEXT_PUBLIC_* em tempo de build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_EVOLUTION_WEBHOOK_TOKEN

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_EVOLUTION_WEBHOOK_TOKEN=$NEXT_PUBLIC_EVOLUTION_WEBHOOK_TOKEN

# QStash precisa das chaves em tempo de build (page data collection)
ARG QSTASH_CURRENT_SIGNING_KEY
ARG QSTASH_NEXT_SIGNING_KEY
ARG QSTASH_TOKEN
ARG QSTASH_URL
ENV QSTASH_CURRENT_SIGNING_KEY=$QSTASH_CURRENT_SIGNING_KEY
ENV QSTASH_NEXT_SIGNING_KEY=$QSTASH_NEXT_SIGNING_KEY
ENV QSTASH_TOKEN=$QSTASH_TOKEN
ENV QSTASH_URL=$QSTASH_URL

RUN npm run build

# Debug: verificar estrutura do standalone
RUN ls -la .next/standalone/ && \
    if [ -d ".next/standalone/axiomix" ]; then echo "FOUND: axiomix subdir"; \
    elif [ -f ".next/standalone/server.js" ]; then echo "FOUND: server.js at root"; \
    else echo "LISTING:" && find .next/standalone -name "server.js" -type f; fi

# --- Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Copiar todo o standalone e ajustar se necessario
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Se server.js estiver em subpasta, mover para raiz
RUN if [ ! -f "server.js" ] && [ -f "axiomix/server.js" ]; then \
      cp -r axiomix/* . && rm -rf axiomix; \
    fi

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
