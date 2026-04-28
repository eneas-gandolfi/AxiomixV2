# Runbook de Deploy e Rollback — AXIOMIX

**Servidor:** VPS Hostinger (82.25.68.119)
**Porta:** 80 (container) / 3000 (app interna)
**Runtime:** Docker (node:20-slim, Next.js standalone)

---

## Deploy Normal

O deploy acontece automaticamente via webhook:

```
POST http://82.25.68.119:3000/api/deploy/<token>
```

O webhook executa:
1. `git pull` do branch principal
2. `docker build` com args de environment
3. `docker stop` do container atual
4. `docker run` do novo container
5. Health check: `GET /api/health` → espera 200

---

## Rollback em Caso de Falha

### Situacao 1: Deploy quebrou a aplicacao (app nao responde)

**Tempo alvo: < 5 minutos**

```bash
# 1. Conectar no servidor
ssh root@82.25.68.119

# 2. Verificar containers
docker ps -a

# 3. Identificar a imagem anterior
docker images axiomix --format "{{.ID}} {{.CreatedAt}} {{.Tag}}" | head -5

# 4. Parar o container quebrado
docker stop axiomix

# 5. Iniciar com a imagem anterior
docker run -d --name axiomix-rollback \
  --env-file /opt/axiomix/.env \
  -p 80:80 \
  axiomix:<sha-da-imagem-anterior>

# 6. Verificar que voltou
curl http://localhost/api/health
# Esperado: {"status":"ok","db":"ok","uptime":...}

# 7. Se OK, remover container quebrado
docker rm axiomix
docker rename axiomix-rollback axiomix
```

### Situacao 2: Build falhou (container antigo ainda rodando)

Nada a fazer — o container anterior continua rodando. Corrigir o codigo e fazer novo deploy.

```bash
# Verificar que o container antigo ainda esta vivo
curl http://82.25.68.119/api/health
```

### Situacao 3: Migration quebrou o banco

**CRITICO — requer intervencao manual no Supabase**

```bash
# 1. Identificar qual migration falhou
# Verificar logs do container
docker logs axiomix --tail 50

# 2. Acessar Supabase SQL Editor
# https://supabase.com/dashboard → SQL Editor

# 3. Reverter a migration manualmente
# Cada migration deve ter uma secao de rollback documentada
# Se nao tem, escrever o SQL reverso baseado no que a migration fez

# 4. Fazer rollback do container (Situacao 1)
```

---

## Verificacao Pos-Deploy

Apos todo deploy (normal ou rollback), verificar:

```bash
# 1. Health check
curl http://82.25.68.119/api/health
# Esperado: 200 + {"status":"ok","db":"ok"}

# 2. Login funciona
# Abrir http://82.25.68.119 no navegador → tela de login deve carregar

# 3. Cron jobs ativos
# Verificar se /api/cron/heartbeat responde (requer CRON_SECRET header)
```

---

## Contatos

- **VPS:** Hostinger — painel em hpanel.hostinger.com
- **Supabase:** dashboard em supabase.com/dashboard
- **Docker:** imagens locais no servidor (nao usa registry externo)

---

*Ultima atualizacao: 2026-04-28*
