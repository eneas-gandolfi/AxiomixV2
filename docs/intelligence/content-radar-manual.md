# 📡 Content Radar - Curadoria Manual

## 🎯 Nova Abordagem: Sem Scraping

O Content Radar agora funciona com **curadoria manual** ao invés de scraping automático.

---

## ❌ Por Que Removemos o Scraping?

### Problemas do Scraping Automático:
1. **Viola Termos de Serviço** - LinkedIn, Instagram e TikTok proíbem scraping
2. **Instável** - Mudanças nas páginas quebram o scraper constantemente
3. **Bloqueios** - IPs podem ser bloqueados
4. **Legal** - Risco jurídico
5. **Dados Ruins** - Scraping pega dados mal formatados

### Vantagens da Curadoria Manual:
1. ✅ **100% Legal** - Você adiciona posts que viu
2. ✅ **Dados Reais** - Posts que realmente viralizaram
3. ✅ **Controle Total** - Você escolhe o que é relevante
4. ✅ **Sem Bloqueios** - Não há requisições automatizadas
5. ✅ **Fácil Manutenção** - Não quebra com mudanças nas plataformas

---

## 🚀 Como Funciona Agora

### Passo 1: Encontrar Posts Virais
Navegue normalmente nas redes sociais e identifique posts com alto engajamento no seu nicho.

**Onde procurar:**
- 🔍 Explore do Instagram
- 🔍 Feed do LinkedIn
- 🔍 For You do TikTok
- 🔍 Busca por hashtags do nicho
- 🔍 Perfis de referência

### Passo 2: Adicionar no Axiomix
1. Acesse: `Intelligence → Content Radar`
2. Clique em **"Adicionar Post"**
3. Preencha o formulário:
   - **Plataforma**: Instagram, LinkedIn ou TikTok
   - **URL** (opcional): Link do post original
   - **Conteúdo**: Copie/cole o texto do post
   - **Métricas**: Likes, comentários, shares
4. Clique em **"Adicionar Post"**

### Passo 3: Usar Como Referência
- Posts aparecem no Content Radar
- Ordenados por engagement score
- Use para criar conteúdo com templates
- Marque favoritos para acessar depois

---

## 📝 Formulário de Adição

### Campos Obrigatórios:
- ✅ **Plataforma** (Instagram/LinkedIn/TikTok)
- ✅ **Conteúdo** (mínimo 10 caracteres)

### Campos Opcionais:
- URL do post
- Métricas (padrão: 0)

### Engagement Score:
Calculado automaticamente:
```
Score = Likes + (Comentários × 2) + (Shares × 3)
```

---

## 🎨 Interface

### Botão "Adicionar Post"
Localização: `Content Radar → Header`

```
┌─────────────────────────────────────────────┐
│ Content Radar                               │
│ 15 posts • Viral acima de 160               │
│                                             │
│     [✨ Adicionar Post] [Filtros] [...]    │
└─────────────────────────────────────────────┘
```

### Modal de Adição
```
┌──────────────────────────────────────────────┐
│ ✨ Adicionar Post Viral              [✕]    │
│ Adicione posts que você viu viralizando     │
├──────────────────────────────────────────────┤
│                                              │
│ Plataforma:                                  │
│ [Instagram] [LinkedIn] [TikTok]             │
│                                              │
│ URL do Post (opcional)                       │
│ [https://instagram.com/p/...]               │
│                                              │
│ Conteúdo do Post *                           │
│ ┌──────────────────────────────────────┐    │
│ │ Cole ou digite o conteúdo...         │    │
│ │                                      │    │
│ └──────────────────────────────────────┘    │
│ Mínimo 10 caracteres • 245 caracteres        │
│                                              │
│ Métricas:                                    │
│ Likes: [1250]  Comentários: [84]  Shares: [32]│
│ Score calculado: 1514                        │
│                                              │
│ Este post será adicionado ao seu Radar      │
│              [Cancelar] [Adicionar Post]     │
└──────────────────────────────────────────────┘
```

---

## 💡 Dicas de Uso

### Como Encontrar Posts Virais

#### Instagram
1. Vá para aba "Explorar"
2. Busque hashtags do seu nicho
3. Procure posts com:
   - Likes acima de 1000
   - Comentários acima de 50
   - Salvos (se visível)

#### LinkedIn
1. Use a barra de busca
2. Filtre por "Posts" e "Semana passada"
3. Procure posts com:
   - Reações acima de 200
   - Comentários acima de 20
   - Compartilhamentos acima de 10

#### TikTok
1. Navegue pelo "For You"
2. Busque por hashtags
3. Procure vídeos com:
   - Views acima de 10k
   - Likes acima de 500
   - Comentários acima de 50

### Boas Práticas

#### ✅ Faça:
- Adicione 5-10 posts por semana
- Varie as plataformas
- Foque no seu nicho
- Atualize métricas regularmente
- Adicione URL para referência
- Use posts recentes (última semana)

