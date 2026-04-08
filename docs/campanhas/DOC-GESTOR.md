# AXIOMIX - Documento para Gestor de Projeto

**Plataforma:** Axiomix v2.0
**Categoria:** Marketing Operations & Customer Intelligence
**Data:** 2026-03-27

---

## 1. Resumo Executivo

A Axiomix e uma plataforma SaaS B2B que centraliza operacoes de marketing e inteligencia de clientes em 7 modulos integrados:

| # | Modulo | Problema que Resolve |
|---|--------|---------------------|
| 1 | Dashboard | Falta de visao consolidada das operacoes |
| 2 | WhatsApp Intelligence | Conversas WhatsApp sem analise ou rastreamento |
| 3 | Intelligence | Desconhecimento do que concorrentes fazem |
| 4 | Social Publisher | Publicacao descentralizada e sem fluxo de aprovacao |
| 5 | Campanhas em Massa | Envio manual de mensagens WhatsApp em escala |
| 6 | Base de Conhecimento | IA sem contexto especifico da empresa |
| 7 | Group Agent | Atendimento manual em grupos WhatsApp |

**Diferencial:** Integracao nativa entre modulos — a analise de WhatsApp alimenta o pipeline de vendas, a base de conhecimento melhora as respostas da IA, e os relatorios consolidam dados de todos os modulos.

---

## 2. Inventario de Funcionalidades por Modulo

### 2.1 Dashboard

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| KPIs com variacao temporal | Entregue | Cards com metricas 7d vs 14d |
| Sentimento overview | Entregue | Resumo de sentimento das conversas |
| Intelligence highlights | Entregue | Posts virais e engagement de concorrentes |
| Content performance | Entregue | Desempenho por plataforma social |
| Integration status | Entregue | Saude das conexoes externas |
| Alertas criticos | Entregue | Resumo de situacoes urgentes |
| Proximos relatorios | Entregue | Agendamento de reports |

### 2.2 WhatsApp Intelligence

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Analise de sentimento | Entregue | Positivo/neutro/negativo por conversa |
| Deteccao de intencao | Entregue | Compra, suporte, reclamacao, duvida, cancelamento |
| Classificacao de estagio de venda | Entregue | Discovery -> closing -> post_sale |
| Insights de conversa | Entregue | Urgencia, objecoes, compromissos |
| Pipeline Kanban | Entregue | Quadro de vendas drag-and-drop |
| Contatos 360 | Entregue | Perfil completo com historico e metricas |
| Analise em lote | Entregue | Processar multiplas conversas de uma vez |
| Auto-atribuicao | Entregue | Distribuicao inteligente para agentes |
| Sugestao de resposta (IA) | Entregue | Respostas contextualizadas |
| Gestao de equipe | Entregue | Membros, carga de trabalho, metricas |
| Labels e tags | Entregue | Organizacao de conversas por etiquetas |
| Exportacao | Entregue | Export de dados de conversas |
| Sessoes WhatsApp | Entregue | Monitoramento de conexao |
| Inicio de conversa | Entregue | Iniciar novo chat a partir da plataforma |
| Envio de mensagem | Entregue | Responder direto pela plataforma |
| Envio de template | Entregue | Templates aprovados pelo WhatsApp |
| Notas internas | Entregue | Anotacoes por conversa |
| Resolucao de conversa | Entregue | Marcar como resolvida |
| Exclusao em massa | Entregue | Limpar conversas antigas |

### 2.3 Intelligence (Competitiva)

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Cadastro de concorrentes | Entregue | Perfis Instagram e TikTok |
| Coleta automatica de posts | Entregue | Via Apify (scraping) |
| Score de engajamento | Entregue | Metrica comparativa |
| Deteccao de viralidade | Entregue | Posts com engagement excepcional |
| Radar de conteudo v2.0 | Entregue | Dashboard aprimorado com insights |
| Posts salvos/favoritos | Entregue | Curadoria de conteudo |
| Selecao de nicho | Entregue | Filtro por segmento |

