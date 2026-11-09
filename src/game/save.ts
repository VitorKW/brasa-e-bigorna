import { ESTACOES, ESTACOES_PRODUCAO, RECURSOS, SAVE_VERSION, type EstacaoId } from './constants.ts'
import { FERREIROS, podeAlocar, type Ferreiro } from './ferreiros.ts'
import { MATERIAIS, QUALIDADES, TIPOS_ITEM, type Item, type ReceitaId } from './items.ts'
import { semente } from './rng.ts'
import { LIMITE_INVENTARIO_PADRAO, ferreirosIniciais, type Forja, type GameState } from './state.ts'

type SaveBruto = Record<string, unknown>
/** Cada migração leva o save da versão N para N+1. */
export type Migracoes = Record<number, (raw: SaveBruto) => SaveBruto>

/**
 * Registro de migrações. Ao mudar o formato, suba SAVE_VERSION e adicione
 * `[versaoAntiga]: (raw) => ({ ...raw, version: versaoAntiga + 1, ... })`.
 */
export const MIGRACOES: Migracoes = {
  /** Fatia 1 -> fatia 2: bigorna bloqueada, inventário vazio, ferreiros por contratar. */
  1: (raw) => {
    const niveis = ehObjeto(raw.niveis) ? raw.niveis : {}
    return {
      ...raw,
      version: 2,
      niveis: { ...niveis, bigorna: 0 },
      // Semente determinística a partir do último tick do save antigo.
      rng: semente(ehNumero(raw.lastTick) ? raw.lastTick : 0),
      itens: [],
      limiteInventario: LIMITE_INVENTARIO_PADRAO,
      proximoIdItem: 1,
      ferreiros: ferreirosIniciais(),
      forja: null,
      fila: [],
      automatico: false,
      ultimaReceita: null,
    }
  },
}

const ehNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const ehObjeto = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)
const ehUm = <T extends string>(lista: readonly T[], x: unknown): x is T =>
  typeof x === 'string' && (lista as readonly string[]).includes(x)

function validarItem(x: unknown): Item | null {
  if (!ehObjeto(x)) return null
  if (!ehNumero(x.id) || !ehNumero(x.valor) || !ehNumero(x.pontuacao) || x.valor < 0) return null
  if (!ehUm(TIPOS_ITEM, x.tipo) || !ehUm(MATERIAIS, x.material) || !ehUm(QUALIDADES, x.qualidade)) return null
  if (typeof x.ferreiro !== 'string') return null
  return {
    id: Math.floor(x.id),
    tipo: x.tipo,
    material: x.material,
    qualidade: x.qualidade,
    ferreiro: x.ferreiro,
    valor: x.valor,
    pontuacao: x.pontuacao,
  }
}

function validarForja(x: unknown): Forja | null | undefined {
  if (x === null) return null
  if (!ehObjeto(x)) return undefined
  if (!ehUm(TIPOS_ITEM, x.receita) || !ehUm(MATERIAIS, x.material)) return undefined
  if (!ehNumero(x.progresso) || !ehNumero(x.aleatorio) || !ehNumero(x.alvo)) return undefined
  if (typeof x.duplo !== 'boolean') return undefined
  if (!ehUm(['automatico', 'errou', 'bom', 'perfeito'] as const, x.batida)) return undefined
  if (!ehUm(['nenhum', 'pendente', 'feito'] as const, x.minigame)) return undefined
  return {
    receita: x.receita,
    material: x.material,
    progresso: Math.min(1, Math.max(0, x.progresso)),
    aleatorio: Math.min(20, Math.max(0, Math.floor(x.aleatorio))),
    alvo: Math.min(1, Math.max(0, x.alvo)),
    duplo: x.duplo,
    batida: x.batida,
    minigame: x.minigame,
  }
}

