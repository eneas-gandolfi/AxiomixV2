# WhatsApp Group Intelligence Design

Data: 2026-08-11

## Objetivo

Reposicionar o Axiomix para ter a analise de grupos do WhatsApp como coracao do produto, combinando duas possibilidades no mesmo modulo:

- Radar de Grupos: analise passiva e continua para gestores.
- Agente de Grupo: participacao ativa, opcional e configuravel por grupo.

O primeiro incremento deve reaproveitar o pipeline existente de `group_agent_configs`, `group_messages`, `group_agent_responses` e `group_agent_notes`, sem reescrever os modulos de conversa 1:1, dashboard, agentes ou RAG.

## Principios

- Grupos primeiro: usuarios autenticados devem cair no WhatsApp Intelligence, nao no dashboard generico.
- Radar sempre disponivel: todo grupo registrado deve aparecer no painel, mesmo quando o agente estiver inativo.
- Agente opcional: cada grupo pode ficar em modo silencioso, trigger-only ou proativo.
- IA em batch, nao em tudo: o webhook salva mensagens rapidamente; processamento caro acontece fora do request.
- Memoria curta no runtime, memoria longa no banco: telas consomem agregados e ultimos eventos, nao historico bruto completo.
- Modulos satelite sob flag: Social Publisher, Intelligence externa e KB independente nao devem rodar crons nem carregar UI quando desativados.

## Experiencia Do Produto

### Entrada Principal

Quando o usuario autenticado acessa `/`, ele deve ser redirecionado para `/whatsapp-intelligence`. A sidebar deve apresentar WhatsApp Intelligence como item principal da operacao; Dashboard vira visao auxiliar.

### Radar De Grupos

A tela principal de `/whatsapp-intelligence` deve ter foco em grupos e oferecer:

- resumo de grupos monitorados;
- grupos ativos, silenciosos, quentes e com risco;
- volume de mensagens por periodo;
- ultimas decisoes detectadas;
- pendencias e responsaveis citados;
- oportunidades comerciais ou operacionais;
- duvidas recorrentes;
- alertas de sentimento, atraso, volume anormal ou tema critico;
- acesso ao historico recente do grupo.

### Agente De Grupo

Cada grupo deve expor uma configuracao operacional:

- agente inativo: apenas coleta e radar;
- trigger-only: responde apenas a `@axiomix`, `/ia` ou palavras configuradas;
- proativo: pode publicar resumo, alerta ou recomendacao dentro de limites;
- limites por hora e cooldown;
- tom do agente;
- horario permitido;
- alimentacao de RAG ativada/desativada.

## Arquitetura

### Fluxo De Ingestao

1. Evolution webhook recebe mensagem de grupo.
2. Handler valida token, identifica `company_id` e `group_agent_config`.
3. Mensagem e salva em `group_messages`.
4. Se houver trigger e agente ativo, enfileira ou executa resposta curta.
5. Jobs de batch calculam analises e agregados.
6. UI le tabelas agregadas e ultimos itens.

O webhook nao deve processar midia pesada de forma sincrona no caminho principal. Audio, imagem e PDF devem virar job quando o conteudo for relevante.

### Dados Novos

Criar tabelas derivadas, mantendo `group_messages` como historico bruto:

- `group_daily_metrics`: contadores por grupo/dia.
- `group_insights`: itens classificados como decisao, pendencia, oportunidade, risco, duvida ou resumo.
- `group_topics`: assuntos detectados por grupo e periodo.
- `group_member_stats`: atividade por participante e periodo.

Essas tabelas devem ter `company_id`, `config_id`, timestamps, indices por tenant/grupo e RLS coerente com as demais tabelas de grupo.

### Servicos

Adicionar uma camada em `src/services/group-intelligence/`:

- `aggregates.ts`: calcula metricas baratas a partir de `group_messages`.
- `insights.ts`: extrai decisoes, pendencias, riscos e oportunidades em batch.
- `queries.ts`: fornece dados prontos para UI.
- `media-jobs.ts`: prepara processamento assincrono de midia relevante.

Manter `src/services/group-agent/` para resposta ativa do agente.

### UI

Adicionar ou reorganizar componentes em `src/components/whatsapp/groups/`:

- `groups-radar-page`;
- `group-status-grid`;
- `group-insights-feed`;
- `group-agent-mode-control`;
- `group-activity-card`;
- `group-risk-alerts`.

A primeira versao deve evitar Ant Design nas telas novas, exceto se um componente existente for indispensavel.

## Performance E Memoria

Medidas do primeiro incremento:

- Redirecionar `/` para `/whatsapp-intelligence`.
- Evitar carregar provedores ou libs pesadas em novas superficies de grupo.
- Desligar cron de Social Publisher quando a feature flag estiver falsa.
- Desligar anomaly scan/intelligence quando a feature flag estiver falsa.
- Nao baixar/processar midia pesada no webhook principal.
- Ler no maximo agregados e ultimos N insights na tela inicial.
- Marcar processamento em lotes pequenos e idempotentes.

Medidas posteriores:

- Remover dependencias nao usadas como `@ant-design/charts`, se confirmado por build/testes.
- Isolar `antd` para rotas que ainda dependem dele.
- Trocar polling continuo por Supabase Realtime ou revalidacao orientada a evento nas areas criticas.
- Aplicar retencao para mensagens brutas antigas, mantendo agregados e insights.

## Fora De Escopo Do Primeiro Incremento

- Reescrever Social Publisher.
- Remover todo Ant Design do app.
- Apagar modulos existentes de dashboard, conversas 1:1, Intelligence ou KB.
- Criar billing/plans.
- Criar um novo provedor de WhatsApp.
- Fazer migracao destrutiva de dados de grupo.

## Testes

- Testes unitarios para agregacao de mensagens de grupo.
- Testes de query para montar payload do Radar.
- Teste de middleware/home redirect.
- Testes de scheduler garantindo que crons satelite respeitam feature flags.
- Teste do webhook garantindo que mensagem de grupo salva mesmo com agente inativo.

## Criterios De Aceite

- Usuario autenticado entra no nucleo WhatsApp.
- Tela principal mostra grupos monitorados e estado basico de cada um.
- Grupos com agente inativo continuam alimentando o Radar.
- Agente pode continuar respondendo por trigger nos grupos ativos.
- Crons de modulos desativados nao rodam.
- Processamento caro de grupo fica fora do caminho sincrono do webhook.
- O primeiro incremento nao quebra conversas 1:1, agentes, pipeline ou RAG existente.