### 2.4 Social Publisher

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Agendamento multi-plataforma | Entregue | Instagram, LinkedIn, TikTok, Facebook |
| Calendario editorial | Entregue | Vistas dia, semana, agenda |
| Heatmap de melhores horarios | Entregue | Otimizacao por dia/hora |
| Demandas de conteudo (Kanban) | Entregue | Fluxo: criacao -> review -> aprovado -> enviado |
| Aprovacao por link (token) | Entregue | Stakeholders aprovam sem login |
| Comentarios em demandas | Entregue | Feedback colaborativo |
| Biblioteca de midia | Entregue | Upload e gestao via Cloudinary |
| Editor de imagem | Entregue | Edicao integrada |
| Grupos de hashtags | Entregue | Sets reutilizaveis |
| Preview por plataforma | Entregue | Mockup visual antes de publicar |
| Historico de posts | Entregue | Rastreamento de publicacoes |
| Tipos de post | Entregue | Foto, video, carrossel |
| Status tracking | Entregue | scheduled -> processing -> published/failed |
| Progresso por plataforma | Entregue | Status individual por rede |

### 2.5 Campanhas em Massa

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Wizard de criacao (5 etapas) | Entregue | Formulario guiado |
| Filtragem de contatos | Entregue | Labels, genero, data de cadastro |
| Geracao automatica de lista | Entregue | Busca e filtra do CRM |
| Envio imediato | Entregue | Processamento em lotes |
| Agendamento futuro | Entregue | Data/hora via QStash |
| Pausar/retomar | Entregue | Controle mid-execution |
| Estatisticas em tempo real | Entregue | Total, sent, failed, skipped |
| Rastreamento por destinatario | Entregue | Status individual + erro |
| Templates personalizados | Entregue | Variaveis dinamicas |
| Deduplicacao | Entregue | Unique phone por campanha |
| Sugestao de templates anteriores | Entregue | Autocomplete |

### 2.6 Base de Conhecimento (RAG)

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Upload de PDFs | Entregue | Ingestao de documentos |
| Chunking automatico | Entregue | Segmentacao inteligente |
| Embeddings vetoriais | Entregue | Indexacao semantica |
| Busca semantica | Entregue | Por significado, nao keyword |
| Injecao de contexto | Entregue | IA usa base ao responder |
| Gestao de documentos | Entregue | CRUD completo |
| Processamento assincrono | Entregue | QStash para docs grandes |

### 2.7 Group Agent (IA para Grupos)

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Recepcao de mensagens | Entregue | Webhook Evolution API |
| Filtro de relevancia | Entregue | Ignora msgs irrelevantes |
| Deteccao de intencao | Entregue | Classifica a pergunta |
| Consulta a base de conhecimento | Entregue | RAG automatico |
| Geracao de resposta | Entregue | OpenRouter LLM |
| Envio automatico | Entregue | Via Sofia CRM |
| Configuracao por grupo | Entregue | Tom, restricoes, on/off |
| Processamento de midia | Entregue | Extrai texto de imagens |

### 2.8 Relatorios

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Relatorio diario automatico | Entregue | Compilacao das atividades |
| Relatorio semanal com PDF | Entregue | Exportavel |
| Envio via WhatsApp | Entregue | Entrega automatica |
| Historico de relatorios | Entregue | Consulta posterior |

### 2.9 Alertas

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Trigger por sentimento | Entregue | Alerta em sentiment negativo |
| Trigger por intencao | Entregue | Alerta em cancelamento |
| Trigger por urgencia | Entregue | Alta prioridade |
| Link publico de alerta | Entregue | Acesso sem login |
| Configuracao de destinatarios | Entregue | Quem recebe cada alerta |
| Log de alertas | Entregue | Historico de disparos |

### 2.10 Configuracoes

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Gestao de integracoes | Entregue | CRUD + teste de conexao |
| Sofia CRM config | Entregue | URL + token |
| Evolution API config | Entregue | QR Code + webhook |
| Upload.Post config | Entregue | API key + plataformas |
| OpenRouter config | Entregue | Modelo + key |
| Group Agent config | Entregue | Habilitacao por grupo |
| Alertas config | Entregue | Triggers + destinatarios |
| Dashboard de stats | Entregue | Metricas da plataforma |

---

## 3. Metricas e KPIs Recomendados

### 3.1 Metricas de Adocao