function validarFerreiros(x: unknown): GameState['ferreiros'] | null {
  if (!ehObjeto(x)) return null
  const r = ferreirosIniciais()
  const ocupadas = new Set<EstacaoId>()
  for (const id of FERREIROS) {
    const f = x[id]
    if (!ehObjeto(f) || typeof f.contratado !== 'boolean') return null
    if (!ehNumero(f.nivel) || f.nivel < 1 || !ehNumero(f.xp) || f.xp < 0) return null
    let estacao: Ferreiro['estacao'] = null
    if (f.estacao !== null) {
      if (!ehUm(ESTACOES, f.estacao)) return null
      // Posto inválido (incompatível, repetido ou sem contrato) vira "sem posto", não corrompe o save.
      if (f.contratado && podeAlocar(id, f.estacao) && !ocupadas.has(f.estacao)) {
        estacao = f.estacao
        ocupadas.add(f.estacao)
      }
    }
    r[id] = { contratado: f.contratado, nivel: Math.floor(f.nivel), xp: f.xp, estacao }
  }
  return r
}

/** Valida o formato atual e corrige o que dá para corrigir. Null = corrompido. */
export function validarEstado(raw: unknown): GameState | null {
  if (!ehObjeto(raw) || raw.version !== SAVE_VERSION) return null
  const { niveis, recursos } = raw
  if (!ehObjeto(niveis) || !ehObjeto(recursos)) return null
  if (!ehNumero(raw.lastTick) || !ehNumero(raw.moedas) || !ehNumero(raw.moedasGanhas)) return null

  const n = {} as GameState['niveis']
  for (const e of ESTACOES) {
    const v = niveis[e]
    const minimo = (ESTACOES_PRODUCAO as readonly string[]).includes(e) ? 1 : 0
    if (!ehNumero(v) || v < minimo) return null
    n[e] = Math.floor(v)
  }
  const r = {} as GameState['recursos']
  for (const k of RECURSOS) {
    const v = recursos[k]
    if (!ehNumero(v) || v < 0) return null
    r[k] = v
  }

  if (!ehNumero(raw.rng) || !ehNumero(raw.limiteInventario) || raw.limiteInventario < 1) return null
  if (!ehNumero(raw.proximoIdItem) || typeof raw.automatico !== 'boolean') return null
  if (!Array.isArray(raw.itens) || !Array.isArray(raw.fila)) return null

  const itens: Item[] = []
  for (const bruto of raw.itens) {
    const item = validarItem(bruto)
    if (!item) return null
    itens.push(item)
  }
  const fila: ReceitaId[] = []
  for (const x of raw.fila) {
    if (!ehUm(TIPOS_ITEM, x)) return null
    fila.push(x)
  }
  const ferreiros = validarFerreiros(raw.ferreiros)
  const forja = validarForja(raw.forja)
  if (!ferreiros || forja === undefined) return null
  if (raw.ultimaReceita !== null && !ehUm(TIPOS_ITEM, raw.ultimaReceita)) return null

  return {
    version: SAVE_VERSION,
    lastTick: raw.lastTick,
    niveis: n,
    recursos: r,
    moedas: Math.max(0, raw.moedas),
    moedasGanhas: Math.max(0, raw.moedasGanhas),
    rng: semente(raw.rng),
    itens,
    limiteInventario: Math.floor(raw.limiteInventario),
    proximoIdItem: Math.max(1, Math.floor(raw.proximoIdItem)),
    ferreiros,
    forja,
    fila,
    automatico: raw.automatico,
    ultimaReceita: raw.ultimaReceita,
  }
}

/** Aplica migrações em cadeia até a versão atual e valida. Null se não der. */
export function migrar(
  raw: unknown,
  migracoes: Migracoes = MIGRACOES,
  versaoAtual: number = SAVE_VERSION,
  validar: (r: unknown) => GameState | null = validarEstado,
): GameState | null {
  if (!ehObjeto(raw) || !ehNumero(raw.version)) return null
  let atual: SaveBruto = raw
  let versao = raw.version
  if (versao > versaoAtual) return null // save de uma versão futura
  while (versao < versaoAtual) {
    const passo = migracoes[versao]
    if (!passo) return null
    atual = passo(atual)
    versao++
  }
  return validar(atual)
}

export function serializar(s: GameState): string {
  return JSON.stringify(s)
}

export function desserializar(json: string): GameState | null {
  try {
    return migrar(JSON.parse(json))
  } catch {
    return null
  }
}