#### ❌ Evite:
- Adicionar posts antigos (>1 mês)
- Copiar posts de nichos diferentes
- Adicionar sem verificar métricas
- Duplicar posts
- Adicionar conteúdo irrelevante

---

## 🔧 API Endpoint

### POST `/api/intelligence/posts`

**Request:**
```json
{
  "companyId": "uuid",
  "platform": "instagram",
  "postUrl": "https://...",
  "content": "Texto do post...",
  "likesCount": 1250,
  "commentsCount": 84,
  "sharesCount": 32
}
```

**Response:**
```json
{
  "id": "uuid",
  "engagementScore": 1514,
  "message": "Post adicionado com sucesso!"
}
```

---

## 📊 Dados na Base

### Tabela: `collected_posts`

Posts adicionados manualmente têm:
- `source_type`: `"radar"`
- `competitor_id`: `null`
- `platform`: `"instagram" | "linkedin" | "tiktok"`
- `post_url`: URL opcional
- `content`: Texto do post
- `likes_count`, `comments_count`, `shares_count`: Métricas
- `engagement_score`: Calculado automaticamente
- `collected_at`: Data de adição

---

## 🎯 Fluxo Completo

```
1. Usuário encontra post viral no Instagram
   ↓
2. Copia o conteúdo e nota as métricas
   ↓
3. Abre Axiomix → Intelligence → Content Radar
   ↓
4. Clica em "Adicionar Post"
   ↓
5. Preenche:
   - Plataforma: Instagram
   - URL: https://instagram.com/p/abc123
   - Conteúdo: [texto copiado]
   - Likes: 1250
   - Comentários: 84
   - Shares: 32
   ↓
6. Clica em "Adicionar Post"
   ↓
7. Post aparece no Content Radar com score 1514
   ↓
8. Usa "Criar conteúdo" para gerar versão própria
   ↓
9. Salva prompt para reutilizar
```

---

## ✨ Features Relacionadas

### Integração com Outras Funcionalidades

#### 1. Criar Conteúdo
- Clique em "Criar conteúdo" no post adicionado
- Escolha template
- Gere versão adaptada ao seu nicho

#### 2. Favoritos
- Marque posts adicionados como favoritos (⭐)
- Acesse na aba "Salvos"
- Organize sua biblioteca de referências

#### 3. Filtros
- Filtre posts por plataforma
- Ordene por engajamento, recência ou viralidade
- Busque por conteúdo

---

## 🚀 Migração de Dados Mockados

### Se você tinha dados mockados antes:

Os dados mockados antigos (gerados automaticamente) continuam no banco. Para limpar:

```sql
-- Remover posts mockados (URLs começam com radar.local)
DELETE FROM collected_posts
WHERE source_type = 'radar'
AND post_url LIKE '%radar.local%';
```

Ou via Supabase Dashboard:
1. Vá para Table Editor
2. Abra `collected_posts`
3. Filtre: `source_type = 'radar'` AND `post_url LIKE '%radar.local%'`
4. Delete rows

---

## 📈 Próximas Melhorias

### v2.2 - Facilitar Adição
- [ ] Extensão do navegador para adicionar com 1 clique
- [ ] Import em lote via CSV
- [ ] Extrair métricas automaticamente da URL

### v2.3 - APIs Oficiais
- [ ] Integração com Instagram Graph API
- [ ] LinkedIn API para empresas
- [ ] TikTok Business API

### v2.4 - Comunidade
- [ ] Posts virais compartilhados entre usuários
- [ ] Biblioteca pública de templates
- [ ] Ranking de posts por nicho

---

## ❓ FAQ

### P: E se eu não quiser adicionar manualmente?
**R:** Você pode usar os dados mockados que já existem ou aguardar a integração com APIs oficiais (v2.3).

### P: Posso adicionar posts de outras plataformas?
**R:** No momento apenas Instagram, LinkedIn e TikTok. Twitter/X será adicionado em breve.

### P: As métricas são validadas?
**R:** Não. Você pode inserir qualquer valor. Seja honesto para ter referências úteis.

### P: Posso editar um post depois de adicionar?
**R:** Atualmente não. Delete e adicione novamente. Edição será implementada em v2.2.

### P: Quantos posts posso adicionar?
**R:** Ilimitado. Mas recomendamos focar em qualidade (5-10 posts/semana de alto valor).

---

## ✅ Checklist de Implementação

- [x] API endpoint `/api/intelligence/posts`
- [x] Validação de dados (Zod)
- [x] Cálculo de engagement score
- [x] Botão "Adicionar Post" na UI
- [x] Modal de formulário
- [x] Estados de loading
- [x] Feedback de sucesso/erro
- [x] Documentação completa
- [x] Integration com refresh

---

*Content Radar - Curadoria manual de posts virais sem scraping*

**Versão:** 2.1.0
**Data:** 12 de Março de 2026
**Status:** ✅ Implementado
