# 🚀 Como Testar as Melhorias do Intelligence

## Método Rápido (Recomendado)

### Passo 1: Atualizar a página principal

Abra o arquivo `src/app/(app)/intelligence/page.tsx` e faça a seguinte alteração:

```tsx
// Linha 10 - ANTES:
import { IntelligenceModule } from "@/components/intelligence/intelligence-module";

// Linha 10 - DEPOIS:
import { IntelligenceModuleEnhanced } from "@/components/intelligence/intelligence-module-enhanced";
```

```tsx
// Linha 141 - ANTES:
<IntelligenceModule

// Linha 141 - DEPOIS:
<IntelligenceModuleEnhanced
```

### Passo 2: Testar no navegador

1. Certifique-se que o servidor Next.js está rodando:
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

2. Acesse: `http://localhost:3000/intelligence`

3. Explore as novas features!

---

## ✨ Checklist de Features para Testar

### Aba Overview (Nova!)
- [ ] Visualizar 4 cards de métricas
- [ ] Ver card "Top Performer" (se houver concorrentes)
- [ ] Clicar em "Coletar Posts Virais"
- [ ] Clicar em "Analisar Concorrentes"
- [ ] Navegar para outras abas usando Ações Rápidas

### Aba Concorrentes
- [ ] Ver badge "Top" no concorrente com melhor performance
- [ ] Visualizar gradiente nas métricas principais
- [ ] Clicar nos links sociais (Instagram, LinkedIn, Website)
- [ ] Ver timestamp relativo ("há 2h" ao invés de data)
- [ ] Adicionar novo concorrente
- [ ] Coletar dados de um concorrente específico
- [ ] Remover concorrente

### Aba Content Radar
- [ ] Ver novo design dos cards de posts
- [ ] Usar barra de busca para filtrar posts
- [ ] Expandir/recolher filtros clicando em "Filtros"
- [ ] Filtrar por plataforma (Instagram, LinkedIn, TikTok, Todas)
- [ ] Ordenar por: Engajamento, Recentes, Viralidade
- [ ] Ver badge "Viral" em posts com alto engajamento
- [ ] Marcar post como favorito (estrela)
- [ ] Desmarcar post favorito
- [ ] Ver grid de métricas (4 colunas: Likes, Comentários, Shares, Score)
- [ ] Clicar em "Criar conteúdo"
- [ ] Abrir link do post original (ícone external)

### Modal de Criação de Conteúdo (Aprimorado!)
- [ ] Ver 4 templates disponíveis
- [ ] Trocar entre templates e ver prompt mudar
- [ ] Ver card com preview do post de referência
- [ ] Editar prompt manualmente
- [ ] Copiar prompt (ver feedback "Copiado!")
- [ ] Salvar prompt na biblioteca
- [ ] Fechar modal

### Aba Salvos (Nova!)
- [ ] Ver posts marcados como favoritos
- [ ] Ver empty state se não houver posts salvos
- [ ] Clicar em "Usar" num post salvo (abre modal)
- [ ] Desmarcar favorito (estrela)
- [ ] Ver prompts salvos
- [ ] Copiar prompt salvo
- [ ] Ver tags de cada prompt (plataforma + template)

### Responsividade
- [ ] Testar em mobile (< 768px)
- [ ] Testar em tablet (768px - 1024px)
- [ ] Testar em desktop (> 1024px)
- [ ] Verificar que filtros ficam legíveis em mobile
- [ ] Verificar que grid de posts ajusta para 1 coluna em mobile

### Estados e Feedback
- [ ] Ver loading spinner ao coletar dados
- [ ] Ver mensagem de sucesso ao adicionar concorrente
- [ ] Ver mensagem de erro ao tentar adicionar 4º concorrente
- [ ] Ver mensagem de sucesso ao salvar prompt
- [ ] Ver feedback "Copiado!" ao copiar prompt
- [ ] Ver empty states em cada aba

---

## 🎯 Fluxos de Teste Recomendados

### Fluxo 1: Análise de Concorrentes
1. Vá para Overview → veja métricas consolidadas
2. Clique em "Analisar Concorrentes"
3. Adicione um concorrente novo (se houver espaço)
4. Clique em "Coletar" num concorrente
5. Veja o insight da IA atualizar

