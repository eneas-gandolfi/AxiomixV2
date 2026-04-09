# 🔧 Fix: Posts com URLs Inválidas

## ❌ Problema

Posts coletados mostram links como:
```
https://demo.axiomix.com/tiktok/marketing-6
```

Ao clicar, aparece erro SSL:
```
ERR_SSL_UNRECOGNIZED_NAME_ALERT
```

---

## 🎯 Causa Raiz

O sistema usa **dados mockados** (fallback) quando o Apify falha ou não retorna posts reais.

Esses dados mockados estavam usando **URLs de exemplo** que não existem:

```typescript
// ❌ ANTES (ERRADO):
postUrl: `https://demo.axiomix.com/${platform}/${keyword}-${index + 1}`

// ✅ AGORA (CORRETO):
postUrl: null // Posts mockados não têm URL real
```

---

## ✅ Solução Aplicada

### 1. **Código Corrigido** ✅

Arquivo: `src/services/intelligence/radar-enhanced.ts`

Mudança: Posts mockados agora têm `postUrl: null`

**Resultado:**
- Posts mockados **não mostram** botão de link externo (🔗)
- Apenas posts reais do Apify terão links clicáveis

### 2. **Limpar Posts Antigos** ⏳

Execute o script SQL para **deletar posts com URLs inválidas**:

**Arquivo:** `LIMPAR_POSTS_INVALIDOS.sql`

**Passos:**
1. Abra **Supabase SQL Editor**
2. Cole o conteúdo do arquivo `LIMPAR_POSTS_INVALIDOS.sql`
3. Execute as queries na ordem:
   - Query 1: Ver quantos posts inválidos existem
   - Query 2: Ver detalhes dos posts (opcional)
   - Query 3: **DELETAR** posts inválidos (remova o comentário)

**Exemplo:**
```sql
-- Verificar quantos
SELECT COUNT(*) FROM public.collected_posts
WHERE post_url LIKE '%demo.axiomix.com%';
-- Resultado: 15 posts

-- Deletar
DELETE FROM public.collected_posts
WHERE post_url LIKE '%demo.axiomix.com%';
-- ✅ 15 rows deleted
```

---

## 🚀 Próximos Passos

### Opção A: Usar Apify Real (Recomendado)

Para coletar posts **reais** do Instagram/TikTok:

1. ✅ Instale Apify client:
   ```bash
   npm install apify-client
   ```

2. ✅ Configure API token no `.env.local`:
   ```env
   APIFY_API_TOKEN=apify_api_xxxxxxxxxx
   ```

3. ✅ Execute nova coleta:
   - Acesse: Intelligence → Content Radar
   - Clique em **"Atualizar"**
   - Aguarde 30-60 segundos
   - Posts reais com URLs válidas aparecerão!

**Documentação:** `INSTALL_APIFY.md`

### Opção B: Continuar com Dados Mockados

Se NÃO quiser usar Apify:

- ✅ Sistema funciona normalmente
- ✅ Posts mockados aparecem (sem links externos)
- ✅ Você pode adicionar posts manualmente com URLs reais

---

## 🔍 Como Identificar Posts Mockados

**Posts mockados:**
- ❌ Não têm botão de link externo (🔗)
- 📝 Conteúdo genérico ("Checklist pratico...", "Antes e depois...")
- 📊 Métricas arredondadas (1000, 1500, etc.)

**Posts reais do Apify:**
- ✅ Têm botão de link externo (🔗)
- 📝 Conteúdo real copiado do Instagram/TikTok
- 📊 Métricas reais (1.234, 5.678, etc.)
- 🔗 URLs válidas (instagram.com, tiktok.com)

---

## ✅ Verificar se Funcionou

Após limpar posts antigos e executar nova coleta:

1. Acesse: **Intelligence → Content Radar**
2. Verifique os posts:
   - Posts COM botão 🔗 = **Apify real** (URLs válidas)
   - Posts SEM botão 🔗 = **Mockados** (sem URL)
3. Clique em 🔗 dos posts reais
4. Deve abrir Instagram/TikTok corretamente ✅

---

## 📊 Resumo

| Item | Antes | Agora |
|------|-------|-------|
| **Posts mockados** | URLs inválidas (demo.axiomix.com) | `postUrl: null` |
| **Botão 🔗** | Aparecia mas quebrava | Só aparece se URL válida |
| **Apify real** | Retorna URLs válidas | Continua igual ✅ |
| **Posts antigos** | Com URLs inválidas no banco | Deletar com SQL |

---

**Problema resolvido! Agora apenas posts reais do Apify terão links clicáveis.** 🎉

Se ainda tiver posts com URLs inválidas, execute o script SQL.
Se quiser posts reais, instale e configure o Apify.
