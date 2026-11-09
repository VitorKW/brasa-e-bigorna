import { ESTACOES, RECURSOS, SAVE_VERSION } from './constants.ts'
import type { GameState } from './state.ts'

type SaveBruto = Record<string, unknown>
/** Cada migração leva o save da versão N para N+1. */
export type Migracoes = Record<number, (raw: SaveBruto) => SaveBruto>

/**
 * Registro de migrações. Ao mudar o formato, suba SAVE_VERSION e adicione
 * `[versaoAntiga]: (raw) => ({ ...raw, version: versaoAntiga + 1, ... })`.
 */
export const MIGRACOES: Migracoes = {}

const ehNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const ehObjeto = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

/** Valida o formato atual e corrige o que dá para corrigir. Null = corrompido. */
export function validarEstado(raw: unknown): GameState | null {
  if (!ehObjeto(raw) || raw.version !== SAVE_VERSION) return null
  const { niveis, recursos } = raw
  if (!ehObjeto(niveis) || !ehObjeto(recursos)) return null
  if (!ehNumero(raw.lastTick) || !ehNumero(raw.moedas) || !ehNumero(raw.moedasGanhas)) return null

  const n = {} as GameState['niveis']
  for (const e of ESTACOES) {
    const v = niveis[e]
    if (!ehNumero(v) || v < 1) return null
    n[e] = Math.floor(v)
  }
  const r = {} as GameState['recursos']
  for (const k of RECURSOS) {
    const v = recursos[k]
    if (!ehNumero(v) || v < 0) return null
    r[k] = v
  }
  return {
    version: SAVE_VERSION,
    lastTick: raw.lastTick,
    niveis: n,
    recursos: r,
    moedas: Math.max(0, raw.moedas),
    moedasGanhas: Math.max(0, raw.moedasGanhas),
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
