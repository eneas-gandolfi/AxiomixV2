# AXIOMIX — Design System "Orange Command"
> Versao 3.0 · Micro SaaS de Marketing e Inteligencia Competitiva · Dark & Light Edition

---

## Indice

1. [Fundacao](#1-fundacao)
   - [Identidade da Marca: Orange Command](#identidade-da-marca-orange-command)
   - [Principios de Design](#principios-de-design)
2. [Tokens de Design](#2-tokens-de-design)
   - [Paleta de Cores](#paleta-de-cores)
   - [Tema Claro / Escuro](#tema-claro--escuro)
   - [Cores por Modulo](#cores-por-modulo)
   - [Sistema de Sombras](#sistema-de-sombras)
   - [Tipografia](#tipografia)
   - [Animacoes](#animacoes)
   - [Espacamento](#espacamento)
   - [Bordas e Raios](#bordas-e-raios)
   - [Breakpoints](#breakpoints)
3. [Elemento Assinatura: Eixo de Decisao](#3-elemento-assinatura-eixo-de-decisao)
4. [Componentes](#4-componentes)
   - [Button](#button)
   - [Card](#card)
   - [InsightCard](#insightcard)
   - [ScanLoader](#scanloader)
   - [Sidebar](#sidebar)
   - [Badge](#badge)
   - [Input & Form](#input--form)
   - [Toggle (Dark/Light Mode)](#toggle-darklight-mode)
   - [Modal / Dialog](#modal--dialog)
   - [Topbar](#topbar)
   - [Progress Bar](#progress-bar)
   - [Empty State](#empty-state)
5. [Padroes de Layout](#5-padroes-de-layout)
   - [PageContainer](#pagecontainer)
   - [Grid de Metricas](#grid-de-metricas)
   - [Tabela Paginada](#tabela-paginada)
6. [Icones](#6-icones)
7. [Feedback & Estado](#7-feedback--estado)
   - [Loading States](#loading-states)
   - [Toast / Notificacoes](#toast--notificacoes)
   - [Status Badges](#status-badges)
8. [Regras do Laranja](#8-regras-do-laranja)
9. [Filosofia de Copy](#9-filosofia-de-copy)
10. [Acessibilidade](#10-acessibilidade)
11. [Arquitetura de Arquivos](#11-arquitetura-de-arquivos)
12. [Configuracao do Projeto](#12-configuracao-do-projeto)

---

## 1. Fundacao

### Identidade da Marca: Orange Command

**Essencia:** "Inteligencia que gera acao"

O AXIOMIX e um estrategista senior que nao desperdiça palavras. O sistema opera como um centro de comando onde cada elemento visual tem proposito claro e direto.

**Metaforas visuais:**

| Modo | Metafora | Sensacao |
|------|----------|----------|
| Dark Mode | **Cockpit / Centro de Comando** | Precisao noturna, foco total, dados em destaque |
| Light Mode | **Sala de Briefing Matinal** | Clareza, organizacao, visao estrategica |

**Regra fundamental do laranja:** O laranja aparece APENAS onde decisoes acontecem. Se o laranja esta na tela, ele deve significar algo. Uso decorativo = zero laranja.

**Logo e Nome**
- Sempre escrito em maiusculas: `AXIOMIX`
- Cor do logotipo: `--color-primary` (#E8600F) sobre fundos claros e escuros
- Nao distorcer, recolorizar ou adicionar efeitos ao logotipo

---

### Principios de Design

| Principio | Descricao |
|-----------|-----------|
| **Inteligencia visivel** | O sistema mostra que pensou antes de apresentar. Dados brutos viram insights acionaveis. |
| **Laranja = acao** | Cor primaria reservada exclusivamente para elementos que exigem decisao do usuario. |
| **Precisao cinematica** | Animacoes com proposito — dados materializam, nao aparecem. Cada transicao conta uma historia. |
| **Feedback imediato** | Toda acao do usuario recebe resposta visual em <= 150ms. |
| **Consistencia acima de criatividade** | Use sempre os tokens definidos. Nao invente variacoes ad-hoc. |
| **Tema como contexto** | Claro e escuro sao modos de igual importancia — nenhum e "padrao". |
| **Copy que instrui** | Cada titulo responde: "E dai? O que eu faço com isso?" |

---

## 2. Tokens de Design

### Paleta de Cores

#### Cor Primaria

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | `#E8600F` | CTAs principais, links ativos, Eixo de Decisao |
| `--color-primary-hover` | `#FF6B1A` (light) / `#FF7D3A` (dark) | Hover em elementos com `--color-primary` |
| `--color-primary-muted` | `#CC5500` | Variante de media intensidade |
| `--color-primary-dim` | `#FFF4EE` (light) | Background sutil de destaque |
| `--color-primary-rgb` | `232 96 15` | Para composicao rgba (sombras, glows) |

#### Cores Semanticas (invariantes em ambos os modos)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-success` | `#22C55E` | Confirmacoes, publicado, positivo |
| `--color-warning` | `#F59E0B` | Alertas, parcial, neutro |
| `--color-danger` | `#EF4444` | Erros, falhou, negativo |
| `--color-info` | `#3B82F6` | Informacoes, dicas, contexto |

---

### Tema Claro / Escuro

O projeto usa `class="dark"` no `<html>` para alternar temas (`darkMode: 'class'` no Tailwind). Todos os tokens de superficie e texto sao redefinidos por tema via CSS custom properties.

#### Light Mode — "Sala de Briefing"

| Token CSS | Valor | Descricao |
|-----------|-------|-----------|
| `--color-background` | `#F7F8FA` | Fundo principal |
| `--color-surface` | `#FFFFFF` | Cards, paineis |
| `--color-surface-2` | `#ECEEF2` | Superficie secundaria |
| `--color-surface-3` | `#E4E7EC` | Superficie terciaria |
| `--color-border` | `#D8DCE3` | Bordas padrao |
| `--color-border-strong` | `#C0C6D0` | Bordas de enfase |
| `--color-text` | `#0D1117` | Texto principal |
| `--color-text-secondary` | `#5A6472` | Texto secundario |
| `--color-text-tertiary` | `#657080` | Texto terciario |
| `--color-sidebar-nav` | `#0D1117` | Sidebar — permanece escura no light! |

#### Dark Mode — "Precision Dark / Deep Night"

| Token CSS | Valor | Descricao |
|-----------|-------|-----------|
| `--color-background` | `#080B10` | Blue-night, nao preto puro |
| `--color-surface` | `#0D1117` | Cards, paineis |
| `--color-surface-2` | `#161B22` | Superficie secundaria |
| `--color-surface-3` | `#1C2230` | Superficie terciaria |
| `--color-border` | `#1E2530` | Bordas padrao |
| `--color-border-strong` | `#2D3648` | Bordas de enfase |
| `--color-text` | `#F0F4FA` | Snow — texto principal |
| `--color-text-secondary` | `#8892A4` | Mist — texto secundario |
| `--color-text-tertiary` | `#737F8F` | Texto terciario |
| `--color-primary-hover` | `#FF7D3A` | Mais claro para superficies escuras |

> **Nota importante:** O fundo dark usa `#080B10` (blue-night) em vez de preto puro. Isso cria profundidade e evita fadiga visual em uso prolongado — essencial para a metafora de cockpit.

#### Regras de Uso de Cor

```
Correto:
- Usar sempre variaveis CSS, nunca valores hex hardcoded em componentes
- Usar --color-primary apenas para acoes que exigem decisao
- Maximo 3 elementos laranja por tela
- Testar visualmente ambos os temas antes de fazer PR
- Sidebar sempre escura, mesmo no modo claro

Incorreto:
- Hardcodar hex diretamente em classes Tailwind (use as variaveis)
- Criar variacoes de cor fora da paleta definida
- Usar laranja em mais de 3 elementos por tela
- Usar laranja para decoracao
- Assumir que texto preto funciona em ambos os temas
```

---

### Cores por Modulo

Cada modulo do AXIOMIX tem uma cor de identidade. A fonte unica de verdade e `src/lib/module-colors.ts`. Nenhum outro arquivo deve definir cores de modulo diretamente.

| Modulo | Cor | Hex |
|--------|-----|-----|
| Dashboard / Settings | Cinza neutro | `#8892A4` |
| WhatsApp Intelligence | Teal | `#0D9488` |
| Intelligence / Radar | Gold | `#D97706` |
| Social Publisher | Violeta | `#8B5CF6` |
| Campanhas | Verde | `#16A34A` |
| Base de Conhecimento | Roxo | `#7C3AED` |

**Arquitetura de derivacao:**
1. `src/lib/module-colors.ts` — define as cores brutas
2. `src/lib/module-theme.tsx` — deriva CSS vars (backgrounds, borders, text) a partir das cores do modulo
3. `tailwind.config.ts` — consome `module-colors` para gerar utilitarios Tailwind

```tsx
// src/lib/module-colors.ts (fonte unica de verdade)
export const MODULE_COLORS = {
  dashboard:    '#8892A4',
  settings:     '#8892A4',
  whatsapp:     '#0D9488',
  intelligence: '#D97706',
  social:       '#8B5CF6',
  campanhas:    '#16A34A',
  knowledge:    '#7C3AED',
} as const
```

---

### Sistema de Sombras

As sombras sao derivadas de `--color-primary-rgb` para manter o tom quente da marca.

| Token | Valor |
|-------|-------|
| `shadow-card` | `0 1px 3px rgb(var(--color-primary-rgb) / 0.04), 0 1px 2px rgb(var(--color-primary-rgb) / 0.03)` |
| `shadow-dropdown` | `0 4px 16px rgb(var(--color-primary-rgb) / 0.08)` |
| `shadow-modal` | `0 20px 60px rgb(var(--color-primary-rgb) / 0.12)` |
| `shadow-primary` | `0 4px 14px rgb(var(--color-primary-rgb) / 0.25)` |
| `btn-glow` | `0 0 20px rgb(var(--color-primary-rgb) / 0.3)` |
| `decision-glow` | `0 0 12px rgb(var(--color-primary-rgb) / 0.4)` |

> O padrao `rgb(var(--color-primary-rgb) / opacity)` permite composicao dinamica sem criar dezenas de tokens de opacidade.

---

### Tipografia

O sistema usa tres familias com papeis distintos. As fontes nao mudaram, mas a filosofia sim: **tipografia que instrui, nao descreve**.

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=Geist+Mono:wght@400;700&display=swap');
```

| Familia | Papel |
|---------|-------|
| **Bricolage Grotesque** | Display e titulos — comunica autoridade e decisao |
| **Instrument Sans** | Body e UI — clareza e legibilidade em interfaces |
| **Geist Mono** | Tecnico — dados, metricas, IDs, timestamps |

#### Escala Tipografica

| Token | Tamanho | Peso | Font | Uso |
|-------|---------|------|------|-----|
| `ax-t1` | 24px | 700 | Bricolage Grotesque | Titulo de pagina |
| `ax-t2` | 20px | 600 | Bricolage Grotesque | Titulo de secao / card |
| `ax-t3` | 16px | 500 | Instrument Sans | Subtitulo, label importante |
| `ax-body` | 14px | 400 | Instrument Sans | Texto de corpo, inputs |
| `ax-caption` | 12px | 400 | Instrument Sans | Timestamps, metadados |
| `ax-kpi` | 32px | 700 | Bricolage Grotesque | Metricas de destaque em dashboards |
| `ax-kpi-label` | 11px | 400 | Geist Mono | Label de KPI, uppercase tracking-wide |
| `ax-mono` | 13px | 400 | Geist Mono | Valores tecnicos, tokens, IDs |

#### Hierarquia de Titulos

```
H1 — 24px / Bold     / Bricolage   / --color-text          -> Titulo da pagina
H2 — 20px / SemiBold / Bricolage   / --color-text          -> Titulo de secao
H3 — 16px / Medium   / Instrument  / --color-text          -> Titulo de card
H4 — 14px / Medium   / Instrument  / --color-text-secondary -> Label de campo
```

#### Regras Tipograficas

- **Nunca** use Inter, Roboto ou fontes de sistema — a pilha tipografica e parte da identidade visual
- **Nunca** use `font-weight: 400` em titulos H1-H3
- **Nunca** use tamanhos fora da escala definida
- Limite linhas de texto truncado a 1-2 com `line-clamp`
- Use `font-variant-numeric: tabular-nums` em numeros de metricas
- **Todo titulo deve instruir**, nao apenas descrever (ver secao de Copy)

---

### Animacoes

O vocabulario de animacao do Orange Command e cinematico e proposital. Cada animacao conta uma historia sobre o dado.

**Curva padrao:** `cubic-bezier(0.22, 1, 0.36, 1)` — inicio afiado, final preciso.

| Token | Duracao | Tipo | Uso |
|-------|---------|------|-----|
| `ax-emerge` | 400ms | Entrada | Dados materializam na tela. Fade-in + translate sutil. |
| `ax-breathe` | 2.4s loop | Atencao | Pulso suave indicando que algo precisa de atencao. **Maximo 1 por tela.** |
| `ax-cascade` | 150ms base | Sequencia | Dados chegam em sequencia. Usar com stagger delays (`delay-[150ms]`, `delay-[300ms]`, etc). |
| `ax-scan` | 1.8s loop | Loading | Linha de varredura horizontal — identidade de radar/sonar. Substitui skeleton-shimmer. |
| `ax-value-pulse` | 600ms | Feedback | Flash quando um dado muda de valor. |
| `ax-decision` | 500ms | Assinatura | Eixo de Decisao aparece com glow. |
| `ax-module-shift` | 300ms | Transicao | Transicao entre modulos. |

#### Regras de Animacao

```
Correto:
- ax-breathe: maximo 1 elemento pulsando por tela
- ax-cascade: sempre com stagger (150ms entre itens)
- ax-scan: apenas em estados de loading, nunca decorativo
- Respeitar prefers-reduced-motion em TODAS as animacoes

Incorreto:
- Multiplos ax-breathe na mesma tela (poluicao visual)
- Animacoes sem proposito informativo
- Duracao customizada fora dos tokens definidos
- Ignorar prefers-reduced-motion
```

```css
/* Implementacao base */
@keyframes ax-emerge {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes ax-breathe {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}

@keyframes ax-scan {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes ax-value-pulse {
  0%   { background-color: rgb(var(--color-primary-rgb) / 0.2); }
  100% { background-color: transparent; }
}

@keyframes ax-decision {
  from { opacity: 0; height: 0; box-shadow: 0 0 0 rgb(var(--color-primary-rgb) / 0); }
  to   { opacity: 1; height: 100%; box-shadow: 0 0 12px rgb(var(--color-primary-rgb) / 0.4); }
}

/* Respeitar preferencia do usuario */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### Espacamento

Escala de 4px do Tailwind. Valores mais usados:

| Token Tailwind | Valor | Uso tipico |
|---------------|-------|------------|
| `p-1` / `gap-1` | 4px | Micro-espacamento entre icone e texto |
| `p-2` / `gap-2` | 8px | Padding de badges, espacamento de lista |
| `p-3` / `gap-3` | 12px | Padding de inputs, espacamento de form |
| `p-4` / `gap-4` | 16px | Padding de cards pequenos, gap entre cards |
| `p-6` / `gap-6` | 24px | Padding padrao de cards |
| `p-8` / `gap-8` | 32px | Padding de secoes |

**Regra geral:** Elementos do mesmo grupo = `gap-3/4`. Grupos distintos = `gap-6/8`.

---

### Bordas e Raios

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | 4px | Tags, badges pequenos |
| `rounded-md` | 6px | Inputs, botoes |
| `rounded-lg` | 8px | Cards, dropdowns |
| `rounded-xl` | 12px | Modais, paineis laterais |
| `rounded-2xl` | 16px | Cards de destaque, hero sections |
| `rounded-full` | 9999px | Avatares, toggles, pills |

**Border padrao:** `1px solid var(--color-border)`

---

### Breakpoints

| Nome | Tamanho | Contexto |
|------|---------|----------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop — sidebar aparece |
| `xl` | 1280px | Desktop padrao |
| `2xl` | 1536px | Desktop wide |

**Sidebar:** Colapsada abaixo de `lg`. Icone-only entre `lg` e `xl`. Expandida em `xl+`.

---

## 3. Elemento Assinatura: Eixo de Decisao

O **Eixo de Decisao** (Decision Axis) e o elemento visual que diferencia o AXIOMIX de qualquer outro SaaS. E uma linha vertical de 2px na cor primaria laranja que aparece EXCLUSIVAMENTE quando a IA conclui algo.

**Regra:** "Quando voce ve o eixo, o Axiomix esta dizendo: eu decidi."

### Anatomia

```
┌─────────────────────────────────────────┐
│  ██ ← 2px vertical, --color-primary     │
│  ██  Insight da IA aqui.                │
│  ██  "Engajamento caiu 8% esta semana.  │
│  ██   Recomendo postar 2x mais no       │
│  ██   horario de pico (18h-20h)."       │
│  ██                                     │
│  ██  Glow sutil ao redor da linha       │
└─────────────────────────────────────────┘
```

### Componente: `<DecisionAxis>`

```tsx
// Uso
<DecisionAxis>
  <p>Engajamento caiu 8% esta semana. Recomendo postar 2x mais no horario de pico.</p>
</DecisionAxis>
```

### Regras do Eixo

- Aparece APENAS com conclusoes da IA, nunca em conteudo estatico
- Animacao de entrada: `ax-decision` (500ms, com glow)
- Linha: 2px largura, cor `--color-primary`
- Glow: `decision-glow` (sombra laranja sutil)
- Nao pode ser usado para decoracao ou separacao visual

---

## 4. Componentes

### Button

#### Variantes

| Variante | Aparencia |
|----------|-----------|
| `primary` | `bg-primary text-white` + `btn-glow` + `active:scale-[0.98]` |
| `secondary` | `bg-surface text-text border border-border hover:bg-surface-2` |
| `ghost` | `bg-transparent text-text-secondary hover:bg-surface-2` |
| `danger` | `bg-danger text-white hover:bg-red-600` |
| `link` | `text-primary underline-offset-4 hover:underline` |

#### Tamanhos

| Tamanho | Classes | Uso |
|---------|---------|-----|
| `sm` | `h-8 px-3 text-xs` | Acoes em tabelas |
| `md` | `h-10 px-4 text-sm` | Botoes de formulario e cards |
| `lg` | `h-12 px-6 text-base` | CTAs de destaque |

#### Estados

```
Default   -> cores definidas + btn-glow (primary)
Hover     -> --color-primary-hover + glow intensificado
Active    -> scale-[0.98] (micro-feedback tatil)
Focus     -> ring-2 ring-primary ring-offset-2 ring-offset-background
Disabled  -> opacity-40 cursor-not-allowed pointer-events-none
Loading   -> Loader2 animado + texto "Salvando..." + disabled
```

#### Botao primary com glow

```css
/* O btn-glow e padrao no botao primary */
box-shadow: 0 0 20px rgb(var(--color-primary-rgb) / 0.3);
transition: box-shadow 200ms, transform 100ms;

/* Hover intensifica */
hover:box-shadow: 0 0 28px rgb(var(--color-primary-rgb) / 0.4);

/* Active comprime */
active:transform: scale(0.98);
```

---

### Card

#### Comportamento de hover

No Orange Command, cards "despertam" no hover com um brilho laranja na borda:

```css
/* Card padrao */
bg-[--color-surface] rounded-xl border border-[--color-border] p-6 overflow-hidden
transition-all duration-200

/* Hover — card desperta */
hover:border-color: rgb(var(--color-primary-rgb) / 0.3);
hover:box-shadow: 0 0 20px rgb(var(--color-primary-rgb) / 0.08);
```

#### Anatomia

```
┌─────────────────────────────────────────┐
│  Card Header (opcional)                  │
│  ┌───────────────┐  ┌─────────────────┐  │
│  │ Titulo + Icon │  │ Acao de Header  │  │
│  └───────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│  Card Body                               │
│  [conteudo principal]                    │
├─────────────────────────────────────────┤
│  Card Footer (opcional)                  │
│  [metadados / links / acoes secundarias] │
└─────────────────────────────────────────┘
```

#### Card de Metrica

```
┌──────────────────────┐
│  CONVERSAS ATIVAS     │  <- ax-kpi-label / Geist Mono / uppercase
│                       │
│    3.847              │  <- ax-kpi / Bricolage Grotesque Bold
│    +12% esta semana   │  <- ax-body / --color-success ou --color-danger
│    ───────────────    │  <- sparkline (opcional)
└──────────────────────┘
```

---

### InsightCard

Card com Eixo de Decisao integrado. Usado quando a IA apresenta conclusoes com recomendacoes de acao.

```
┌─────────────────────────────────────────┐
│  Card Header                             │
├─────────────────────────────────────────┤
│  ██  Insight da IA com Eixo de Decisao  │
│  ██  "Recomendacao acionavel aqui."     │
├─────────────────────────────────────────┤
│  [Acao sugerida]                         │
└─────────────────────────────────────────┘
```

O `InsightCard` combina o componente `Card` com o `DecisionAxis` internamente. Usa animacao `ax-emerge` na entrada.

---

### ScanLoader

Substitui o antigo `skeleton-shimmer`. Em vez do efeito generico de shimmer, usa uma linha de varredura horizontal que remete a identidade de radar/sonar do AXIOMIX.

```css
/* ScanLoader — identidade radar */
.scan-loader {
  position: relative;
  overflow: hidden;
  background-color: var(--color-surface-2);
  border-radius: 8px;
}

.scan-loader::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(var(--color-primary-rgb) / 0.06) 50%,
    transparent 100%
  );
  animation: ax-scan 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
```

Usar `<ScanLoader />` em vez de `skeleton-shimmer` em todos os estados de loading.

---

### Sidebar

A sidebar **permanece escura em ambos os modos** (light e dark). Isso e intencional — cria a sensacao de painel de controle lateral, independente do tema do conteudo principal.

#### Estrutura

```
┌──────────────────────────────────────────┐
│  Logo AXIOMIX          [collapse] [sun/moon] │ <- h-16 px-4 border-b
├──────────────────────────────────────────┤
│  . Dashboard                              │
│  * WhatsApp Intelligence  <- teal accent  │
│  . Intelligence           <- gold accent  │
│  . Social Publisher       <- violet accent│
│  . Campanhas              <- green accent │
│  . Base Conhecimento      <- purple accent│
│  . Settings                              │
├──────────────────────────────────────────┤
│  [Avatar] Nome / Empresa        mt-auto  │
└──────────────────────────────────────────┘
```

#### Classes Base

```css
/* Sidebar — sempre escura */
background-color: var(--color-sidebar-nav); /* #0D1117 */
color: var(--color-text); /* adaptado para sidebar */
```

#### Classes dos Nav Items

```css
/* Item inativo */
flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
text-[--color-text-secondary] hover:text-[--color-text] hover:bg-[--color-surface-2]
transition-colors duration-150

/* Item ativo — cor do modulo */
text-[var(--module-color)] bg-[var(--module-color)]/10
/* Barra esquerda de 3px */
relative before:absolute before:left-0 before:inset-y-1.5
before:w-[3px] before:rounded-r before:bg-[var(--module-color)]
```

#### Comportamento Responsivo

```
< lg  -> drawer sobreposto com overlay (z-40)
lg    -> sidebar fixa 64px (icones apenas)
xl+   -> sidebar fixa 240px (icone + label)
```

---

### Badge

#### Variantes

| Variante | Uso |
|----------|-----|
| `default` | Estado neutro |
| `primary` | Destaque de marca (laranja) |
| `success` | Publicado, positivo |
| `warning` | Parcial, neutro |
| `danger` | Falhou, negativo |
| `teal` | WhatsApp Intelligence |
| `gold` | Agendado, Radar |
| `violet` | Social Publisher |

#### Tamanhos

```
sm: text-xs px-2 py-0.5 rounded-sm     -> labels de tabela
md: text-xs px-2.5 py-1 rounded-full   -> badges de status (pill)
```

Prefixar badges de status com ponto colorido na mesma cor do texto da variante.

---

### Input & Form

#### Input de Texto

```css
/* Base */
h-10 w-full rounded-md border border-[--color-border]
bg-[--color-surface] px-3 py-2
font-[Instrument_Sans] text-sm text-[--color-text]
placeholder:text-[--color-text-tertiary]
focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent
disabled:opacity-40 disabled:cursor-not-allowed
transition-colors
```

#### Estados

```
Default  -> border: --color-border
Focus    -> ring-2 ring-primary, border transparent
Error    -> border-danger ring-2 ring-danger/20
Disabled -> opacity-40, cursor-not-allowed
```

---

### Toggle (Dark/Light Mode)

Componente persistente no Topbar (desktop) e na aba Aparencia das Settings.

#### Aparencia

```
Light mode ativo:
  [ sun ----knob]   track: --color-surface-2, knob: branco com Sun ambar

Dark mode ativo:
  [knob---- moon]   track: --color-primary, knob: branco com Moon laranja
```

#### Configuracao do next-themes

```tsx
// src/lib/theme-provider.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}
```

**Tema padrao:** `dark`. Preferencia do usuario persistida em `localStorage`. `enableSystem: false` para evitar que o tema do SO sobrescreva a escolha do usuario.

---

### Modal / Dialog

#### Tamanhos

| Tamanho | Largura | Uso |
|---------|---------|-----|
| `sm` | `max-w-sm` (384px) | Confirmacoes, alertas simples |
| `md` | `max-w-md` (448px) | Formularios curtos |
| `lg` | `max-w-lg` (512px) | Formularios completos |
| `xl` | `max-w-2xl` (672px) | Formularios multi-campo, previews |
| `full` | `max-w-4xl` (896px) | Editores, visualizacoes completas |

#### Classes

```css
/* Overlay */
fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50

/* Container */
bg-[--color-surface] border border-[--color-border]
rounded-2xl shadow-modal p-6
```

---

### Topbar

```
┌──────────────────────────────────────────────────────────────┐
│ [hamburger mobile]  Titulo da Pagina       [ThemeToggle] [bell] [Avatar]│
│             Subtitulo/breadcrumb                              │
└──────────────────────────────────────────────────────────────┘
```

```css
h-16 sticky top-0 z-30
bg-[--color-surface] border-b border-[--color-border]
```

**Ordem dos elementos a direita:** `ThemeToggle` -> `Bell` -> Avatar

---

### Progress Bar

#### Barra Linear

```css
/* Track */
h-2 w-full rounded-full bg-[--color-surface-2] overflow-hidden

/* Fill */
h-full bg-[--color-primary] rounded-full transition-all duration-500
```

#### Progress Steps

| Status | Icone | Cor |
|--------|-------|-----|
| `done` | `CheckCircle2` | `--color-success` |
| `processing` | `Loader2` animado | `--color-primary` |
| `pending` | `Circle` | `--color-text-tertiary` |
| `error` | `XCircle` | `--color-danger` |

---

### Empty State

```
┌──────────────────────────────────────────┐
│                                          │
│    [icone 48px, --color-text-tertiary]   │
│                                          │
│    Titulo acionavel                      │  <- ax-t2 Bricolage
│    Descricao do que fazer a seguir       │  <- ax-body Instrument
│                                          │
│         [CTA principal]                  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. Padroes de Layout

### PageContainer

```css
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8
```

#### Header de Pagina

```
H1: Titulo acionavel                [CTA primario]
Subtitulo com contexto util
─────────────────────────────── mb-8
```

---

### Grid de Metricas

```css
grid grid-cols-2 md:grid-cols-4 gap-4 mb-8
```

Cada celula usa o **Card de Metrica** com animacao `ax-cascade` (stagger de 150ms entre cards).

---

### Tabela Paginada

```
┌──────────────────────────────────────────────────────────────┐
│  Titulo + filtros + busca                                     │
├──────────────────────────────────────────────────────────────┤
│  COL A       │ COL B        │ COL C       │ ACOES            │
├──────────────────────────────────────────────────────────────┤
│  Linha 1     │ ...          │ ...         │ [Ver] [Editar]   │
│  Linha 2     │ ...          │ ...         │ [Ver] [Editar]   │
├──────────────────────────────────────────────────────────────┤
│  Exibindo 1-20 de 347              [< Anterior] [Proximo >]  │
└──────────────────────────────────────────────────────────────┘
```

#### Regras

- **Paginacao padrao:** 20 itens por pagina
- **Cabecalho:** `ax-kpi-label uppercase tracking-wide --color-text-secondary`
- **Linha:** `border-b border-[--color-border] hover:bg-[--color-surface-2] transition-colors`
- **Celula:** `px-4 py-3 ax-body`
- **Coluna de acoes:** Sempre a direita
- Texto longo: truncar em 80 chars com `title` attribute

---

## 6. Icones

**Biblioteca:** `lucide-react` (obrigatoria, sem excecoes)

### Icones por Modulo

| Modulo / Elemento | Icone Lucide | Tamanho |
|-------------------|-------------|---------|
| Dashboard | `LayoutDashboard` | 18px |
| WhatsApp Intelligence | `MessageSquare` | 18px |
| Intelligence | `TrendingUp` | 18px |
| Social Publisher | `Share2` | 18px |
| Campanhas | `Megaphone` | 18px |
| Base Conhecimento | `BookOpen` | 18px |
| Settings | `Settings` | 18px |
| Tema: Light | `Sun` | 14px |
| Tema: Dark | `Moon` | 14px |
| Adicionar / Novo | `Plus` | 16px |
| Editar | `Pencil` | 14px |
| Excluir | `Trash2` | 14px |
| Fechar / Cancelar | `X` | 16px |
| Atualizar / Sync | `RefreshCw` | 16px |
| Download | `Download` | 16px |
| Upload | `Upload` | 16px |
| Copiar | `Copy` | 14px |
| Abrir externo | `ExternalLink` | 14px |
| Filtro | `Filter` | 16px |
| Busca | `Search` | 16px |
| Calendario | `Calendar` | 16px |
| Notificacao | `Bell` | 18px |
| Usuario / Avatar | `User` | 18px |
| Empresa | `Building2` | 16px |
| Integracao / Conexao | `Plug` | 16px |
| IA / Analise | `Sparkles` | 16px |
| Foto | `Image` | 16px |
| Video | `Video` | 16px |
| Carrossel | `GalleryHorizontal` | 16px |
| Instagram | `Instagram` | 16px |
| LinkedIn | `Linkedin` | 16px |
| Sentimento Positivo | `SmilePlus` | 16px |
| Sentimento Negativo | `Frown` | 16px |
| Intencao de Compra | `ShoppingCart` | 14px |
| Alerta / Atencao | `AlertTriangle` | 14px |
| Sucesso / Check | `CheckCircle2` | 16px |
| Erro | `XCircle` | 16px |
| Viral / Trending | `Flame` | 14px |

### Regras de Icone

```
Correto:
- Tamanhos permitidos: 14px, 16px, 18px, 20px, 24px
- Cor padrao: currentColor (herda do texto pai)
- Icone + label: gap-2 entre ambos
- Icone solo: aria-label no elemento pai

Incorreto:
- Nao usar outras bibliotecas (heroicons, feather, etc.)
- Nao usar emojis como icones funcionais
- Nao alterar stroke-width dos icones
```

---

## 7. Feedback & Estado

### Loading States

| Cenario | Padrao |
|---------|--------|
| Carregando lista / tabela | `<ScanLoader />` (linhas) |
| Carregando card individual | `<ScanLoader />` (forma do card) |
| Acao de botao em progresso | `Loader2` animado + texto "Salvando..." |
| Carregando pagina inteira | `<ScanLoader />` do layout completo |
| Sincronizacao em background | Badge "Sincronizando..." no topbar |
| Dados atualizando | `ax-value-pulse` no valor que mudou |

---

### Toast / Notificacoes

Usar `shadcn/ui` Toast.

| Tipo | Borda | Icone | Duracao |
|------|-------|-------|---------|
| `success` | `border-l-4 border-success` | `CheckCircle2` | 4s |
| `error` | `border-l-4 border-danger` | `XCircle` | 6s + fechar manual |
| `warning` | `border-l-4 border-warning` | `AlertTriangle` | 5s |
| `info` | `border-l-4 border-info` | `Info` | 4s |

```css
/* Toast base */
bg-[--color-surface] border border-[--color-border] shadow-dropdown
```

**Posicao:** `bottom-right`. **Maximo simultaneo:** 3 toasts.

#### Mensagens Padronizadas

```
Sucesso generico:  "Salvo com sucesso"
Erro de rede:      "Erro de conexao. Tente novamente."
Erro de validacao: "[Campo] e obrigatorio"
Sync concluida:    "X conversas sincronizadas"
Post agendado:     "Post agendado para DD/MM/YYYY as HH:MM"
Post cancelado:    "Agendamento cancelado"
Tema alterado:     (sem toast — a mudanca visual e feedback suficiente)
```

---

### Status Badges

#### Posts (Social Publisher)

| Status | Texto PT | Variante |
|--------|----------|---------|
| `scheduled` | Agendado | `gold` |
| `processing` | Publicando... | `warning` + spinner |
| `published` | Publicado | `success` |
| `partial` | Parcialmente publicado | `warning` |
| `failed` | Falhou | `danger` |
| `cancelled` | Cancelado | `default` |

#### Jobs Async

| Status | Texto PT | Variante |
|--------|----------|---------|
| `pending` | Aguardando | `default` |
| `running` | Processando | `warning` |
| `done` | Concluido | `success` |
| `failed` | Falhou | `danger` |

#### Sentimento de IA (WhatsApp Intelligence)

| Sentimento | Variante | Icone |
|-----------|---------|-------|
| Positivo | `success` | `SmilePlus` |
| Neutro | `warning` | `Meh` |
| Negativo | `danger` | `Frown` |

---

## 8. Regras do Laranja

O laranja e o recurso visual mais poderoso do AXIOMIX. Seu uso e rigorosamente controlado.

| Regra | Descricao |
|-------|-----------|
| **Laranja = acao necessaria** | Ponto final. Se e laranja, o usuario precisa decidir algo. |
| **Maximo 3 por tela** | No maximo 3 elementos laranja visiveis simultaneamente. |
| **Significado obrigatorio** | Se o laranja esta na tela, ele deve significar algo. |
| **Decoracao = zero** | Uso decorativo de laranja e proibido. Nem borders, nem fundos, nem icones. |
| **Teste dos 3 segundos** | Se o laranja comunica mais de 1 coisa em 3 segundos, esta inflacionado. |

### Checklist antes de usar laranja

```
[ ] Este elemento exige uma decisao do usuario?
[ ] Ha menos de 3 outros elementos laranja na tela?
[ ] Remover o laranja mudaria o significado da tela?
[ ] O usuario saberia o que fazer ao ver este laranja?
```

Se qualquer resposta for "nao", nao use laranja.

---

## 9. Filosofia de Copy

**Principio: "Instrui, nao descreve."**

Cada titulo, label e descricao deve responder a pergunta: "E dai? O que eu faco com isso?"

| Antes (descritivo) | Depois (instrutivo) |
|--------------------|---------------------|
| "Resumo de Conversas" | "12 conversas aguardando analise" |
| "Performance" | "Engajamento caiu 8% esta semana" |
| "Concorrentes" | "2 concorrentes postaram mais que voce" |
| "Relatorios" | "Relatorio da semana 12 pronto para revisao" |
| "Base de Conhecimento" | "47 documentos indexados, 3 desatualizados" |
| "Configuracoes" | "1 integracao precisa de atencao" |

### Regras de copy

- Titulos de pagina: sempre com numero ou acao
- Subtitulos: contexto temporal ("esta semana", "ultimas 24h")
- Empty states: instruem o proximo passo, nunca dizem apenas "nada aqui"
- Tooltips: maximo 1 frase, acao direta
- Erros: dizem o que aconteceu E o que fazer

---

## 10. Acessibilidade

### Requisitos Minimos

| Requisito | Implementacao |
|-----------|--------------|
| Contraste | Minimo 4.5:1 para texto normal, 3:1 para texto grande — verificado em **ambos** os temas |
| Focus visible | `focus-visible:ring-2 focus-visible:ring-primary ring-offset-2 ring-offset-background` |
| Labels | Todo `<input>` com `<label>` ou `aria-label` |
| Icones funcionais | `aria-label` no elemento pai |
| Loading | `aria-busy="true"` durante carregamento |
| Erros de form | `aria-invalid` + `aria-describedby` |
| Modais | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` |
| Teclado | Tab order logico, ESC fecha modais/dropdowns |
| Toggle de tema | `aria-label` dinamico: "Ativar modo claro" / "Ativar modo escuro" |
| Reducao de movimento | `prefers-reduced-motion` respeitado em TODAS as animacoes |

### Contraste Verificado (WCAG AA)

| Par | Ratio | Contexto | Status |
|-----|-------|----------|--------|
| Branco sobre `#E8600F` (botao primary) | 3.44:1 | Texto bold/grande | AA-Large PASS |
| `#0D1117` sobre `#FFFFFF` | 17.4:1 | Texto light mode | AAA |
| `#F0F4FA` sobre `#080B10` | 18.1:1 | Texto dark mode | AAA |
| `#5A6472` sobre `#FFFFFF` | 5.7:1 | Texto secundario light | AA |
| `#8892A4` sobre `#080B10` | 6.3:1 | Texto secundario dark | AA |
| `#0D9488` sobre `#080B10` | 5.2:1 | Teal sobre dark | AA |
| `#D97706` sobre `#080B10` | 6.8:1 | Gold sobre dark | AA |

> Nota: `#E8600F` nao passa AA para texto pequeno (< 18px regular / < 14px bold). Nunca usar como cor de texto em `ax-body` ou menor sem `font-semibold`. O uso primario do laranja e em botoes (texto branco bold) e no Eixo de Decisao (linha decorativa, nao texto).

---

## 11. Arquitetura de Arquivos

O design system e distribuido nos seguintes arquivos-chave:

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/module-colors.ts` | Fonte unica de verdade para cores de modulo |
| `src/lib/module-theme.tsx` | Deriva CSS vars (backgrounds, borders, text) a partir de module-colors |
| `src/lib/theme-provider.tsx` | Toggle light/dark, persistencia de preferencia |
| `src/app/globals.css` | Todos os tokens CSS, animacoes, e classes utilitarias |
| `tailwind.config.ts` | Consome module-colors para gerar utilitarios Tailwind |

**Regra:** Se uma cor de modulo precisa mudar, mude APENAS em `module-colors.ts`. Tudo mais e derivado.

---

## 12. Configuracao do Projeto

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'
import { MODULE_COLORS } from './src/lib/module-colors'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8600F',
          hover:   'var(--color-primary-hover)',
          muted:   '#CC5500',
          dim:     'var(--color-primary-dim)',
        },
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
        },
        tx: {
          DEFAULT:   'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          tertiary:  'var(--color-text-tertiary)',
        },
        success: { DEFAULT: '#22C55E' },
        warning: { DEFAULT: '#F59E0B' },
        danger:  { DEFAULT: '#EF4444' },
        info:    { DEFAULT: '#3B82F6' },
        // Cores de modulo derivadas de module-colors.ts
        ...Object.fromEntries(
          Object.entries(MODULE_COLORS).map(([key, color]) => [
            `module-${key}`, color
          ])
        ),
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        sans:    ['Instrument Sans', 'sans-serif'],
        mono:    ['Geist Mono', 'monospace'],
      },
      boxShadow: {
        card:     '0 1px 3px rgb(var(--color-primary-rgb) / 0.04), 0 1px 2px rgb(var(--color-primary-rgb) / 0.03)',
        dropdown: '0 4px 16px rgb(var(--color-primary-rgb) / 0.08)',
        modal:    '0 20px 60px rgb(var(--color-primary-rgb) / 0.12)',
        primary:  '0 4px 14px rgb(var(--color-primary-rgb) / 0.25)',
        'btn-glow':     '0 0 20px rgb(var(--color-primary-rgb) / 0.3)',
        'decision-glow': '0 0 12px rgb(var(--color-primary-rgb) / 0.4)',
      },
      borderRadius: {
        sm:    '4px',
        md:    '6px',
        lg:    '8px',
        xl:    '12px',
        '2xl': '16px',
      },
      animation: {
        'ax-emerge':      'ax-emerge 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'ax-breathe':     'ax-breathe 2.4s ease-in-out infinite',
        'ax-scan':        'ax-scan 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        'ax-value-pulse': 'ax-value-pulse 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'ax-decision':    'ax-decision 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'ax-module-shift': 'ax-emerge 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
    },
  },
  plugins: [],
}

export default config
```

---

### `globals.css` (tokens e animacoes)

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=Geist+Mono:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {

  /* -- Light Mode: "Sala de Briefing" -------------------- */
  :root {
    --color-primary:        #E8600F;
    --color-primary-hover:  #FF6B1A;
    --color-primary-muted:  #CC5500;
    --color-primary-dim:    #FFF4EE;
    --color-primary-rgb:    232 96 15;

    --color-background:     #F7F8FA;
    --color-surface:        #FFFFFF;
    --color-surface-2:      #ECEEF2;
    --color-surface-3:      #E4E7EC;
    --color-border:         #D8DCE3;
    --color-border-strong:  #C0C6D0;

    --color-text:           #0D1117;
    --color-text-secondary: #5A6472;
    --color-text-tertiary:  #657080;

    --color-sidebar-nav:    #0D1117;
  }

  /* -- Dark Mode: "Precision Dark / Deep Night" ---------- */
  .dark {
    --color-primary-hover:  #FF7D3A;
    --color-primary-dim:    #1C1008;

    --color-background:     #080B10;
    --color-surface:        #0D1117;
    --color-surface-2:      #161B22;
    --color-surface-3:      #1C2230;
    --color-border:         #1E2530;
    --color-border-strong:  #2D3648;

    --color-text:           #F0F4FA;
    --color-text-secondary: #8892A4;
    --color-text-tertiary:  #737F8F;
  }

  * { border-color: var(--color-border); }

  body {
    background-color: var(--color-background);
    color: var(--color-text);
    font-family: 'Instrument Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 { font-family: 'Bricolage Grotesque', sans-serif; }

  code, pre, .font-mono { font-family: 'Geist Mono', monospace; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--color-border-strong);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--color-text-tertiary); }

  .tabular-nums { font-variant-numeric: tabular-nums; }
}

/* -- Animacoes ------------------------------------------- */

@keyframes ax-emerge {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes ax-breathe {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}

@keyframes ax-scan {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes ax-value-pulse {
  0%   { background-color: rgb(var(--color-primary-rgb) / 0.2); }
  100% { background-color: transparent; }
}

@keyframes ax-decision {
  from {
    opacity: 0;
    height: 0;
    box-shadow: 0 0 0 rgb(var(--color-primary-rgb) / 0);
  }
  to {
    opacity: 1;
    height: 100%;
    box-shadow: 0 0 12px rgb(var(--color-primary-rgb) / 0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@layer components {

  /* ScanLoader — substitui skeleton-shimmer */
  .scan-loader {
    position: relative;
    overflow: hidden;
    background-color: var(--color-surface-2);
    border-radius: 8px;
  }
  .scan-loader::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgb(var(--color-primary-rgb) / 0.06) 50%,
      transparent 100%
    );
    animation: ax-scan 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  /* Decision Axis — eixo de decisao */
  .decision-axis {
    position: relative;
    padding-left: 16px;
  }
  .decision-axis::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: var(--color-primary);
    border-radius: 1px;
    box-shadow: 0 0 12px rgb(var(--color-primary-rgb) / 0.4);
    animation: ax-decision 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  /* Barra de acento de modulo (topo do card) */
  .module-accent {
    position: relative;
  }
  .module-accent::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 3px;
    border-radius: 12px 12px 0 0;
    background-color: var(--module-color, var(--color-primary));
  }

  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
```

---

### Dependencias

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "next-themes": "^0.3",
    "lucide-react": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-toast": "latest",
    "tailwindcss": "^3.4",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}
```

```tsx
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

*AXIOMIX Design System v3.0 — "Orange Command"*
*Essencia: Inteligencia que gera acao*
*Tipografia: Bricolage Grotesque / Instrument Sans / Geist Mono*
*Ultima atualizacao: Abril 2026*