| Metrica | Como Medir | Meta |
|---------|-----------|------|
| Usuarios ativos/mes | Logins unicos | Crescimento mensal |
| Modulos utilizados/empresa | Modulos com atividade | >= 3 modulos |
| Conversas analisadas/mes | COUNT conversation_insights | Crescimento mensal |
| Posts agendados/mes | COUNT social_scheduled_posts | Crescimento mensal |
| Campanhas criadas/mes | COUNT campaigns | Baseline a definir |
| Docs na base de conhecimento | COUNT knowledge_base_documents | >= 5 por empresa |

### 3.2 Metricas de Qualidade

| Metrica | Como Medir | Meta |
|---------|-----------|------|
| Taxa de sucesso de envio (campanhas) | sent / total | > 95% |
| Taxa de conclusao de campanhas | completed / total | > 85% |
| Taxa de publicacao social | published / scheduled | > 90% |
| Taxa de aprovacao de demandas | aprovados / total | Informativo |
| Precisao do sentimento (IA) | Feedback do usuario | > 80% |
| Tempo medio de analise | Tempo por conversa analisada | < 30s |

### 3.3 Metricas Tecnicas

| Metrica | Alerta |
|---------|--------|
| Jobs stuck em "running" > 5 min | Possivel falha no processamento |
| Integracoes com status "error" | Servico externo indisponivel |
| Campanhas em "running" > 2h | QStash ou Sofia com problema |
| Taxa de erro em callbacks QStash | > 5% = signing keys ou endpoint |
| Tempo de sync WhatsApp | > 10 min = volume alto ou API lenta |
| Falhas de publicacao social | Upload.Post ou plataforma indisponivel |

---

## 4. Dependencias e Riscos

### 4.1 Dependencias Externas

| Servico | Modulos que Dependem | Criticidade | Impacto se Fora |
|---------|---------------------|-------------|-----------------|
| Sofia CRM | WhatsApp Intel, Campanhas, Group Agent | **Critica** | Sem sync, sem envio, sem IA em grupos |
| Evolution API | Group Agent, Sessoes | Alta | Sem IA em grupos, sem QR code |
| Upload.Post | Social Publisher | Alta | Sem publicacao em redes sociais |
| OpenRouter | WhatsApp Intel, Group Agent, Reports | **Critica** | Sem analise IA, sem sugestoes, sem relatorios |
| Cloudinary | Social Publisher, Biblioteca | Media | Sem upload de midia |
| Apify | Intelligence | Media | Sem coleta de concorrentes |
| QStash | Campanhas, Social, RAG | **Critica** | Sem processamento assincrono |
| Supabase | Todos | **Critica** | Plataforma inteira indisponivel |

### 4.2 Matriz de Riscos

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| WhatsApp bloqueia numero por spam | Media | Alto | Throttling (3s), templates aprovados, segmentacao |
| OpenRouter fora do ar | Baixa | Alto | Fallback para modelos gratuitos (Llama, Qwen, Mistral) |
| Sofia CRM instavel | Media | Alto | Retry automatico, job queue com recovery |
| Dados desatualizados no CRM | Media | Medio | Sync periodico (15 min), deduplicacao |
| Volume alto sobrecarrega API | Baixa | Medio | Batching, rate limiting, filas QStash |
| Credenciais de integracao expiram | Media | Alto | Teste de conexao no dashboard, alertas |
| Perda de sessao WhatsApp | Media | Medio | Monitoramento de sessao, reconexao via QR |
| Apify muda estrutura de scraping | Media | Baixo | Actors versionados, fallback |
| Custos WhatsApp acima do esperado | Media | Medio | Segmentacao, filtros, monitoramento |
| Falha na geracao de PDF | Baixa | Baixo | Logs de erro, retry manual |

---

## 5. Arquitetura de Integracoes

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Sofia CRM   │     │ Evolution API│     │  Upload.Post │
│  (WhatsApp)  │     │  (WhatsApp)  │     │ (Redes Sociais)│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │  REST/HTTP2        │  Webhook            │  REST API
       │                    │                     │
┌──────▼────────────────────▼─────────────────────▼───────┐
│                                                          │
│                    AXIOMIX (Next.js)                      │
│                                                          │
│  WhatsApp Intel │ Social Publisher │ Campanhas │ RAG      │
│                                                          │
└────┬──────────────┬──────────────────┬──────────────┬───┘
     │              │                  │              │
