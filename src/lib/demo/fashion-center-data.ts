/**
 * Arquivo: src/lib/demo/fashion-center-data.ts
 * Propósito: Dados demo reais do Fashion Center (São José do Rio Preto/SP)
 *            para demonstração do Painel do Shopping.
 * Fonte: fashioncenter.com.br/roteiro-on-line.php (dados públicos)
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoreCategory =
  | 'Jeans Wear'
  | 'Moda Feminina'
  | 'Moda Feminina Plus Size'
  | 'Moda Masculina'
  | 'Moda Praia/Fitness'
  | 'Acessórios/Calçados'
  | 'Moda Infantil'
  | 'Alimentação'

export type DemoStore = {
  id: string
  name: string
  categories: StoreCategory[]
  primaryCategory: StoreCategory
  whatsapp: string
  instagram: string | null
  metrics: StoreMetrics
}

export type StoreMetrics = {
  conversationsMonth: number
  responseRate: number        // 0-100
  avgFirstResponseMin: number // minutos
  followUpRate: number        // 0-100
  leadsGoingCold: number
  revenueAtRisk: number       // R$
  healthScore: number         // 0-100
  conversionRate: number      // 0-100
}

export type CategorySummary = {
  category: StoreCategory
  storeCount: number
  totalConversations: number
  avgHealthScore: number
  totalRevenueAtRisk: number
  totalLeadsCold: number
  bestStore: { name: string; healthScore: number }
  worstStore: { name: string; healthScore: number }
}

export type ColdLead = {
  id: string
  phone: string
  originalMessage: string
  receivedAt: string // ISO date
  diagnosis: string
  diagnosisType: 'no_response' | 'slow_response' | 'incomplete_response' | 'after_hours'
  estimatedTicket: number
  intentLevel: 'alta' | 'media' | 'baixa'
  suggestion: string
  suggestedResponse: string
  storeName: string
  storeId: string
}

export type WeeklyAction = {
  icon: string
  title: string
  description: string
  estimatedImpact: number // R$
}

// ---------------------------------------------------------------------------
// Seed RNG (determinístico para consistência entre renders)
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

const rand = seededRandom(42)

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, decimals = 1): number {
  return Number((rand() * (max - min) + min).toFixed(decimals))
}

// Fatores de estimativa de recuperação (centralizado para consistência entre painéis)
export const RECOVERY_FACTORS = {
  perStore: 0.45,
  shopping: 0.35,
  weeklyAction1: 0.4,
  weeklyAction2: 0.3,
  weeklyAction3: 0.2,
} as const

// Referência operacional: tempo-alvo de 1ª resposta usado pelos textos do painel.
export const SHOPPING_RESPONSE_TARGET_MIN = 22

// ---------------------------------------------------------------------------
// Ticket médio por categoria (moda atacado)
// ---------------------------------------------------------------------------

const AVG_TICKET: Record<StoreCategory, number> = {
  'Jeans Wear': 180,
  'Moda Feminina': 150,
  'Moda Feminina Plus Size': 200,
  'Moda Masculina': 170,
  'Moda Praia/Fitness': 130,
  'Acessórios/Calçados': 90,
  'Moda Infantil': 120,
  'Alimentação': 35,
}

// ---------------------------------------------------------------------------
// Lojas reais do Fashion Center (dados públicos do roteiro on-line)
// ---------------------------------------------------------------------------

type RawStore = {
  name: string
  // Tupla não-vazia: garante que `categories[0]` (= primaryCategory) nunca seja undefined
  // ao adicionar lojas novas. Bate com `AVG_TICKET[primaryCategory]` sem guard runtime.
  categories: [StoreCategory, ...StoreCategory[]]
  whatsapp: string
  instagram: string | null
}

const RAW_STORES: RawStore[] = [
  { name: 'Appe', categories: ['Jeans Wear', 'Moda Feminina', 'Moda Masculina'], whatsapp: '5517997944981', instagram: '@appeoficial' },
  { name: 'Bagagem Obrigatória', categories: ['Jeans Wear', 'Moda Feminina Plus Size', 'Moda Feminina', 'Moda Masculina'], whatsapp: '5517997907376', instagram: '@bagagemobrigatoria.oficial' },
  { name: 'Dicollani Denim', categories: ['Jeans Wear', 'Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517996819891', instagram: '@dicollanidenim' },
  { name: 'Edex Jeans', categories: ['Jeans Wear', 'Moda Feminina', 'Moda Masculina'], whatsapp: '5517982147000', instagram: '@edexriopreto' },
  { name: 'Fille Denim', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517982069493', instagram: '@filledenim' },
  { name: 'Gliss Jeans', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517991232000', instagram: '@glissjeans' },
  { name: 'Izuz Jeans', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517997942010', instagram: '@izuzoficial' },
  { name: 'La Belle Jeans', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517996182234', instagram: '@labellejeans.atacado' },
  { name: 'Legítima Defesa Plus Size', categories: ['Jeans Wear', 'Moda Feminina Plus Size'], whatsapp: '5517992152358', instagram: '@legitimadefesajeanswear' },
  { name: 'Pérola Rara Jeans', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517982258174', instagram: '@perolararajeans' },
  { name: 'RGW', categories: ['Jeans Wear', 'Moda Feminina', 'Moda Masculina'], whatsapp: '5517981608174', instagram: '@polosrgw' },
  { name: 'Skenn', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517992225576', instagram: '@skennofficial' },
  { name: 'Tflow', categories: ['Jeans Wear', 'Moda Masculina'], whatsapp: '5517991178276', instagram: '@tflowatacado.oficial' },
  { name: 'Trama Jeans', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517996786574', instagram: '@tramajeans' },
  { name: 'Tratto', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517996727330', instagram: '@trattojeansbrasil' },
  { name: 'Trip Jeans', categories: ['Jeans Wear', 'Moda Feminina', 'Moda Masculina'], whatsapp: '5517981698663', instagram: '@tripjeans_' },
  { name: 'Vestire', categories: ['Jeans Wear'], whatsapp: '5517997490249', instagram: '@vestirejeans' },
  { name: 'Villon', categories: ['Jeans Wear', 'Moda Feminina'], whatsapp: '5517991075006', instagram: '@villonjeans' },
  { name: 'Wolfgan', categories: ['Jeans Wear', 'Moda Feminina', 'Moda Masculina'], whatsapp: '5517991815906', instagram: '@wolfgan_fashioncenter' },
  { name: 'New Summer', categories: ['Moda Praia/Fitness'], whatsapp: '5517981310628', instagram: '@newsummeroficial' },
  { name: 'Reccorpus', categories: ['Moda Praia/Fitness'], whatsapp: '5517981701200', instagram: '@reccorpusriopreto' },
  { name: 'Timboré', categories: ['Moda Praia/Fitness'], whatsapp: '5517991959101', instagram: null },
  { name: 'Bellah Curves', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517996253527', instagram: '@bellahcurves_' },
  { name: 'Divas Voga', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517981692264', instagram: '@divasvogaoficial' },
  { name: 'Doce Atitude', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517982318340', instagram: '@doceatitudeatacado' },
  { name: 'Flor da Moda', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517991940449', instagram: '@flordamodaoficial_' },
  { name: 'Gracia Alonso', categories: ['Moda Feminina Plus Size'], whatsapp: '5517991805020', instagram: '@graciaalonsofashion' },
  { name: 'Jethagui', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517992660321', instagram: '@jethaguibrand' },
  { name: 'Linda G Plus', categories: ['Moda Feminina Plus Size'], whatsapp: '5517992205604', instagram: '@lindagplus' },
  { name: 'Mamorena', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517991783098', instagram: '@mamorenaoficial' },
  { name: 'Plock Rock', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517981147908', instagram: '@plockrock' },
  { name: 'Pra Dela', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5519994844182', instagram: '@pradelaoficial' },
  { name: 'Raio de Luz', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5519987530689', instagram: '@fashionraiodeluz' },
  { name: 'Remar', categories: ['Moda Feminina Plus Size'], whatsapp: '5517981985108', instagram: '@remar.moda' },
  { name: 'Rodher', categories: ['Moda Feminina Plus Size'], whatsapp: '5519999421922', instagram: null },
  { name: 'Rosa Milliossi', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517996605509', instagram: '@rosamilliossioficial' },
  { name: 'Savannah', categories: ['Moda Feminina Plus Size'], whatsapp: '5517981048411', instagram: '@amosavannahbrand' },
  { name: 'Seja Você Mesma', categories: ['Moda Feminina Plus Size'], whatsapp: '5517996268218', instagram: '@sejavocemesmaplussize' },
  { name: 'Tatalu', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517991576724', instagram: '@tataluconfeccoes' },
  { name: 'Valentina Ferreira', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517988461420', instagram: '@valentinaferreiraoficial' },
  { name: 'Vanessa Ferraz', categories: ['Moda Feminina Plus Size', 'Moda Feminina'], whatsapp: '5517997514843', instagram: '@vanessaferraz.oficial' },
  { name: 'Dulidu Acessórios', categories: ['Acessórios/Calçados'], whatsapp: '5517981264100', instagram: '@lojalindameubem' },
  { name: 'FB Acessórios', categories: ['Acessórios/Calçados'], whatsapp: '5517982038742', instagram: '@fbruncaacessorios' },
  { name: 'WJ Acessórios', categories: ['Acessórios/Calçados'], whatsapp: '5547996118139', instagram: '@wjacessoriosfashioncenter' },
  { name: 'Ciranda Kids', categories: ['Moda Infantil'], whatsapp: '5517996503468', instagram: '@cirandakids__' },
  { name: 'Anamês', categories: ['Moda Feminina'], whatsapp: '5517997788088', instagram: '@anamesoficial' },
  { name: 'Anathema', categories: ['Moda Feminina'], whatsapp: '5517996723976', instagram: '@anathemaoficial' },
  { name: 'Artsy', categories: ['Moda Feminina'], whatsapp: '5517981921392', instagram: '@artsyoficial' },
  { name: 'Carmezim', categories: ['Moda Feminina'], whatsapp: '5517996418841', instagram: '@carmezimoficial' },
  { name: 'Cheiro de Fruta', categories: ['Moda Feminina'], whatsapp: '5517991299279', instagram: '@cheirodefruta' },
  { name: 'Clariet', categories: ['Moda Feminina'], whatsapp: '5517981154317', instagram: '@clariet.oficial' },
  { name: 'Clô', categories: ['Moda Feminina'], whatsapp: '5517997919253', instagram: '@clooficial' },
  { name: 'Cool Hit', categories: ['Moda Feminina'], whatsapp: '5517997895860', instagram: '@coolhitoficial' },
  { name: 'Desnude', categories: ['Moda Feminina'], whatsapp: '5517996064780', instagram: '@desnude' },
  { name: 'Dress 7', categories: ['Moda Feminina'], whatsapp: '5517981430670', instagram: '@dress7oficial' },
  { name: 'Duplo Sentido', categories: ['Moda Feminina'], whatsapp: '5517991268840', instagram: '@duplosentidoficial' },
  { name: 'Elva', categories: ['Moda Feminina'], whatsapp: '5517997080087', instagram: '@elvaoficiall' },
  { name: 'Estilo Olivia', categories: ['Moda Feminina'], whatsapp: '5517997240088', instagram: '@estiloolivia' },
  { name: 'Fina Moça', categories: ['Moda Feminina'], whatsapp: '5517981985208', instagram: '@fina.moca' },
  { name: 'Finna', categories: ['Moda Feminina'], whatsapp: '5517988208132', instagram: '@finnaoficial' },
  { name: 'Flor Linda', categories: ['Moda Feminina'], whatsapp: '551732438831', instagram: '@florlindaoficial' },
  { name: 'Fortina', categories: ['Moda Feminina'], whatsapp: '5517981323687', instagram: '@fortinaoficial' },
  { name: 'Franciele Morezzi', categories: ['Moda Feminina'], whatsapp: '5517991709394', instagram: '@francielemorezzioficial' },
  { name: 'Império', categories: ['Moda Feminina'], whatsapp: '5544988040807', instagram: null },
  { name: 'Inicial A', categories: ['Moda Feminina'], whatsapp: '5517991633344', instagram: '@iniciala' },
  { name: 'Isamiss', categories: ['Moda Feminina'], whatsapp: '5517996603807', instagram: '@isamissoficial' },
  { name: 'Lamô', categories: ['Moda Feminina'], whatsapp: '5517991939954', instagram: '@lamo.oficial' },
  { name: "Le'rizz", categories: ['Moda Feminina'], whatsapp: '5517996532978', instagram: '@lerizzoficial' },
  { name: 'Lily Belle', categories: ['Moda Feminina'], whatsapp: '5517991394253', instagram: '@lilybelleoficial' },
  { name: 'Luzia Fazzolli', categories: ['Moda Feminina'], whatsapp: '5517997053381', instagram: '@luziafazzollibrand' },
  { name: 'MA Clothes', categories: ['Moda Feminina'], whatsapp: '5517997824714', instagram: '@usema.co' },
  { name: 'Magda Occhi', categories: ['Moda Feminina'], whatsapp: '5517991515897', instagram: '@magdaocchioficial' },
  { name: 'Maria Flor', categories: ['Moda Feminina'], whatsapp: '5517988157637', instagram: '@mariaflormoda_oficial' },
  { name: 'Maria Poá', categories: ['Moda Feminina'], whatsapp: '5517981120508', instagram: '@mariapoaoficial' },
  { name: 'Miss Mary', categories: ['Moda Feminina'], whatsapp: '5517981552998', instagram: '@missmary_oficial' },
  { name: 'Monda', categories: ['Moda Feminina'], whatsapp: '5517991341610', instagram: null },
  { name: 'Montaria', categories: ['Moda Feminina'], whatsapp: '5517996777999', instagram: '@montariafashioncenter' },
  { name: 'Murau', categories: ['Moda Feminina'], whatsapp: '5517996670239', instagram: '@murauoficial' },
  { name: 'Patrimonium', categories: ['Moda Feminina'], whatsapp: '5517997683106', instagram: null },
  { name: 'Pietra', categories: ['Moda Feminina'], whatsapp: '5517991360890', instagram: '@pietra1986' },
  { name: 'Santissima Vestimenta', categories: ['Moda Feminina'], whatsapp: '5517997949304', instagram: '@santissima.vestimenta' },
  { name: 'Studio Guapo', categories: ['Moda Feminina'], whatsapp: '5517982084401', instagram: null },
  { name: 'Tellos', categories: ['Moda Feminina'], whatsapp: '5519994910436', instagram: '@tellos_atacado' },
  { name: 'To Fashion', categories: ['Moda Feminina'], whatsapp: '5517996001002', instagram: '@tofashion.store' },
  { name: 'Tuca Clothing', categories: ['Moda Feminina'], whatsapp: '5517991938155', instagram: '@tuca.oficial' },
  { name: 'Uzzee Maçã Store', categories: ['Moda Feminina'], whatsapp: '5517981594345', instagram: '@uzzeestoreoficial' },
  { name: 'Vanessa Ottoboni', categories: ['Moda Feminina'], whatsapp: '5517996696743', instagram: '@vanessaottobonioficial' },
  { name: 'Hombre', categories: ['Moda Masculina'], whatsapp: '5517991945461', instagram: '@hombrefashioncenter' },
  { name: 'Inside Surf Wear', categories: ['Moda Masculina'], whatsapp: '5511959412020', instagram: '@insideriopreto' },
  { name: 'King John', categories: ['Moda Masculina'], whatsapp: '5517992543964', instagram: '@kingjohn.oficial' },
  { name: 'MYR', categories: ['Moda Masculina'], whatsapp: '5517996460802', instagram: '@myroficial' },
  { name: 'Entre Grãos', categories: ['Alimentação'], whatsapp: '5517997055636', instagram: null },
  { name: 'Restaurante Salsa e Cor', categories: ['Alimentação'], whatsapp: '5517996591243', instagram: '@salsaecorfashion_' },
]

// ---------------------------------------------------------------------------
// Geração de métricas plausíveis
// ---------------------------------------------------------------------------

function generateMetrics(categories: StoreCategory[]): StoreMetrics {
  const primaryTicket = AVG_TICKET[categories[0]]
  const conversationsMonth = randInt(40, 280)
  const responseRate = randFloat(42, 96)
  const avgFirstResponseMin = randInt(8, 240)
  const followUpRate = randFloat(15, 85)
  const coldPct = randFloat(5, 42)
  const leadsGoingCold = Math.round(conversationsMonth * (coldPct / 100))
  const revenueAtRisk = leadsGoingCold * primaryTicket
  const conversionRate = randFloat(8, 45)

  // Health score: composto ponderado
  const responseScore = Math.min(100, responseRate * 1.05)
  const timeScore = Math.max(0, 100 - (avgFirstResponseMin / 2.4))
  const followUpScore = followUpRate
  const healthScore = Math.round(
    responseScore * 0.35 + timeScore * 0.35 + followUpScore * 0.30
  )

  return {
    conversationsMonth,
    responseRate,
    avgFirstResponseMin,
    followUpRate,
    leadsGoingCold,
    revenueAtRisk,
    healthScore: Math.max(15, Math.min(98, healthScore)),
    conversionRate,
  }
}

// ---------------------------------------------------------------------------
// Gerar lojas com IDs e métricas
// ---------------------------------------------------------------------------

function buildDemoStores(): DemoStore[] {
  return RAW_STORES.map((raw, i) => ({
    id: `demo-store-${String(i + 1).padStart(3, '0')}`,
    name: raw.name,
    categories: raw.categories,
    primaryCategory: raw.categories[0],
    whatsapp: raw.whatsapp,
    instagram: raw.instagram,
    metrics: generateMetrics(raw.categories),
  }))
}

// ---------------------------------------------------------------------------
// Agregar por categoria
// ---------------------------------------------------------------------------

function buildCategorySummaries(stores: DemoStore[]): CategorySummary[] {
  // Agregar por `primaryCategory` evita somar a mesma loja em múltiplas categorias
  // (caso contrário, total das categorias > total do shopping).
  const cats = Array.from(new Set(stores.map((s) => s.primaryCategory))) as StoreCategory[]

  return cats.map((cat) => {
    const catStores = stores.filter((s) => s.primaryCategory === cat)
    const sorted = [...catStores].sort((a, b) => b.metrics.healthScore - a.metrics.healthScore)

    return {
      category: cat,
      storeCount: catStores.length,
      totalConversations: catStores.reduce((s, st) => s + st.metrics.conversationsMonth, 0),
      avgHealthScore: Math.round(
        catStores.reduce((s, st) => s + st.metrics.healthScore, 0) / catStores.length
      ),
      totalRevenueAtRisk: catStores.reduce((s, st) => s + st.metrics.revenueAtRisk, 0),
      totalLeadsCold: catStores.reduce((s, st) => s + st.metrics.leadsGoingCold, 0),
      bestStore: { name: sorted[0].name, healthScore: sorted[0].metrics.healthScore },
      worstStore: {
        name: sorted[sorted.length - 1].name,
        healthScore: sorted[sorted.length - 1].metrics.healthScore,
      },
    }
  })
}

// ---------------------------------------------------------------------------
// Leads esfriando (para demo de loja individual)
// ---------------------------------------------------------------------------

// Templates de cold leads: `receivedAtDaysAgo` é resolvido para ISO em `generateColdLeads`
// (avaliação por request, não no carregamento do módulo — evita que as datas envelheçam
// junto com o uptime do servidor de produção).
type ColdLeadTemplate = Omit<ColdLead, 'id' | 'storeName' | 'storeId' | 'receivedAt'> & {
  receivedAtDaysAgo: number
}

const COLD_LEAD_TEMPLATES: ColdLeadTemplate[] = [
  {
    phone: '+55 17 9●●●●-●●42',
    originalMessage: 'Oi, vocês têm calça jeans flare no tamanho 42? Qual o preço no atacado?',
    receivedAtDaysAgo: 2,
    diagnosis: 'Sem resposta após 4 horas',
    diagnosisType: 'no_response',
    estimatedTicket: 360,
    intentLevel: 'alta',
    suggestion: 'Responder agora com disponibilidade e preço de atacado. Leads de jeans respondem bem até 48h.',
    suggestedResponse: 'Oi! Temos sim a calça flare no 42 😊 No atacado (mín. 6 peças), sai R$59,90 a unidade. Quer que eu mande fotos das cores disponíveis?',
  },
  {
    phone: '+55 17 9●●●●-●●87',
    originalMessage: 'Boa tarde! Queria ver o catálogo de vocês de inverno. Tem como mandar por aqui?',
    receivedAtDaysAgo: 3,
    diagnosis: 'Respondeu "Vou enviar" mas nunca enviou o catálogo',
    diagnosisType: 'incomplete_response',
    estimatedTicket: 800,
    intentLevel: 'alta',
    suggestion: 'Enviar catálogo agora com destaque para lançamentos. Cliente demonstrou intenção de compra em volume.',
    suggestedResponse: 'Oi! Desculpa a demora com o catálogo 🙏 Segue aqui nossos lançamentos de inverno. Destaque para a linha de casacos que está saindo muito! Qual peça te interessou mais?',
  },
  {
    phone: '+55 17 9●●●●-●●15',
    originalMessage: 'Boa noite, vocês fazem entrega pra Campinas? Quero fechar um pedido grande',
    receivedAtDaysAgo: 1,
    diagnosis: 'Mensagem recebida às 21:40 (fora do horário). Sem resposta automática.',
    diagnosisType: 'after_hours',
    estimatedTicket: 1500,
    intentLevel: 'alta',
    suggestion: 'Responder com urgência — "pedido grande" indica lojista comprando para revenda. Configurar resposta automática fora do horário.',
    suggestedResponse: 'Bom dia! Vi sua mensagem de ontem 😊 Fazemos sim entrega para Campinas! Para pedidos acima de R$2.000 o frete é grátis. Me conta o que você precisa que já monto o orçamento!',
  },
  {
    phone: '+55 19 9●●●●-●●63',
    originalMessage: 'Quanto tá o short jeans no atacado? Preciso de umas 30 peças',
    receivedAtDaysAgo: 5,
    diagnosis: 'Respondeu em 3h, mas cliente não retornou após resposta genérica sem preço',
    diagnosisType: 'slow_response',
    estimatedTicket: 1200,
    intentLevel: 'alta',
    suggestion: 'Recontatar com preço direto + condição especial para 30 peças. Lead de volume tem alta conversão.',
    suggestedResponse: 'Oi! Sobre os 30 shorts jeans — conseguimos R$45,90 a unidade nessa quantidade. Tem uns modelos novos que chegaram essa semana, quer ver? Posso mandar fotos agora 📸',
  },
  {
    phone: '+55 17 9●●●●-●●29',
    originalMessage: 'Oi tudo bem? Vi vocês no Instagram, queria saber se tem peças a partir do 48',
    receivedAtDaysAgo: 4,
    diagnosis: 'Sem resposta — mensagem pode ter sido perdida entre outras',
    diagnosisType: 'no_response',
    estimatedTicket: 400,
    intentLevel: 'media',
    suggestion: 'Responder com tabela de tamanhos e fotos das peças plus size. Cliente veio do Instagram — canal quente.',
    suggestedResponse: 'Oi! Temos sim a partir do 48 até o 54! 😊 Vou mandar fotos das peças que mais saem nessa numeração. Você compra pra revenda ou uso pessoal?',
  },
]

function generateColdLeads(store: DemoStore, count: number): ColdLead[] {
  // Permuta os templates com seed por loja: cada loja mostra os mesmos 5 fatos em ordem
  // diferente, mantendo determinismo entre renders mas variando o que o usuário vê
  // ao navegar entre lojas. `receivedAt` é resolvido agora (por request).
  const seed = hashString(store.id)
  const order = [...Array(COLD_LEAD_TEMPLATES.length).keys()].sort((a, b) => {
    return ((a + seed) % 7) - ((b + seed) % 7) || a - b
  })
  const now = Date.now()
  const leads: ColdLead[] = []
  for (let i = 0; i < count && i < order.length; i++) {
    const template = COLD_LEAD_TEMPLATES[order[i]]
    if (!template) continue
    const { receivedAtDaysAgo, ...rest } = template
    leads.push({
      ...rest,
      receivedAt: new Date(now - receivedAtDaysAgo * 86400000).toISOString(),
      id: `cold-lead-${store.id}-${i}`,
      storeName: store.name,
      storeId: store.id,
    })
  }
  return leads
}

// ---------------------------------------------------------------------------
// Ações semanais (para demo de loja individual)
// ---------------------------------------------------------------------------

function generateWeeklyActions(store: DemoStore): WeeklyAction[] {
  const m = store.metrics
  const ticket = AVG_TICKET[store.primaryCategory]

  // PRNG local com seed determinístico por loja: garante texto estável entre requests
  // (o PRNG global de módulo avançaria a cada chamada, gerando hydration mismatch).
  const localRand = seededRandom(hashString(store.id))
  const localRandInt = (min: number, max: number): number =>
    Math.floor(localRand() * (max - min + 1)) + min

  const responseGapPct =
    m.avgFirstResponseMin > SHOPPING_RESPONSE_TARGET_MIN
      ? Math.round(((m.avgFirstResponseMin - SHOPPING_RESPONSE_TARGET_MIN) / m.avgFirstResponseMin) * 100)
      : 0

  const firstResponseDescription =
    m.avgFirstResponseMin > SHOPPING_RESPONSE_TARGET_MIN
      ? `Você responde em média em ${m.avgFirstResponseMin}min. A referência do shopping é ${SHOPPING_RESPONSE_TARGET_MIN}min. ${responseGapPct}% dos leads que esfriaram receberam resposta após 1 hora.`
      : `Você já responde em ${m.avgFirstResponseMin}min (referência do shopping: ${SHOPPING_RESPONSE_TARGET_MIN}min). Mantenha esse padrão para evitar leads esfriando.`

  return [
    {
      icon: '⏱️',
      title: 'Responder em até 15 minutos no horário comercial',
      description: firstResponseDescription,
      estimatedImpact: Math.round(m.leadsGoingCold * RECOVERY_FACTORS.weeklyAction1 * ticket),
    },
    {
      icon: '💬',
      title: 'Sempre informar preço ou faixa de preço na 1ª resposta',
      description: `Em ${localRandInt(45, 72)}% das conversas, o cliente pediu preço e você não informou. ${localRandInt(80, 92)}% desses não voltaram.`,
      estimatedImpact: Math.round(m.leadsGoingCold * RECOVERY_FACTORS.weeklyAction2 * ticket),
    },
    {
      icon: '🌙',
      title: 'Configurar resposta automática fora do horário',
      description: `${localRandInt(18, 28)}% dos seus leads chegam entre 20h-8h. Nenhum recebe resposta automática.`,
      estimatedImpact: Math.round(m.leadsGoingCold * RECOVERY_FACTORS.weeklyAction3 * ticket),
    },
  ]
}

// ---------------------------------------------------------------------------
// Problemas mais comuns (agregado do shopping)
// ---------------------------------------------------------------------------

export type CommonProblem = {
  label: string
  percentage: number
  color: string
}

function generateCommonProblems(): CommonProblem[] {
  return [
    { label: 'Demora na 1ª resposta (>1h)', percentage: 42, color: 'var(--color-danger)' },
    { label: 'Conversa abandonada sem follow-up', percentage: 28, color: 'var(--color-warning)' },
    { label: 'Mensagem fora do horário sem resposta auto', percentage: 16, color: 'var(--color-primary)' },
    { label: 'Resposta genérica / sem preço', percentage: 9, color: 'var(--color-text-tertiary)' },
    { label: 'Cliente pediu catálogo e não recebeu', percentage: 5, color: 'var(--color-text-tertiary)' },
  ]
}

// ---------------------------------------------------------------------------
// Exportações principais
// ---------------------------------------------------------------------------

export const DEMO_STORES = buildDemoStores()

export const DEMO_CATEGORY_SUMMARIES = buildCategorySummaries(DEMO_STORES)

export const DEMO_COMMON_PROBLEMS = generateCommonProblems()

export const DEMO_SHOPPING_NAME = 'Fashion Center'
export const DEMO_SHOPPING_CITY = 'São José do Rio Preto/SP'
export const DEMO_STORE_COUNT = DEMO_STORES.length

// KPIs agregados do shopping
export const DEMO_SHOPPING_KPIS = {
  totalConversations: DEMO_STORES.reduce((s, st) => s + st.metrics.conversationsMonth, 0),
  totalLeadsCold: DEMO_STORES.reduce((s, st) => s + st.metrics.leadsGoingCold, 0),
  totalRevenueAtRisk: DEMO_STORES.reduce((s, st) => s + st.metrics.revenueAtRisk, 0),
  avgHealthScore: Math.round(
    DEMO_STORES.reduce((s, st) => s + st.metrics.healthScore, 0) / DEMO_STORES.length
  ),
  avgResponseTimeMin: Math.round(
    DEMO_STORES.reduce((s, st) => s + st.metrics.avgFirstResponseMin, 0) / DEMO_STORES.length
  ),
  storesConnected: Math.round(DEMO_STORES.length * 0.85),
  storesTotal: DEMO_STORES.length,
}

// Helpers para o dashboard de loja individual
export function getDemoStore(storeId: string): DemoStore | undefined {
  return DEMO_STORES.find((s) => s.id === storeId)
}

export function getDemoColdLeads(storeId: string): ColdLead[] {
  const store = getDemoStore(storeId)
  if (!store) return []
  return generateColdLeads(store, Math.min(5, store.metrics.leadsGoingCold))
}

export function getDemoWeeklyActions(storeId: string): WeeklyAction[] {
  const store = getDemoStore(storeId)
  if (!store) return []
  return generateWeeklyActions(store)
}

// Benchmark: média do shopping para comparação
export function getShoppingBenchmark() {
  const count = DEMO_STORES.length
  return {
    avgResponseRate: Math.round(
      DEMO_STORES.reduce((s, st) => s + st.metrics.responseRate, 0) / count
    ),
    avgFirstResponseMin: Math.round(
      DEMO_STORES.reduce((s, st) => s + st.metrics.avgFirstResponseMin, 0) / count
    ),
    avgFollowUpRate: Math.round(
      DEMO_STORES.reduce((s, st) => s + st.metrics.followUpRate, 0) / count
    ),
    avgConversionRate: Math.round(
      DEMO_STORES.reduce((s, st) => s + st.metrics.conversionRate, 0) / count * 10
    ) / 10,
  }
}
