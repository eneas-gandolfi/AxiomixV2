# 🎯 Intelligence Module - Sistema Completo

## 📅 Versão 2.2 - Scraping Automatizado + Curadoria Manual

---

## ✨ O Que Foi Implementado

### 1. Scraping Automatizado via Apify ✅
- Coleta automática de posts virais do Instagram e TikTok
- Baseado em hashtags/palavras-chave do nicho da empresa
- Threshold mínimo de engajamento configurável
- Fallback para dados mockados se Apify falhar

### 2. Curadoria Manual ✅
- Adicionar posts manualmente
- Formulário completo com métricas
- Posts aparecem instantaneamente no radar

### 3. Gestão de Posts ✅
- Deletar posts (automáticos ou manuais)
- Confirmação antes de deletar
- Feedback visual de sucesso/erro

### 4. Sistema Híbrido ✅
- Automação + Controle Manual
- Usuário tem total autonomia
- Pode excluir posts automáticos
- Pode adicionar posts manualmente

---

## 🚀 Como Funciona

### Fluxo Automatizado

```
1. Empresa configura nicho: "Marketing Digital"
   ↓
2. Sistema extrai keywords: ["marketing", "digital", "saas"]
   ↓
3. Apify faz scraping no Instagram e TikTok
   - Instagram: #marketing (top 10 posts)
   - Instagram: #digital (top 10 posts)
   - TikTok: #marketing (top 10 posts)
   - TikTok: #digital (top 10 posts)
   ↓
4. Filtra posts com engagement > 100
   ↓
5. Ordena por engagement score
   ↓
6. Pega top 20 posts
   ↓
7. Salva no banco de dados
   ↓
8. Gera insights com IA
   ↓
9. Posts aparecem no Content Radar
```

### Fluxo Manual

```
1. Usuário encontra post viral no Instagram
   ↓
2. Copia conteúdo e métricas
   ↓
3. Clica em "Adicionar Post"
   ↓
4. Preenche formulário
   ↓
5. Post aparece imediatamente
```

---

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Apify API Token
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxx
```

### 2. Instalar Dependências

```bash
npm install apify-client
```

### 3. Configurar Nicho

1. Acesse: Settings → Empresa
2. Configure:
   - **Nicho**: Ex: "Marketing Digital"
   - **Sub-nicho**: Ex: "SaaS B2B"

---

## 📊 Arquitetura

### Arquivos Criados/Modificados

```
✅ src/lib/scraping/apify-client.ts (NOVO)
   - Cliente Apify
   - scrapeInstagramHashtag()
   - scrapeTikTokHashtag()
   - scrapeInstagramProfile()

✅ src/services/intelligence/radar-enhanced.ts (NOVO)
   - Worker com scraping via Apify
   - Fallback para dados mockados
   - Filtro por engagement mínimo
   - Top 20 posts

✅ src/lib/jobs/processor.ts (MODIFICADO)
   - Usa runRadarWorkerEnhanced

✅ src/app/api/intelligence/posts/route.ts (NOVO)
   - POST: Adicionar post manual

✅ src/app/api/intelligence/posts/[id]/route.ts (NOVO)
   - DELETE: Deletar post

✅ src/components/intelligence/intelligence-module-enhanced.tsx
   - Botão "Adicionar Post"
   - Modal de formulário
   - Botão deletar em cada post
   - handleAddPost()
   - handleDeletePost()
```

---

## 🎨 Interface do Usuário

### Content Radar - Header

```
┌──────────────────────────────────────────────────────┐
│ Content Radar                                        │
│ 25 posts • Viral acima de 160                        │
│                                                      │
│ [✨ Adicionar Post] [Filtros] [Atualizar]           │
└──────────────────────────────────────────────────────┘
```

### Card de Post

```
┌───────────────────────────────────────────────┐
│ 📢 #5 • Instagram     [⚡ Viral] [⭐]         │
│ há 3h                                         │
├───────────────────────────────────────────────┤
│ "5 erros que impedem vendas no WhatsApp..."  │
├───────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐  │
│ │  ❤️      💬       🔄        ⚡         │  │
│ │ 2.3k    156      89      2.9k          │  │
│ └─────────────────────────────────────────┘  │
├───────────────────────────────────────────────┤
│ [✨ Criar conteúdo] [🔗] [🗑️ Deletar]       │
└───────────────────────────────────────────────┘
```

**Botões:**
- ✨ **Criar conteúdo**: Abre modal com templates
- 🔗 **Link externo**: Abre post original (se houver URL)
- 🗑️ **Deletar**: Remove post (com confirmação)

---

## 🔄 Automação

### Quando o Scraping Acontece?

1. **Manual**: Usuário clica em "Atualizar" no Content Radar
2. **Automático** (futuro): Cron job diário/semanal

### Processo de Coleta

```javascript
// 1. Extrair keywords do nicho
const niche = "Marketing Digital";
const subNiche = "SaaS B2B";
const keywords = ["marketing", "digital", "saas"];

