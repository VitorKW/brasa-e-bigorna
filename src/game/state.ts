import { MOEDAS_INICIAIS, SAVE_VERSION, type EstacaoId, type RecursoId } from './constants.ts'
import type { ChefeId } from './chefe.ts'
import type { ConstrucaoId } from './construcoes.ts'
import type { TalentoId } from './talentos.ts'
import type { Expedicao } from './expedicoes.ts'
import type { Heroi } from './herois.ts'
import { FERREIROS, type Ferreiro, type FerreiroId } from './ferreiros.ts'
import type { Item, MaterialId, ReceitaId, ResultadoBatida } from './items.ts'
import { campanhaInicial, type EstadoCampanha } from './campanha.ts'
import type { ConquistaId } from './conquistas.ts'
import type { Encomenda } from './encomendas.ts'
import { estatisticasIniciais, type Estatisticas } from './estatisticas.ts'

/** Pedido de forja (fila): a receita e o material escolhidos na hora de enfileirar. */
export interface PedidoForja {
  receita: ReceitaId
  material: MaterialId
}

/** Tarefa em andamento na bigorna. Tudo que é sorteado nasce aqui, ANTES do minigame. */
export interface Forja {
  receita: ReceitaId
  material: MaterialId
  /** 0..1 da tarefa. */
  progresso: number
  /** Sorteio da qualidade, inteiro em [0, 20]. */
  aleatorio: number
  /** Posição (0..1) do alvo do minigame. */
  alvo: number
  /** Iara: este sorteio já diz se sai um segundo item. */
  duplo: boolean
  batida: ResultadoBatida
  /** 'pendente' = overlay aberto; a tarefa espera o resultado antes de concluir. */
  minigame: 'nenhum' | 'pendente' | 'feito'
}

export interface GameState {
  version: number
  /** Timestamp (ms) da última simulação aplicada. */
  lastTick: number
  /** Bigorna começa no nível 0 (bloqueada). */
  niveis: Record<EstacaoId, number>
  recursos: Record<RecursoId, number>
  moedas: number
  /** Moedas ganhas no CICLO atual (vendas e expedições): a base do prestígio, GDD §4.2. Zera no Reforjar. */
  moedasGanhas: number

  /** Estado do gerador de números aleatórios (mulberry32). */
  rng: number
  itens: Item[]
  limiteInventario: number
  proximoIdItem: number
  ferreiros: Record<FerreiroId, Ferreiro>
  forja: Forja | null
  /** Receitas esperando a vez (a bigorna toca uma de cada vez). */
  fila: PedidoForja[]
  /** Modo automático: repete a última receita enquanto houver lingotes e espaço. */
  automatico: boolean
  ultimaReceita: ReceitaId | null
  /** Material da última receita (o modo automático repete os dois). */
  ultimoMaterial: MaterialId

  // Fatia 3
  herois: Heroi[]
  proximoIdHeroi: number
  /** Expedições em andamento ou que já voltaram e esperam a coleta. */
  expedicoes: Expedicao[]
  proximoIdExpedicao: number
  /** Não se gasta: é um limiar (GDD §4.1). */
  reputacao: number
  fragmentos: number
  chefesDerrotados: ChefeId[]

  // Fatia 4
  /** Construções do vilarejo (ficam depois do Reforjar). */
  construcoes: ConstrucaoId[]
  /** Brasas Ancestrais NÃO gastas: cada uma dá +2 % de produção; talentos gastam daqui. */
  brasas: number
  talentos: TalentoId[]
  /** Quantas vezes já Reforjou. */
  reforjas: number

  // Fatia 5
  /** Pedidos abertos dos moradores (até 3). Zeram no Reforjar. */
  encomendas: Encomenda[]
  proximoIdEncomenda: number
  /** Timestamp (ms) a partir do qual pode surgir outra encomenda. */
  proximaEncomenda: number
  /** Vende sozinho o que não melhora nenhum herói nem serve a uma encomenda (inventario.ts). */
  autoVenda: boolean
  /** Desbloqueadas, em ordem. Ficam para sempre. */
  conquistas: ConquistaId[]
  /** Contadores da vida toda: sobrevivem ao Reforjar. */
  stats: Estatisticas
  /** Som opcional (Web Audio), desligado por padrão. */
  som: boolean
  /** Dicas de primeira vez já dispensadas. */
  dicasVistas: string[]
  /** Campanha (fatia 9): missões cumpridas e recompensas recebidas. Sobrevive ao Reforjar. */
  campanha: EstadoCampanha
}

export const LIMITE_INVENTARIO_PADRAO = 30 // [suposição]

export function ferreirosIniciais(): Record<FerreiroId, Ferreiro> {
  const r = {} as Record<FerreiroId, Ferreiro>
  for (const id of FERREIROS) r[id] = { contratado: false, nivel: 1, xp: 0, estacao: null }
  return r
}

export function estadoInicial(now: number, rng = 20261109): GameState {
  return {
    version: SAVE_VERSION,
    lastTick: now,
    niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 0, forno: 0 },
    recursos: { minerio: 0, carvao: 0, lingote: 0, aco: 0 },
    moedas: MOEDAS_INICIAIS,
    moedasGanhas: 0,
    rng,
    itens: [],
    limiteInventario: LIMITE_INVENTARIO_PADRAO,
    proximoIdItem: 1,
    ferreiros: ferreirosIniciais(),
    forja: null,
    fila: [],
    automatico: false,
    ultimaReceita: null,
    ultimoMaterial: 'ferro',
    herois: [],
    proximoIdHeroi: 1,
    expedicoes: [],
    proximoIdExpedicao: 1,
    reputacao: 0,
    fragmentos: 0,
    chefesDerrotados: [],
    construcoes: [],
    brasas: 0,
    talentos: [],
    reforjas: 0,
    encomendas: [],
    proximoIdEncomenda: 1,
    proximaEncomenda: 0,
    autoVenda: false,
    conquistas: [],
    stats: estatisticasIniciais(),
    som: true, // ligado em jogo novo; o botão de som fica na barra de recursos
    dicasVistas: [],
    campanha: campanhaInicial(),
  }
}