┌────▼────┐  ┌──────▼──────┐  ┌───────▼──────┐ ┌────▼─────┐
│Supabase │  │  OpenRouter  │  │   QStash     │ │Cloudinary│
│(Banco)  │  │   (IA/LLM)  │  │  (Filas)     │ │ (Midia)  │
└─────────┘  └─────────────┘  └──────────────┘ └──────────┘
                                                     │
                                              ┌──────▼─────┐
                                              │   Apify    │
                                              │ (Scraping) │
                                              └────────────┘
```

---

## 6. Custos Operacionais

### 6.1 Infraestrutura (custo Axiomix)

| Item | Custo Mensal Estimado | Modelo |
|------|----------------------|--------|
| Supabase | $25 - $100 | Plano Pro/Team |
| QStash (Upstash) | $1 - $10 | Pay-per-use (~$1/100k msgs) |
| Vercel (hosting) | $20 - $100 | Pro plan |
| Cloudinary | $0 - $89 | Free/Plus tier |
| OpenRouter | $10 - $200 | Pay-per-token |
| Apify | $0 - $49 | Starter/Scale |
| **Total infra** | **~$56 - $548/mes** | |

### 6.2 Custos Repassados ao Cliente

| Item | Custo | Observacao |
|------|-------|-----------|
| Templates WhatsApp (marketing) | R$ 0,25 - 0,50/msg | Cobrado pela Meta |
| Templates WhatsApp (utilidade) | R$ 0,10 - 0,20/msg | Cobrado pela Meta |
| Templates WhatsApp (auth) | R$ 0,10 - 0,15/msg | Cobrado pela Meta |

### 6.3 Projecao por Cliente (custo variavel)

| Porte | Campanhas/mes | Analises IA | Custo WhatsApp* | Custo IA* |
|-------|---------------|-------------|-----------------|-----------|
| Pequeno | 1.000 msgs | 500 conversas | R$ 250 - R$ 500 | R$ 5 - R$ 20 |
| Medio | 10.000 msgs | 2.000 conversas | R$ 2.500 - R$ 5.000 | R$ 20 - R$ 80 |
| Grande | 50.000 msgs | 10.000 conversas | R$ 12.500 - R$ 25.000 | R$ 80 - R$ 400 |

*Valores aproximados. WhatsApp e o custo dominante.

---

## 7. Roadmap Sugerido

### Curto Prazo (1-2 meses)

| Item | Modulo | Esforco | Impacto |
|------|--------|---------|---------|
| Relatorio exportavel por campanha (PDF/Excel) | Campanhas | Baixo | Medio |
| Tracking de custo por campanha | Campanhas | Baixo | Alto |
| Notificacao ao terminar campanha agendada | Campanhas | Baixo | Medio |
| Dashboard de uso da IA (tokens consumidos) | Settings | Medio | Alto |
| Webhook de status de entrega WhatsApp | WhatsApp | Medio | Alto |
| Melhoria de onboarding (setup wizard) | Core | Medio | Alto |

### Medio Prazo (3-4 meses)

| Item | Modulo | Esforco | Impacto |
|------|--------|---------|---------|
| Import de contatos via CSV/Excel | Campanhas | Medio | Alto |
| Dashboard analitico comparativo | Intelligence | Medio | Medio |
| A/B Testing de templates | Campanhas | Alto | Alto |
| Preview visual de template WhatsApp | Campanhas | Medio | Medio |
| Automacoes de fluxo (if/then) | WhatsApp | Alto | Alto |
| Multi-idioma (EN/ES) | Core | Alto | Medio |

### Longo Prazo (5-6 meses)

| Item | Modulo | Esforco | Impacto |
|------|--------|---------|---------|
| Campanhas recorrentes (cron) | Campanhas | Alto | Medio |
| Workflow de aprovacao multi-nivel | Campanhas | Medio | Medio |
| Integracao com outros canais (SMS, Email) | Core | Alto | Alto |
| Marketplace de templates | Social/Campanhas | Alto | Medio |
| API publica para integracao de terceiros | Core | Alto | Alto |
| Mobile app (React Native) | Core | Muito Alto | Alto |

---

## 8. Checklist de Implementacao / Go-Live

### Pre-Lancamento

**Infraestrutura:**
- [ ] Supabase em plano de producao com backups
- [ ] Vercel com dominio customizado e SSL
- [ ] Todas as env vars configuradas
- [ ] Migrations executadas em producao
- [ ] QStash configurado com signing keys de producao

**Integracoes:**
- [ ] Sofia CRM configurada e testada (sync funcionando)
- [ ] Evolution API com instancia de producao
- [ ] Upload.Post com contas de redes sociais conectadas
- [ ] OpenRouter com creditos suficientes
- [ ] Cloudinary com plano adequado ao volume
- [ ] Apify com actors configurados

**Funcionalidades:**
- [ ] Login e onboarding testados end-to-end
- [ ] Sync de conversas WhatsApp funcionando
- [ ] Analise de conversa com IA retornando resultados
- [ ] Agendamento e publicacao social funcionando
- [ ] Campanha completa: draft -> generate -> start -> completed
- [ ] Base de conhecimento: upload -> process -> query
- [ ] Group Agent respondendo em grupo de teste
- [ ] Relatorios diario e semanal gerando
- [ ] Alertas disparando corretamente
- [ ] Todas as integracoes com status "ok"

**Seguranca:**
- [ ] RLS ativo em todas as tabelas
- [ ] Credenciais de integracao encriptadas
- [ ] Rotas publicas validadas (tokens assinados)
- [ ] Middleware de auth protegendo rotas corretas
- [ ] CORS e headers de seguranca configurados

**Performance:**
- [ ] Cron jobs rodando nos intervalos corretos
- [ ] Heartbeat recuperando jobs travados
- [ ] Rate limiting configurado para APIs externas
- [ ] Monitoramento de erros ativo

### Pos-Lancamento

- [ ] Monitorar primeiras campanhas reais
- [ ] Acompanhar taxa de sucesso de analises IA
- [ ] Verificar estabilidade das sessoes WhatsApp
- [ ] Coletar feedback dos usuarios (1a semana)
- [ ] Ajustar throttling se necessario
- [ ] Monitorar custos reais vs projecao
- [ ] Revisar alertas falso-positivos
- [ ] Validar relatorios gerados automaticamente

---

## 9. Equipe e Responsabilidades

| Area | Responsabilidade |
|------|-----------------|
| Desenvolvimento | Implementacao, testes, deploy, correcao de bugs |
| Produto | Priorizacao do roadmap, discovery de novas funcionalidades |
| Suporte | Treinamento de clientes, resolucao de duvidas |
| Infraestrutura | Configuracao de ambientes, monitoramento, escalonamento |
| Comercial | Precificacao, comunicacao de custos WhatsApp, onboarding comercial |
| QA | Testes de regressao, validacao de integracoes, cenarios criticos |

---

## 10. Numeros do Projeto

| Metrica | Valor |
|---------|-------|
| Modulos funcionais | 7 (+3 sub-sistemas: alertas, reports, group agent) |
| Componentes UI | ~120 |
| Endpoints de API | ~98 |
| Tabelas no banco | ~30 |
| Integracoes externas | 7 |
| Services (logica de negocio) | ~44 arquivos |
| Tipos/interfaces | ~50 definicoes |
| Arquivos TypeScript totais | ~250+ |

---

## 11. Conclusao

A Axiomix e uma plataforma madura com 7 modulos integrados que cobrem o ciclo completo de marketing operations:

1. **Captura** — Conversas WhatsApp sincronizadas automaticamente
2. **Analise** — IA classifica sentimento, intencao e estagio de venda
3. **Acao** — Pipeline de vendas, respostas sugeridas, atribuicao automatica
4. **Comunicacao** — Campanhas em massa e publicacao multi-plataforma
5. **Inteligencia** — Monitoramento de concorrentes e radar de conteudo
6. **Conhecimento** — Base de documentos com busca semantica
7. **Automacao** — Group Agent, alertas e relatorios automaticos

**Custos de infraestrutura sao baixos** (~$56-$548/mes dependendo do uso), com o custo principal sendo os templates WhatsApp cobrados pela Meta e repassados ao cliente.

**Principais riscos** sao dependencia de servicos externos (Sofia CRM, OpenRouter, WhatsApp) mitigados por fallbacks, retry automatico e monitoramento integrado.

**Proximos passos estrategicos:** Webhook de entrega WhatsApp, tracking de custos, import de contatos e dashboard de uso da IA para visibilidade financeira e operacional.
