# 🚀 Instalação Rápida - Apify Integration

## ⚡ 3 Passos para Ativar o Scraping

### 1. Instalar Dependência

```bash
cd axiomix
npm install apify-client
```

### 2. Configurar API Token

Adicione ao arquivo `.env.local`:

```env
# Apify API Token (obtenha em https://console.apify.com/account/integrations)
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Como obter o token:**
1. Acesse: https://apify.com
2. Crie conta (free tier = $5 grátis)
3. Vá para: Account → Integrations
4. Copie "Personal API token"

### 3. Configurar Nicho

1. Acesse: `Settings → Empresa`
2. Configure:
   - **Nicho**: Ex: "Marketing Digital"
   - **Sub-nicho**: Ex: "SaaS B2B"

---

## ✅ Testar

1. Acesse: `Intelligence → Content Radar`
2. Clique em **"Atualizar"**
3. Aguarde 30-60 segundos
4. Posts virais aparecem automaticamente!

---

## 🎯 O Que Acontece

```
Atualizar
  ↓
Sistema extrai keywords do nicho
  ↓
Apify busca posts no Instagram e TikTok
  ↓
Filtra por engagement > 100
  ↓
Pega top 20 posts
  ↓
Salva no banco
  ↓
Posts aparecem no radar
```

---

## 📊 Actors do Apify Usados

| Plataforma | Actor | Custo (estimado) |
|------------|-------|------------------|
| Instagram | `apify/instagram-hashtag-scraper` | $0.10-0.30 por 100 posts |
| TikTok | `clockworks/tiktok-scraper` | $0.20-0.50 por 100 posts |

**Free tier:** $5 = ~500-1000 posts/mês

---

## 🔧 Troubleshooting

### Erro: "APIFY_API_TOKEN não configurado"
✅ Adicione o token no `.env.local`
✅ Reinicie o servidor: `npm run dev`

### Apify não retorna posts
✅ Verifique créditos em: https://console.apify.com/billing
✅ Teste com hashtag popular: #marketing
✅ Veja logs no console do navegador (F12)

### Posts não aparecem
✅ Clique em "Recarregar dados"
✅ Verifique se nicho está configurado
✅ Aguarde até 2 minutos (scraping demora)

---

## 💰 Custos

### Free Tier (Recomendado para começar)
- **$5 grátis** ao criar conta
- Suficiente para ~500-1000 posts
- Sem cartão de crédito necessário
- Ideal para testar

### Paid Plans
- **Starter**: $49/mês (~10.000 posts)
- **Business**: $499/mês (~100.000 posts)

**Recomendação:** Comece com free tier, depois avalie necessidade.

---

## 🎓 Boas Práticas

### ✅ Faça
- Colete 1-2x por dia (máximo)
- Use 3-5 keywords no máximo
- Monitore créditos do Apify
- Delete posts irrelevantes

### ❌ Evite
- Coletar a cada minuto (gasta créditos rápido)
- Usar 10+ keywords por coleta
- Esquecer de monitorar custos

---

## 📝 Próximos Passos

Após instalar:

1. ✅ Teste coleta automática
2. ✅ Adicione posts manuais
3. ✅ Delete posts irrelevantes
4. ✅ Crie conteúdo com templates
5. ✅ Salve prompts favoritos

---

**Tudo pronto em 3 passos!** 🎉

Dúvidas? Consulte: `INTELLIGENCE_COMPLETO.md`