### Fluxo 2: Criação de Conteúdo
1. Vá para "Content Radar"
2. Filtre por plataforma (ex: Instagram)
3. Ordene por "Viralidade"
4. Marque 2-3 posts como favoritos (estrela)
5. Clique em "Criar conteúdo" no post mais viral
6. Teste os 4 templates diferentes
7. Edite o prompt manualmente
8. Salve o prompt
9. Copie o prompt
10. Vá para "Salvos" e veja seu prompt lá

### Fluxo 3: Biblioteca de Referências
1. Marque vários posts como favoritos em "Content Radar"
2. Vá para aba "Salvos"
3. Veja todos os posts favoritos reunidos
4. Clique em "Usar" num post salvo
5. Crie e salve diferentes prompts
6. Volte para "Salvos" e copie um prompt antigo

---

## 📱 Screenshots Recomendados

Tire screenshots de:
1. Dashboard Overview completo
2. Card do Top Performer
3. Card de concorrente com o novo design
4. Grid de posts do Content Radar
5. Card de post viral individual
6. Modal de criação de conteúdo com templates
7. Aba Salvos com posts e prompts

---

## 🐛 O Que Observar

### Possíveis Ajustes Necessários
- Cores podem precisar de ajuste fino
- Tamanhos de fonte em mobile
- Espaçamentos entre elementos
- Animações podem ser muito rápidas/lentas

### Dados de Teste
- Se não houver posts coletados, você verá empty states
- Se não houver concorrentes, overview mostrará métricas zeradas
- Adicione dados de teste para melhor experiência

---

## 🔄 Voltar para Versão Antiga

Se quiser voltar temporariamente:

```tsx
// Em src/app/(app)/intelligence/page.tsx

// Trocar de volta para:
import { IntelligenceModule } from "@/components/intelligence/intelligence-module";

// E usar:
<IntelligenceModule
```

---

## 📊 Métricas de Sucesso

Avalie se as melhorias realmente funcionam:

- [ ] **Navegação mais rápida**: Encontro informações em menos cliques?
- [ ] **Overview útil**: Dashboard me dá contexto instantâneo?
- [ ] **Prompts melhores**: Templates geram conteúdo mais útil?
- [ ] **Organização**: Sistema de favoritos ajuda meu workflow?
- [ ] **Visual atraente**: Interface é mais agradável de usar?
- [ ] **Informações claras**: Entendo as métricas rapidamente?

---

## 💡 Dicas

1. **Teste com dados reais**: Adicione concorrentes reais e colete dados
2. **Salve prompts diversos**: Teste criar biblioteca com diferentes templates
3. **Use filtros**: Simule busca real por tipo de conteúdo
4. **Compare versões**: Alterne entre antiga e nova para sentir diferença
5. **Teste mobile**: Muitos usuários acessam via celular

---

## 🎨 Customizações Possíveis

Se quiser ajustar algo:

### Cores dos badges
```tsx
// Linha ~550 no arquivo intelligence-module-enhanced.tsx
className="rounded-full bg-danger-light px-2 py-1..."
// Troque danger-light por warning-light para laranja ao invés de vermelho
```

### Número de posts exibidos
```tsx
// Linha ~128
.slice(0, 20);
// Troque 20 por 30 ou 50 se quiser mais posts
```

### Templates de prompts
```tsx
// Linha ~59-92
const PROMPT_TEMPLATES = [...]
// Adicione novos templates ou edite os existentes
```

---

## ❓ FAQ

**P: Perdi meus favoritos ao recarregar a página?**
R: Sim, nesta versão os favoritos são salvos apenas na sessão. Para persistência, precisaria integrar com banco de dados.

**P: Posso adicionar meus próprios templates?**
R: Sim! Edite o array `PROMPT_TEMPLATES` no arquivo e adicione quantos quiser.

**P: O modal não fecha?**
R: Clique no botão "Fechar" ou clique fora do modal (no fundo escuro).

**P: Não vejo posts virais?**
R: O threshold viral é calculado automaticamente. Se não houver posts com engajamento suficiente, nenhum será marcado.

**P: Posso exportar os dados?**
R: Ainda não, mas essa é uma feature sugerida para v3.0.

---

*Boa exploração! 🚀*