// 2. Para cada keyword, coletar posts
for (const keyword of keywords) {
  // Instagram
  const instagramPosts = await scrapeInstagramHashtag(keyword, 10);

  // TikTok
  const tiktokPosts = await scrapeTikTokHashtag(keyword, 10);
}

// 3. Filtrar por engagement mínimo
const filtered = posts.filter(p =>
  p.likesCount + p.commentsCount * 2 + p.sharesCount * 3 >= 100
);

// 4. Ordenar por engagement
const sorted = filtered.sort((a, b) =>
  calculateScore(b) - calculateScore(a)
);

// 5. Pegar top 20
const top20 = sorted.slice(0, 20);

// 6. Salvar no banco
await supabase.from("collected_posts").insert(top20);
```

### Engagement Score

```
Score = Likes + (Comentários × 2) + (Shares × 3)

Exemplos:
- Instagram: 1000 likes + 50 comments = 1100
- TikTok: 500 likes + 30 comments + 20 shares = 620
```

---

## 📝 API Endpoints

### POST `/api/intelligence/posts`

**Adicionar post manualmente**

**Request:**
```json
{
  "companyId": "uuid",
  "platform": "instagram",
  "postUrl": "https://instagram.com/p/abc123",
  "content": "Texto do post...",
  "likesCount": 2300,
  "commentsCount": 156,
  "sharesCount": 89
}
```

**Response:**
```json
{
  "id": "uuid",
  "engagementScore": 2789,
  "message": "Post adicionado com sucesso!"
}
```

### DELETE `/api/intelligence/posts/:id`

**Deletar post**

**Request:**
```json
{
  "companyId": "uuid"
}
```

**Response:**
```json
{
  "message": "Post deletado com sucesso!"
}
```

### POST `/api/intelligence/collect`

**Executar coleta automática**

**Request:**
```json
{
  "companyId": "uuid",
  "sourceType": "radar",
  "processNow": true
}
```

**Response:**
```json
{
  "companyId": "uuid",
  "queued": [
    { "id": "job-uuid", "type": "radar_collect" }
  ],
  "processed": {
    "done": 1,
    "failed": 0,
    "pending": 0
  }
}
```

---

## 🎯 Casos de Uso

### Caso 1: Primeira Coleta

```
1. Usuário configura nicho em Settings
2. Vai para Intelligence → Content Radar
3. Clica em "Atualizar" (ou espera coleta automática)
4. Sistema coleta 20 posts virais via Apify
5. Posts aparecem ordenados por engagement
6. Usuário pode:
   - Criar conteúdo baseado em qualquer post
   - Deletar posts irrelevantes
   - Adicionar posts manualmente
```

### Caso 2: Curadoria Mista

```
1. Sistema já coletou 15 posts automaticamente
2. Usuário vê um post viral no LinkedIn (não suportado ainda)
3. Clica em "Adicionar Post"
4. Preenche manualmente:
   - Plataforma: LinkedIn
   - Conteúdo: [copiado]
   - Métricas: [observadas]
5. Post aparece junto com os automáticos
6. Ordena por engagement (todos juntos)
```

### Caso 3: Limpeza de Posts

```
1. Radar tem 25 posts (automáticos + manuais)
2. Usuário vê alguns posts irrelevantes
3. Clica em 🗑️ em cada post indesejado
4. Confirma exclusão
5. Posts removidos instantaneamente
6. Radar atualizado com apenas posts relevantes
```

---

## 🛠️ Configurações Avançadas

### Personalizar Coleta

No worker `radar-enhanced.ts`, você pode ajustar:

```typescript
// Linha 203: Número máximo de posts por keyword
const instagramPosts = await scrapeInstagramHashtag(hashtag, 10); // ← Mudar aqui

// Linha 209: Número máximo de posts por keyword (TikTok)
const tiktokPosts = await scrapeTikTokHashtag(hashtag, 10); // ← Mudar aqui

// Linha 232: Engagement mínimo
let posts = await collectPostsViaApify(keywords, 100); // ← Mudar threshold

// Linha 241: Top N posts para salvar
const topPosts = sortedPosts.slice(0, 20); // ← Mudar quantidade
```

### Adicionar Mais Plataformas

Para adicionar LinkedIn (quando Apify suportar):

```typescript
// Em apify-client.ts
export async function scrapeLinkedInHashtag(
  hashtag: string,
  maxPosts: number = 20
): Promise<ApifyLinkedInPost[]> {
  const run = await apifyClient.actor("apify/linkedin-scraper").call({
    hashtags: [hashtag],
    resultsLimit: maxPosts,
  });

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  return items;
}

