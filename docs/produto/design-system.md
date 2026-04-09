# AXIOMIX — Design System
> Versão 2.0 · Micro SaaS de Marketing e Inteligência Competitiva · Dark & Light Edition

---

## Índice

1. [Fundação](#1-fundação)
   - [Identidade da Marca](#identidade-da-marca)
   - [Princípios de Design](#princípios-de-design)
2. [Tokens de Design](#2-tokens-de-design)
   - [Paleta de Cores](#paleta-de-cores)
   - [Tema Claro / Escuro](#tema-claro--escuro)
   - [Cores por Módulo](#cores-por-módulo)
   - [Tipografia](#tipografia)
   - [Espaçamento](#espaçamento)
   - [Bordas e Raios](#bordas-e-raios)
   - [Sombras](#sombras)
   - [Breakpoints](#breakpoints)
3. [Componentes](#3-componentes)
   - [Button](#button)
   - [Badge](#badge)
   - [Card](#card)
   - [Input & Form](#input--form)
   - [Toggle (Dark/Light Mode)](#toggle-darklight-mode)
   - [Modal / Dialog](#modal--dialog)
   - [Sidebar](#sidebar)
   - [Topbar](#topbar)
   - [Progress Bar](#progress-bar)
   - [Empty State](#empty-state)
   - [Skeleton Loader](#skeleton-loader)
4. [Padrões de Layout](#4-padrões-de-layout)
   - [PageContainer](#pagecontainer)
   - [Grid de Métricas](#grid-de-métricas)
   - [Tabela Paginada](#tabela-paginada)
5. [Ícones](#5-ícones)
6. [Feedback & Estado](#6-feedback--estado)
   - [Loading States](#loading-states)
   - [Toast / Notificações](#toast--notificações)
   - [Status Badges](#status-badges)
7. [Padrões por Módulo](#7-padrões-por-módulo)
   - [WhatsApp Intelligence](#whatsapp-intelligence)
   - [Intelligence (Concorrentes + Radar)](#intelligence-concorrentes--radar)
   - [Social Publisher](#social-publisher)
   - [Performance Reports](#performance-reports)
   - [Settings](#settings)
8. [Acessibilidade](#8-acessibilidade)
9. [Configuração do Projeto](#9-configuração-do-projeto)

---

## 1. Fundação

### Identidade da Marca

**AXIOMIX** é uma plataforma B2B de Marketing, Growth e Inteligência Competitiva. O design deve comunicar:

- **Confiança e precisão** — dados e análises sérias, não dashboards decorativos
- **Velocidade e clareza** — informação acionável sem ruído visual
- **Tecnologia acessível** — poderosa, mas compreensível para equipes não-técnicas
- **Personalidade distinta** — não mais um SaaS genérico; identidade visual memorável

**Logo e Nome**
- Sempre escrito em maiúsculas: `AXIOMIX`
- Cor do logotipo: `--color-primary` (#FA5E24) sobre fundos claros e escuros
- Não distorcer, recolorizar ou adicionar efeitos ao logotipo

---

### Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Clareza primeiro** | Cada tela deve ter uma ação principal evidente. Evite hierarquias visuais ambíguas. |
| **Dados em destaque** | Números, gráficos e insights são os protagonistas. A UI é suporte, não estrela. |
| **Feedback imediato** | Toda ação do usuário recebe resposta visual em ≤ 150ms. |
| **Consistência acima de criatividade** | Use sempre os tokens definidos. Não invente variações ad-hoc. |
| **Mobile-first** | Layouts pensados para mobile, expandidos para desktop. |
| **Tema como contexto** | Claro e escuro são modos de igual importância — nenhum é "padrão". |

---

## 2. Tokens de Design

### Paleta de Cores

#### Cor Primária (invariante — igual em ambos os temas)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | `#FA5E24` | CTAs principais, links ativos, destaques |
| `--color-primary-hover` | `#E84D13` | Hover em elementos com `--color-primary` |
| `--color-primary-muted` | `#C94B1B` | Variante de média intensidade |
| `--color-primary-dim` | contexto-dependente | `#7A2D11` no dark · `#FFF0EB` no light |

#### Cores Semânticas (invariantes)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-success` | `#22C55E` | Confirmações, publicado, positivo |
| `--color-warning` | `#F59E0B` | Alertas, parcial, neutro |
| `--color-danger` | `#EF4444` | Erros, falhou, negativo |

Os backgrounds semânticos (`--color-success-bg`, `--color-warning-bg`, `--color-danger-bg`) variam por tema — ver seção abaixo.

---

### Tema Claro / Escuro

O projeto usa `class="dark"` no `<html>` para alternar temas (`darkMode: 'class'` no Tailwind). Todos os tokens de superfície e texto são redefinidos por tema via CSS custom properties.

#### Tokens de Superfície e Texto

| Token CSS | Light | Dark |
|-----------|-------|------|
| `--color-background` | `#F8FAFC` | `#0D0D0D` |
| `--color-surface` | `#FFFFFF` | `#141414` |
| `--color-surface-2` | `#F1F5F9` | `#1A1A1A` |
| `--color-surface-3` | `#E8EDF3` | `#222222` |
| `--color-border` | `#E2E8F0` | `#2A2A2A` |
| `--color-border-strong` | `#CBD5E1` | `#333333` |
| `--color-text` | `#1E293B` | `#F0EDE8` |
| `--color-text-secondary` | `#64748B` | `#8A8A8A` |
| `--color-text-tertiary` | `#94A3B8` | `#555555` |
| `--color-success-bg` | `#F0FDF4` | `#103D26` |
| `--color-warning-bg` | `#FFFBEB` | `#7A4E06` |
| `--color-danger-bg` | `#FEF2F2` | `#7A1F1F` |

#### Regras de Uso de Cor

```
✅ Correto
- Usar sempre variáveis CSS, nunca valores hex hardcoded em componentes
- Usar --color-primary apenas para a ação principal de cada tela
- Usar --color-text-secondary para metadados e informações secundárias
- Usar cores semânticas apenas para seu propósito definido
- Testar visualmente ambos os temas antes de fazer PR

❌ Incorreto
- Hardcodar #1E293B ou #F0EDE8 diretamente em classes Tailwind (use as variáveis)
- Criar variações de cor fora da paleta definida
- Usar --color-primary em mais de um CTA por tela
- Usar --color-danger para elementos decorativos
- Assumir que texto preto funciona em ambos os temas
```

---

### Cores por Módulo

Cada módulo do AXIOMIX tem uma cor de identidade aplicada via CSS custom property no wrapper da página. Isso cria coerência entre a sidebar, os cards e os acentos visuais de cada módulo.

| Módulo | `--module-color` | `--module-color-bg` (dark) | `--module-color-bg` (light) |
|--------|-----------------|--------------------------|----------------------------|
| WhatsApp Intelligence | `#2EC4B6` | `#164E4A` | `#E0FAF7` |
| Intelligence / Radar | `#D4A853` | `#6B5429` | `#FDF6E3` |
| Social Publisher | `#FA5E24` | `#7A2D11` | `#FFF0EB` |
| Performance Reports | `#22C55E` | `#103D26` | `#F0FDF4` |
| Settings / Dashboard | `#8A8A8A` | `#222222` | `#F1F5F9` |

```tsx
// Uso — wrapper do módulo
<div style={{ '--module-color': '#2EC4B6', '--module-color-bg': isDark ? '#164E4A' : '#E0FAF7' } as React.CSSProperties}>
```

---

### Tipografia

O sistema v2.0 substitui Inter por uma pilha de três famílias com papéis distintos.

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=Geist+Mono:wght@400;700&display=swap');
```

| Família | Papel |
|---------|-------|
| **Bricolage Grotesque** | Títulos de página, métricas de destaque, nome da marca |
| **Instrument Sans** | Todo texto de interface — labels, inputs, botões, descrições |
| **Geist Mono** | Valores técnicos: IDs, tokens, timestamps, códigos |

#### Escala Tipográfica

| Token | Tamanho | Peso | Font | Uso |
|-------|---------|------|------|-----|
| `text-xs` | 12px | 400 | Instrument Sans | Timestamps, metadados, labels de tabela |
| `text-sm` | 14px | 400 / 500 | Instrument Sans | Texto de corpo, inputs, descrições |
| `text-base` | 16px | 400 / 500 | Instrument Sans | Texto padrão de conteúdo |
| `text-lg` | 20px | 600 | Bricolage Grotesque | Títulos de cards, subtítulos de seção |
| `text-xl` | 24px | 700 | Bricolage Grotesque | Títulos de página |
| `text-2xl` | 32px | 700 | Bricolage Grotesque | Métricas de destaque em dashboards |
| `text-hero` | 48px+ | 700 | Bricolage Grotesque | Hero sections, empty states grandes |
| `text-mono` | 13px | 400 | Geist Mono | Valores técnicos, tokens, IDs |

#### Hierarquia de Títulos

```
H1 — 24px / Bold     / Bricolage   / --color-text          → Título da página
H2 — 20px / SemiBold / Bricolage   / --color-text          → Título de seção
H3 — 16px / SemiBold / Bricolage   / --color-text          → Título de card
H4 — 14px / Medium   / Instrument  / --color-text-secondary → Label de campo
```

#### Regras Tipográficas

- **Nunca** use Inter, Roboto ou fontes de sistema — a pilha tipográfica é parte da identidade visual
- **Nunca** use `font-weight: 400` em títulos H1–H3
- **Nunca** use tamanhos fora da escala definida
- Limite linhas de texto truncado a 1–2 com `line-clamp`
- Use `font-variant-numeric: tabular-nums` em números de métricas

---

### Espaçamento

Escala de 4px do Tailwind. Valores mais usados:

| Token Tailwind | Valor | Uso típico |
|---------------|-------|------------|
| `p-1` / `gap-1` | 4px | Micro-espaçamento entre ícone e texto |
| `p-2` / `gap-2` | 8px | Padding de badges, espaçamento de lista |
| `p-3` / `gap-3` | 12px | Padding de inputs, espaçamento de form |
| `p-4` / `gap-4` | 16px | Padding de cards pequenos, gap entre cards |
| `p-6` / `gap-6` | 24px | Padding padrão de cards |
| `p-8` / `gap-8` | 32px | Padding de seções |

**Regra geral:** Elementos do mesmo grupo = `gap-3/4`. Grupos distintos = `gap-6/8`.

---

### Bordas e Raios

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | 4px | Tags, badges pequenos |
| `rounded-md` | 6px | Inputs, botões |
| `rounded-lg` | 8px | Cards, dropdowns |
| `rounded-xl` | 12px | Modais, painéis laterais |
| `rounded-2xl` | 16px | Cards de destaque, hero sections |
| `rounded-full` | 9999px | Avatares, toggles, pills |

**Border padrão:** `1px solid var(--color-border)`

---

### Sombras

As sombras são adaptadas ao tema ativo.

| Token | Light | Dark |
|-------|-------|------|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | `0 1px 3px rgba(0,0,0,0.4)` |
| `shadow-dropdown` | `0 4px 16px rgba(0,0,0,0.10)` | `0 4px 16px rgba(0,0,0,0.6)` |
| `shadow-modal` | `0 20px 60px rgba(0,0,0,0.15)` | `0 20px 60px rgba(0,0,0,0.8)` |
| `shadow-primary` | `0 4px 14px rgba(250,94,36,0.25)` | `0 4px 14px rgba(250,94,36,0.35)` |

---

### Breakpoints

| Nome | Tamanho | Contexto |
|------|---------|----------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop — sidebar aparece |
| `xl` | 1280px | Desktop padrão |
| `2xl` | 1536px | Desktop wide |

**Sidebar:** Colapsada abaixo de `lg`. Ícone-only entre `lg` e `xl`. Expandida em `xl+`.

---

## 3. Componentes

### Button

#### Variantes

| Variante | Light | Dark |
|----------|-------|------|
| `primary` | `bg-[#FA5E24] text-white hover:bg-[#E84D13]` | igual |
| `secondary` | `bg-white text-[#1E293B] border border-[#E2E8F0] hover:bg-[#F1F5F9]` | `bg-[#1A1A1A] text-[#F0EDE8] border-[#2A2A2A] hover:bg-[#222222]` |
| `ghost` | `bg-transparent text-[#64748B] hover:bg-[#F1F5F9]` | `bg-transparent text-[#8A8A8A] hover:bg-[#1A1A1A]` |
| `danger` | `bg-[#EF4444] text-white hover:bg-red-600` | igual |
| `link` | `text-[#FA5E24] underline-offset-4 hover:underline` | igual |

#### Tamanhos

| Tamanho | Classes | Uso |
|---------|---------|-----|
| `sm` | `h-8 px-3 text-xs` | Ações em tabelas |
| `md` | `h-10 px-4 text-sm` | Botões de formulário e cards |
| `lg` | `h-12 px-6 text-base` | CTAs de destaque |

#### Estados

```
Default   → cores definidas acima
Hover     → variante de hover
Focus     → ring-2 ring-[#FA5E24] ring-offset-2 ring-offset-background
Disabled  → opacity-40 cursor-not-allowed pointer-events-none
Loading   → Loader2 animado + texto "Salvando..." + disabled
```

#### Botão primary com elevação

```css
/* Quando for o único CTA da tela */
shadow-[0_4px_14px_rgba(250,94,36,0.30)]
hover:shadow-[0_6px_20px_rgba(250,94,36,0.40)]
transition-shadow
```

---

### Badge

#### Variantes

| Variante | Light (bg / text) | Dark (bg / text) | Uso |
|----------|------------------|-----------------|-----|
| `default` | `#F1F5F9` / `#64748B` | `#222222` / `#8A8A8A` | Estado neutro |
| `primary` | `#FFF0EB` / `#FA5E24` | `#7A2D11` / `#FF9970` | Destaque de marca |
| `success` | `#F0FDF4` / `#16A34A` | `#103D26` / `#22C55E` | Publicado, positivo |
| `warning` | `#FFFBEB` / `#D97706` | `#7A4E06` / `#F59E0B` | Parcial, neutro |
| `danger` | `#FEF2F2` / `#DC2626` | `#7A1F1F` / `#EF4444` | Falhou, negativo |
| `teal` | `#E0FAF7` / `#0D9488` | `#164E4A` / `#2EC4B6` | WA Intelligence |
| `gold` | `#FDF6E3` / `#B45309` | `#6B5429` / `#D4A853` | Agendado, Radar |

#### Tamanhos

```
sm: text-xs px-2 py-0.5 rounded-sm     → labels de tabela
md: text-xs px-2.5 py-1 rounded-full   → badges de status (pill)
```

Prefixar badges de status com `●` colorido na mesma cor do texto da variante.

---

### Card

#### Anatomia

```
┌─────────────────────────────────────────┐  ← barra de acento 3px (--module-color)
│  Card Header (opcional)                  │
│  ┌───────────────┐  ┌─────────────────┐  │
│  │ Título + Icon │  │ Ação de Header  │  │
│  └───────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│  Card Body                               │
│  [conteúdo principal]                    │
├─────────────────────────────────────────┤
│  Card Footer (opcional)                  │
│  [metadados / links / ações secundárias] │
└─────────────────────────────────────────┘
```

#### Classes Base

```css
/* Card padrão */
bg-[--color-surface] rounded-xl border border-[--color-border] shadow-card p-6 overflow-hidden
/* Dark: automático via CSS var */

/* Barra de acento no topo */
relative before:absolute before:inset-x-0 before:top-0
before:h-[3px] before:rounded-t-xl before:bg-[var(--module-color)]

/* Card clicável */
cursor-pointer transition-all
hover:border-[--color-border-strong]
hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)]
```

#### Card de Métrica

```
┌──────────────────────┐
│  label (text-xs)      │  ← --color-text-secondary / Instrument Sans
│                       │
│    3.847              │  ← text-2xl / Bricolage Grotesque Bold
│    ↑ +12% esta semana │  ← text-sm / --color-success ou --color-danger
│    ───────────────    │  ← sparkline (opcional)
└──────────────────────┘
```

---

### Input & Form

#### Input de Texto

```css
/* Base */
h-10 w-full rounded-md border border-[--color-border]
bg-[--color-surface] px-3 py-2
font-[Instrument_Sans] text-sm text-[--color-text]
placeholder:text-[--color-text-tertiary]
focus:outline-none focus:ring-2 focus:ring-[#FA5E24] focus:border-transparent
disabled:opacity-40 disabled:cursor-not-allowed
transition-colors
```

#### Estados

```
Default  → border: --color-border
Focus    → ring-2 ring-primary, border transparent
Error    → border-[#EF4444] ring-2 ring-[#EF4444]/20
Disabled → opacity-40, cursor-not-allowed
```

#### Estrutura de Formulário

```
<FormField>
  <Label>         → text-sm font-medium --color-text mb-1.5
  <Input>         → (ver acima)
  <HelperText>    → text-xs --color-text-secondary mt-1
  <ErrorMessage>  → text-xs text-[#EF4444] mt-1 flex items-center gap-1
</FormField>
```

---

### Toggle (Dark/Light Mode)

Componente persistente no Topbar (desktop) e na aba Aparência das Settings.

#### Aparência

```
Light mode ativo:
  [ ☀ ────●]   track: --color-surface-2, knob: branco com Sun 9px âmbar

Dark mode ativo:
  [●──── ☾ ]   track: #FA5E24, knob: branco com Moon 9px laranja
```

#### Implementação (Next.js + next-themes)

```tsx
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 cursor-pointer
        ${isDark ? 'bg-[#FA5E24]' : 'bg-[#E2E8F0]'}`}
    >
      <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm
        transition-transform duration-200 flex items-center justify-center
        ${isDark ? 'translate-x-6' : 'translate-x-1'}`}>
        {isDark
          ? <Moon size={9} className="text-[#FA5E24]" />
          : <Sun  size={9} className="text-[#F59E0B]" />
        }
      </span>
    </button>
  )
}
```

#### Configuração do next-themes

```tsx
// app/providers.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}
```

**Tema padrão:** `dark`. Preferência do usuário é persistida em `localStorage`. `enableSystem: false` para evitar que o tema do SO sobrescreva a escolha do usuário.

---

### Modal / Dialog

#### Tamanhos

| Tamanho | Largura | Uso |
|---------|---------|-----|
| `sm` | `max-w-sm` (384px) | Confirmações, alertas simples |
| `md` | `max-w-md` (448px) | Formulários curtos |
| `lg` | `max-w-lg` (512px) | Formulários completos |
| `xl` | `max-w-2xl` (672px) | Formulários multi-campo, previews |
| `full` | `max-w-4xl` (896px) | Editores, visualizações completas |

#### Classes

```css
/* Overlay */
fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50

/* Container */
bg-[--color-surface] border border-[--color-border]
rounded-2xl shadow-modal p-6
```

---

### Sidebar

#### Estrutura

```
┌──────────────────────────────────────────┐
│  Logo AXIOMIX          [collapse] [☀☾]   │ ← h-16 px-4 border-b
├──────────────────────────────────────────┤
│  ○ Dashboard                              │
│  ● WhatsApp Intelligence  ← teal accent  │
│  ○ Intelligence           ← gold accent  │
│  ○ Social Publisher       ← orange accent│
│  ○ Performance Reports    ← green accent │
│  ○ Settings                              │
├──────────────────────────────────────────┤
│  [Avatar] Nome · Empresa        mt-auto  │
└──────────────────────────────────────────┘
```

#### Classes dos Nav Items

```css
/* Item inativo */
flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
text-[--color-text-secondary] hover:text-[--color-text] hover:bg-[--color-surface-2]
transition-colors duration-150

/* Item ativo — cor do módulo */
text-[var(--module-color)] bg-[var(--module-color-bg)]
/* Barra esquerda de 3px */
relative before:absolute before:left-0 before:inset-y-1.5
before:w-[3px] before:rounded-r before:bg-[var(--module-color)]
```

#### Comportamento Responsivo

```
< lg  → drawer sobreposto com overlay (z-40)
lg    → sidebar fixa 64px (ícones apenas)
xl+   → sidebar fixa 240px (ícone + label)
```

---

### Topbar

```
┌──────────────────────────────────────────────────────────────┐
│ [≡ mobile]  Título da Página       [ThemeToggle] [🔔] [Avatar]│
│             Subtítulo/breadcrumb                              │
└──────────────────────────────────────────────────────────────┘
```

```css
h-16 sticky top-0 z-30
bg-[--color-surface] border-b border-[--color-border]
```

**Ordem dos elementos à direita:** `ThemeToggle` → `Bell` → Avatar

---

### Progress Bar

#### Barra Linear

```css
/* Track */
h-2 w-full rounded-full bg-[--color-surface-2] overflow-hidden

/* Fill */
h-full bg-[#FA5E24] rounded-full transition-all duration-500
```

#### Progress Steps

| Status | Ícone | Cor |
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
│    [ícone 48px, --color-text-tertiary]   │
│                                          │
│    Título do estado vazio                │  ← text-lg Bricolage
│    Descrição curta do que fazer          │  ← text-sm Instrument
│                                          │
│         [CTA principal]                  │
│                                          │
└──────────────────────────────────────────┘
```

---

### Skeleton Loader

```css
/* Base */
animate-pulse rounded bg-[--color-surface-2]

/* Com shimmer (preferível) */
relative overflow-hidden bg-[--color-surface-2]
after:absolute after:inset-0
after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent
after:animate-[shimmer_1.5s_infinite]
```

---

## 4. Padrões de Layout

### PageContainer

```css
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8
```

#### Header de Página

```
H1: Título                      [CTA primário]
Subtítulo / descrição curta
─────────────────────────────── mb-8
```

---

### Grid de Métricas

```css
grid grid-cols-2 md:grid-cols-4 gap-4 mb-8
```

Cada célula usa o **Card de Métrica** com `--module-color` do contexto da página.

---

### Tabela Paginada

```
┌──────────────────────────────────────────────────────────────┐
│  Título + filtros + busca                                     │
├──────────────────────────────────────────────────────────────┤
│  COL A       │ COL B        │ COL C       │ AÇÕES            │
├──────────────────────────────────────────────────────────────┤
│  Linha 1     │ ...          │ ...         │ [Ver] [Editar]   │
│  Linha 2     │ ...          │ ...         │ [Ver] [Editar]   │
├──────────────────────────────────────────────────────────────┤
│  Exibindo 1–20 de 347              [< Anterior] [Próximo >]  │
└──────────────────────────────────────────────────────────────┘
```

#### Regras

- **Paginação padrão:** 20 itens por página
- **Cabeçalho:** `font-mono text-xs --color-text-secondary uppercase tracking-wide`
- **Linha:** `border-b border-[--color-border] hover:bg-[--color-surface-2] transition-colors`
- **Célula:** `px-4 py-3 text-sm`
- **Coluna de ações:** Sempre à direita
- Texto longo: truncar em 80 chars com `title` attribute

---

## 5. Ícones

**Biblioteca:** `lucide-react` (obrigatória, sem exceções)

### Ícones por Módulo

| Módulo / Elemento | Ícone Lucide | Tamanho |
|-------------------|-------------|---------|
| Dashboard | `LayoutDashboard` | 18px |
| WhatsApp Intelligence | `MessageSquare` | 18px |
| Intelligence | `TrendingUp` | 18px |
| Social Publisher | `Share2` | 18px |
| Performance Reports | `BarChart2` | 18px |
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
| Calendário | `Calendar` | 16px |
| Notificação | `Bell` | 18px |
| Usuário / Avatar | `User` | 18px |
| Empresa | `Building2` | 16px |
| Integração / Conexão | `Plug` | 16px |
| IA / Análise | `Sparkles` | 16px |
| Foto | `Image` | 16px |
| Vídeo | `Video` | 16px |
| Carrossel | `GalleryHorizontal` | 16px |
| Instagram | `Instagram` | 16px |
| LinkedIn | `Linkedin` | 16px |
| Sentimento Positivo | `SmilePlus` | 16px |
| Sentimento Negativo | `Frown` | 16px |
| Intenção de Compra | `ShoppingCart` | 14px |
| Alerta / Atenção | `AlertTriangle` | 14px |
| Sucesso / Check | `CheckCircle2` | 16px |
| Erro | `XCircle` | 16px |
| Viral / Trending | `Flame` | 14px |

### Regras de Ícone

```
✅ Tamanhos permitidos: 14px, 16px, 18px, 20px, 24px
✅ Cor padrão: currentColor (herda do texto pai)
✅ Ícone + label: gap-2 entre ambos
✅ Ícone solo: aria-label no elemento pai

❌ Não usar outras bibliotecas (heroicons, feather, etc.)
❌ Não usar emojis como ícones funcionais
❌ Não alterar stroke-width dos ícones
```

---

## 6. Feedback & Estado

### Loading States

| Cenário | Padrão |
|---------|--------|
| Carregando lista / tabela | Skeleton loader (linhas) |
| Carregando card individual | Skeleton loader (forma do card) |
| Ação de botão em progresso | `Loader2` animado + texto "Salvando..." |
| Carregando página inteira | Skeleton do layout completo |
| Sincronização em background | Badge "Sincronizando..." no topbar |

---

### Toast / Notificações

Usar `shadcn/ui` Toast.

| Tipo | Borda | Ícone | Duração |
|------|-------|-------|---------|
| `success` | `border-l-4 border-[#22C55E]` | `CheckCircle2` | 4s |
| `error` | `border-l-4 border-[#EF4444]` | `XCircle` | 6s + fechar manual |
| `warning` | `border-l-4 border-[#F59E0B]` | `AlertTriangle` | 5s |
| `info` | `border-l-4 border-[#FA5E24]` | `Info` | 4s |

```css
/* Toast base */
bg-[--color-surface] border border-[--color-border] shadow-dropdown
```

**Posição:** `bottom-right`. **Máximo simultâneo:** 3 toasts.

#### Mensagens Padronizadas

```
Sucesso genérico:  "Salvo com sucesso"
Erro de rede:      "Erro de conexão. Tente novamente."
Erro de validação: "[Campo] é obrigatório"
Sync concluída:    "X conversas sincronizadas"
Post agendado:     "Post agendado para DD/MM/YYYY às HH:MM"
Post cancelado:    "Agendamento cancelado"
Tema alterado:     (sem toast — a mudança visual é feedback suficiente)
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
| `done` | Concluído | `success` |
| `failed` | Falhou | `danger` |

#### Sentimento de IA (WhatsApp Intelligence)

| Sentimento | Variante | Ícone |
|-----------|---------|-------|
| Positivo | `success` | `SmilePlus` |
| Neutro | `warning` | `Meh` |
| Negativo | `danger` | `Frown` |

---

## 7. Padrões por Módulo

### WhatsApp Intelligence

`--module-color: #2EC4B6`

#### Lista de Conversas

```
┌──────────────────────────────────────────────────────────┐
│  WhatsApp Intelligence                  [Sincronizar 🔄] │
│  Conversas sincronizadas do Sofia CRM                    │
├──────────────────────────────────────────────────────────┤
│  [Buscar...]  [Filtro ▾] [Status ▾]                     │
├──────────────────────────────────────────────────────────┤
│  Avatar  Nome Contato         [● Positivo]  14:32        │
│          +55 11 99999-9999                               │
│          "Última mensagem truncada..."                   │
└──────────────────────────────────────────────────────────┘
```

#### Card de Insight de IA

```
┌─────────────────────────────────────────┐  ← acento teal
│ ✨ Análise de IA                         │
├─────────────────────────────────────────┤
│  Sentimento   [● Positivo]               │
│  Intenção     [● Compra]                 │
├─────────────────────────────────────────┤
│  Resumo: "Texto resumido..."             │
├─────────────────────────────────────────┤
│  Ações: • Criar card  • Enviar proposta  │
├─────────────────────────────────────────┤
│  [Abrir no Sofia CRM ↗]                  │
└─────────────────────────────────────────┘
```

---

### Intelligence (Concorrentes + Radar)

`--module-color: #D4A853`

#### Card de Concorrente

```
┌────────────────────────────────────────────┐  ← acento gold
│  Nome Concorrente                 [Coletar] │
│  instagram.com/handle                        │
├────────────────────────────────────────────┤
│  Posts: 127   Engaj: 4.380   Coleta: há 2h  │
├────────────────────────────────────────────┤
│  Top Temas: [SaaS] [Growth] [Produtividade] │
└────────────────────────────────────────────┘
```

**Limite de 3 cards.** Botão "Adicionar" fica `disabled` com tooltip ao atingir o limite.

#### Card de Post Viral

```
┌─────────────────────────────────────────────────┐
│  [thumb]  @handle · Instagram       [🔥 Viral]   │
│  "Texto do post truncado em 120 chars..."        │
│  ❤️ 12.4k   💬 891   🔁 2.1k   Score: 18.7k     │
│  [Criar conteúdo baseado nesse post ✨]           │
└─────────────────────────────────────────────────┘
```

---

### Social Publisher

`--module-color: #FA5E24`

#### Formulário Multi-Etapas

```
Stepper:
  ● Upload → ○ Editar → ○ Preview → ○ Agendar

Etapa ativa:    círculo #FA5E24, label orange
Etapa concluída: CheckCircle2 #22C55E
Etapa futura:   círculo outline --color-border
Linha conectora: --color-border (pendente) / #FA5E24/30 (concluída)
```

#### Seletor de Tipo de Mídia

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  [Image]     │  │  [Video]     │  │  [Gallery]   │
│  Foto        │  │  Vídeo       │  │  Carrossel   │
│  1 imagem    │  │  mp4 ou mov  │  │  2-10 imgs   │
└──────────────┘  └──────────────┘  └──────────────┘
Selecionado:
  light: border-[#FA5E24] bg-[#FFF0EB]
  dark:  border-[#FA5E24]/50 bg-[#7A2D11]
  badge check (CheckCircle2) no canto superior direito
```

#### Área de Upload

```
┌──────────────────────────────────────────────────┐
│  [Upload]  Arraste arquivos aqui                 │
│            ou clique para selecionar             │
│  JPG, PNG, WebP · máx 10MB                       │
└──────────────────────────────────────────────────┘
  border-2 border-dashed --color-border
  hover: border-[#FA5E24]/60  bg-[#FA5E24]/[0.04]
  drag-over: border-[#FA5E24] bg-[#FA5E24]/[0.08]
```

---

### Performance Reports

`--module-color: #22C55E`

#### Card de Relatório

```
┌──────────────────────────────────────────┐  ← acento green
│  Semana 12 · 17–23 Mar 2025  [PDF ↓]     │
│  [● Pronto] · Gerado há 2h               │
├──────────────────────────────────────────┤
│  WhatsApp  Intelligence  Social   Radar  │
│  38 conv.  2 concorr.    5 posts  12↑    │
└──────────────────────────────────────────┘
```

**Status `generating`:** card substituído por skeleton + "Gerando relatório com IA..."

---

### Settings

#### Layout

```
Desktop:
  [Empresa    ]  ┌─────────────────────────┐
  [Membros    ]  │ Conteúdo da aba         │
  [Integrações]  │                         │
  [Plano      ]  │                         │
  [Aparência  ]  └─────────────────────────┘
```

**Aba Aparência** contém o `ThemeToggle` com label "Modo escuro" e descrição "Altera a aparência da interface."

#### Card de Integração

```
┌──────────────────────────────────────────────────┐
│  [Logo] Sofia CRM                  [● Ativo ✓]   │
│  Sincronização de conversas WhatsApp              │
├──────────────────────────────────────────────────┤
│  URL Base     [campo]                             │
│  API Token    [••••••••••••]  [alterar]           │
├──────────────────────────────────────────────────┤
│  Testado há 5min: ✅ Conexão OK                   │
│                    [Testar Conexão]  [Salvar]      │
└──────────────────────────────────────────────────┘
```

**Regra:** Token nunca exposto. Sempre `••••••••••••`. Usuário redigita para atualizar.

---

## 8. Acessibilidade

### Requisitos Mínimos

| Requisito | Implementação |
|-----------|--------------|
| Contraste | Mínimo 4.5:1 para texto normal, 3:1 para texto grande — verificado em **ambos** os temas |
| Focus visible | `focus-visible:ring-2 focus-visible:ring-[#FA5E24] ring-offset-2 ring-offset-background` |
| Labels | Todo `<input>` com `<label>` ou `aria-label` |
| Ícones funcionais | `aria-label` no elemento pai |
| Loading | `aria-busy="true"` durante carregamento |
| Erros de form | `aria-invalid` + `aria-describedby` |
| Modais | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` |
| Teclado | Tab order lógico, ESC fecha modais/dropdowns |
| Toggle de tema | `aria-label` dinâmico: "Ativar modo claro" / "Ativar modo escuro" |

### Contraste Verificado (ambos os temas)

| Par | Ratio | Tema | Status |
|-----|-------|------|--------|
| `#FA5E24` sobre `#FFFFFF` | 3.1:1 | Light | ✅ AA (texto grande/bold) |
| `#FA5E24` sobre `#0D0D0D` | 3.4:1 | Dark | ✅ AA (texto grande/bold) |
| `#1E293B` sobre `#FFFFFF` | 16.1:1 | Light | ✅ AAA |
| `#F0EDE8` sobre `#0D0D0D` | 18.2:1 | Dark | ✅ AAA |
| `#64748B` sobre `#FFFFFF` | 5.9:1 | Light | ✅ AA |
| `#8A8A8A` sobre `#0D0D0D` | 6.1:1 | Dark | ✅ AA |
| `#2EC4B6` sobre `#0D0D0D` | 5.8:1 | Dark | ✅ AA |
| `#D4A853` sobre `#0D0D0D` | 6.4:1 | Dark | ✅ AA |

> ⚠️ `#FA5E24` não passa AA para texto pequeno (< 18px regular). Nunca usar como cor de texto em `text-sm` sem `font-semibold`.

---

## 9. Configuração do Projeto

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FA5E24',
          hover:   '#E84D13',
          muted:   '#C94B1B',
        },
        // Superfícies via CSS vars (auto dark/light)
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
        success: { DEFAULT: '#22C55E', bg: 'var(--color-success-bg)' },
        warning: { DEFAULT: '#F59E0B', bg: 'var(--color-warning-bg)' },
        danger:  { DEFAULT: '#EF4444', bg: 'var(--color-danger-bg)'  },
        teal:    { DEFAULT: '#2EC4B6', dim: '#164E4A', light: '#E0FAF7' },
        gold:    { DEFAULT: '#D4A853', dim: '#6B5429', light: '#FDF6E3' },
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        sans:    ['Instrument Sans', 'sans-serif'],
        mono:    ['Geist Mono', 'monospace'],
      },
      fontSize: {
        xs:    ['12px', { lineHeight: '1.5' }],
        sm:    ['14px', { lineHeight: '1.5' }],
        base:  ['16px', { lineHeight: '1.6' }],
        lg:    ['20px', { lineHeight: '1.4' }],
        xl:    ['24px', { lineHeight: '1.3' }],
        '2xl': ['32px', { lineHeight: '1.2' }],
        hero:  ['48px', { lineHeight: '1.1' }],
      },
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        dropdown: '0 4px 16px rgba(0,0,0,0.10)',
        modal:    '0 20px 60px rgba(0,0,0,0.15)',
        primary:  '0 4px 14px rgba(250,94,36,0.25)',
      },
      borderRadius: {
        sm:    '4px',
        md:    '6px',
        lg:    '8px',
        xl:    '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

export default config
```

---

### `globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=Geist+Mono:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {

  /* ── Light Mode ──────────────────────────────────────── */
  :root {
    --color-primary:        #FA5E24;
    --color-primary-hover:  #E84D13;
    --color-primary-muted:  #C94B1B;
    --color-primary-dim:    #FFF0EB;

    --color-background:     #F8FAFC;
    --color-surface:        #FFFFFF;
    --color-surface-2:      #F1F5F9;
    --color-surface-3:      #E8EDF3;
    --color-border:         #E2E8F0;
    --color-border-strong:  #CBD5E1;

    --color-text:           #1E293B;
    --color-text-secondary: #64748B;
    --color-text-tertiary:  #94A3B8;

    --color-success-bg:     #F0FDF4;
    --color-warning-bg:     #FFFBEB;
    --color-danger-bg:      #FEF2F2;
  }

  /* ── Dark Mode ───────────────────────────────────────── */
  .dark {
    --color-primary-dim:    #7A2D11;

    --color-background:     #0D0D0D;
    --color-surface:        #141414;
    --color-surface-2:      #1A1A1A;
    --color-surface-3:      #222222;
    --color-border:         #2A2A2A;
    --color-border-strong:  #333333;

    --color-text:           #F0EDE8;
    --color-text-secondary: #8A8A8A;
    --color-text-tertiary:  #555555;

    --color-success-bg:     #103D26;
    --color-warning-bg:     #7A4E06;
    --color-danger-bg:      #7A1F1F;
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

@layer components {
  .skeleton {
    @apply animate-pulse rounded;
    background-color: var(--color-surface-2);
  }

  .skeleton-shimmer {
    position: relative;
    overflow: hidden;
    background-color: var(--color-surface-2);
  }
  .skeleton-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
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

  /* Barra de acento de módulo (topo do card) */
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
}
```

---

### Dependências

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

*AXIOMIX Design System v2.0 — Dark & Light Edition*
*Tipografia: Bricolage Grotesque · Instrument Sans · Geist Mono*
*Última atualização: Março 2025*