// Em radar-enhanced.ts
const linkedinPosts = await scrapeLinkedInHashtag(hashtag, 10);
```

---

## 📈 Métricas e Analytics

### Posts Coletados

```sql
-- Total de posts no radar
SELECT COUNT(*) FROM collected_posts
WHERE source_type = 'radar'
AND company_id = 'uuid';

-- Posts por plataforma
SELECT platform, COUNT(*) as total
FROM collected_posts
WHERE source_type = 'radar'
AND company_id = 'uuid'
GROUP BY platform;

-- Engagement médio
SELECT AVG(engagement_score) as avg_engagement
FROM collected_posts
WHERE source_type = 'radar'
AND company_id = 'uuid';
```

### Top Posts

```sql
-- Top 10 posts virais
SELECT
  platform,
  content,
  engagement_score,
  likes_count,
  comments_count,
  shares_count
FROM collected_posts
WHERE source_type = 'radar'
AND company_id = 'uuid'
ORDER BY engagement_score DESC
LIMIT 10;
```

---

## 🚦 Limitações e Considerações

### Apify

**Limitações:**
- API tem rate limits (depende do plano)
- Scraping pode demorar (30s-2min por keyword)
- Instagram e TikTok podem bloquear se uso excessivo
- Custos baseados em uso (compute units)

**Recomendações:**
- Máximo 3-5 keywords por coleta
- Coletar 1-2x por dia (não mais)
- Monitorar custos no dashboard do Apify
- Usar fallback para testes

### Scraping Legal

**Instagram/TikTok ToS:**
- Tecnicamente proíbem scraping
- Apify usa métodos "suaves" menos detectáveis
- Risco baixo mas existe
- Use por sua conta e risco

**Alternativas Seguras:**
- APIs oficiais (Graph API, TikTok Business API)
- Requer aprovação e keys
- Limites de rate mais generosos
- 100% legal e suportado

---

## 🔮 Próximas Melhorias

### v2.3 - Configurações Personalizadas
- [ ] UI para configurar hashtags customizadas
- [ ] Escolher threshold de engagement
- [ ] Ativar/desativar plataformas
- [ ] Agendar coletas automáticas

### v2.4 - Edição de Posts
- [ ] Editar posts adicionados manualmente
- [ ] Atualizar métricas de posts automáticos
- [ ] Adicionar tags customizadas

### v2.5 - APIs Oficiais
- [ ] Integração com Instagram Graph API
- [ ] TikTok Business API
- [ ] LinkedIn API (quando disponível)

### v2.6 - Analytics
- [ ] Dashboard de analytics do radar
- [ ] Tendências ao longo do tempo
- [ ] Comparação entre plataformas
- [ ] Exportar relatórios

---

## ✅ Checklist de Implementação

- [x] Cliente Apify criado
- [x] Worker enhanced com scraping
- [x] Fallback para dados mockados
- [x] API POST para adicionar manual
- [x] API DELETE para remover posts
- [x] Botão "Adicionar Post"
- [x] Modal de formulário completo
- [x] Botão deletar em cada post
- [x] Confirmação antes de deletar
- [x] Feedback de sucesso/erro
- [x] Integração com processor.ts
- [x] Documentação completa

---

## 🎓 Tutorial Completo

### Setup Inicial

1. **Criar conta no Apify**
   - Acesse: https://apify.com
   - Crie conta grátis (free tier tem 5$ de créditos)
   - Gere API token em Settings

2. **Configurar variável de ambiente**
   ```bash
   # .env.local
   APIFY_API_TOKEN=apify_api_xxxxxx
   ```

3. **Instalar dependência**
   ```bash
   npm install apify-client
   ```

4. **Configurar nicho**
   - Settings → Empresa
   - Nicho: "Marketing Digital"
   - Sub-nicho: "SaaS"

5. **Testar coleta**
   - Intelligence → Content Radar
   - Clicar em "Atualizar"
   - Aguardar 30-60s
   - Ver posts aparecerem

### Uso Diário

**Manhã:**
1. Acessar Content Radar
2. Ver posts coletados automaticamente
3. Deletar irrelevantes
4. Adicionar posts manuais se encontrou algo viral

**Criação de Conteúdo:**
1. Escolher post com alto engagement
2. Clicar em "Criar conteúdo"
3. Escolher template
4. Gerar com IA
5. Adaptar e publicar

---

## 📞 Suporte

### Problemas Comuns

**P: Apify não retorna posts**
- Verifique API token
- Confira créditos no Apify
- Teste com hashtag popular (#marketing)
- Veja logs do console

**P: Posts não aparecem**
- Clique em "Recarregar dados"
- Verifique filtros ativos
- Confira banco de dados

**P: Erro ao deletar**
- Verifique se post pertence à empresa
- Recarregue a página
- Tente novamente

---

**Sistema completo implementado! Scraping automatizado + curadoria manual + total controle.** 🎉

**Versão:** 2.2.0
**Data:** 12 de Março de 2026
**Status:** ✅ Pronto para uso
