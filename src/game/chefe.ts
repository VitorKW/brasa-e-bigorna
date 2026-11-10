// Chefes (GDD §4.2): combate determinístico por rodadas. Sem sorteio nenhum: a previsão da UI
// é exatamente o que vai acontecer, e a função devolve o log para a UI fazer o replay.
import { atributosHeroi, emExpedicao, type ClasseId } from './herois.ts'
import { valorItem, type Item, type MaterialId, type Qualidade, type TipoItem } from './items.ts'
import type { GameState } from './state.ts'

export const CHEFES = ['golem'] as const
export type ChefeId = (typeof CHEFES)[number]

export interface DefChefe {
  nome: string
  pv: number
  atq: number
  def: number
  vel: number
  /** Recompensa da primeira vitória. */
  reputacao: number
  fragmentos: number
  presente: { tipo: TipoItem; material: MaterialId; qualidade: Qualidade; origem: string }
  /** Texto curto do que a vitória libera. */
  libera: string
}

export const COMBATE = {
  rodadasMax: 30,
} as const

export const DEF_CHEFE: Record<ChefeId, DefChefe> = {
  golem: {
    nome: 'Golem de Escória',
    // GDD §4.2: PV 2 000, ATQ 40, DEF 20. O PV foi ajustado pelo sim (ver GDD).
    pv: 1500,
    atq: 40,
    def: 20,
    vel: 8,
    reputacao: 100,
    fragmentos: 5,
    presente: { tipo: 'machado', material: 'ferro', qualidade: 'lendario', origem: 'Espólio do Golem' },
    libera: 'a Serra Cinzenta e o Forno de aço',
  },
}

export interface Combatente {
  /** 'h<id>' para heróis e o id do chefe para o chefe. */
  id: string
  nome: string
  lado: 'heroi' | 'chefe'
  classe?: ClasseId
  pv: number
  pvMax: number
  atq: number
  def: number
  vel: number
}

export interface EventoCombate {
  rodada: number
  ator: string
  alvo: string
  dano: number
  /** PV do alvo depois do golpe (nunca abaixo de 0). */
  pvAlvo: number
  derrubou: boolean
}

export interface ResultadoCombate {
  vitoria: boolean
  /** Rodadas jogadas (a última pode ter acabado no meio). */
  rodadas: number
  log: EventoCombate[]
  /** Estado inicial, para o replay desenhar as barras cheias. */
  equipe: Combatente[]
  chefe: Combatente
  pvChefeFinal: number
  sobreviventes: number
}

/** Dano = max(1, ATQ × 100 / (100 + DEF do alvo)), arredondado para o inteiro mais próximo. */
export function danoDe(atq: number, defAlvo: number): number {
  return Math.max(1, Math.round((atq * 100) / (100 + defAlvo)))
}

/**
 * Simula o combate. Em cada rodada todos os vivos agem por ordem de VEL (maior primeiro; no
 * empate, heróis antes do chefe e, entre heróis, a ordem da formação). Os heróis batem no chefe;
 * o chefe bate no primeiro herói vivo da formação. A equipe vem na ordem da formação.
 */
export function simularCombate(
  equipeInicial: readonly Combatente[],
  chefeInicial: Combatente,
  rodadasMax: number = COMBATE.rodadasMax,
): ResultadoCombate {
  const equipe = equipeInicial.map((c) => ({ ...c }))
  const chefe = { ...chefeInicial }
  const log: EventoCombate[] = []
  let rodada = 0

  const vivos = () => equipe.filter((c) => c.pv > 0)

  while (rodada < rodadasMax && chefe.pv > 0 && vivos().length > 0) {
    rodada++
    // Ordem fixa da rodada: sort estável por VEL; empate = heróis (na ordem da formação), depois o chefe.
    const ordem = [...equipe, chefe]
      .map((c, i) => ({ c, i }))
      .sort((a, b) => b.c.vel - a.c.vel || a.i - b.i)
      .map((x) => x.c)

    for (const ator of ordem) {
      if (ator.pv <= 0 || chefe.pv <= 0) continue
      const alvo = ator.lado === 'heroi' ? chefe : vivos()[0]
      if (!alvo) break
      const dano = danoDe(ator.atq, alvo.def)
      alvo.pv = Math.max(0, alvo.pv - dano)
      log.push({ rodada, ator: ator.id, alvo: alvo.id, dano, pvAlvo: alvo.pv, derrubou: alvo.pv <= 0 })
    }
  }

  return {
    vitoria: chefe.pv <= 0,
    rodadas: rodada,
    log,
    equipe: equipeInicial.map((c) => ({ ...c })),
    chefe: { ...chefeInicial },
    pvChefeFinal: chefe.pv,
    sobreviventes: vivos().length,
  }
}

export function combatenteChefe(id: ChefeId): Combatente {
  const d = DEF_CHEFE[id]
  return { id, nome: d.nome, lado: 'chefe', pv: d.pv, pvMax: d.pv, atq: d.atq, def: d.def, vel: d.vel }
}

/** Heróis livres (fora de expedição), em ordem de formação: maior DEF na frente, depois o id. */
export function equipeDisponivel(s: GameState): number[] {
  return s.herois
    .filter((h) => !emExpedicao(s, h.id))
    .map((h) => ({ id: h.id, def: atributosHeroi(h).def }))
    .sort((a, b) => b.def - a.def || a.id - b.id)
    .map((x) => x.id)
}

/** Monta a equipe do combate com os heróis pedidos (livres), na ordem de formação. */
export function montarEquipe(s: GameState, heroiIds: readonly number[]): Combatente[] {
  const escolhidos = s.herois.filter((h) => heroiIds.includes(h.id) && !emExpedicao(s, h.id))
  return escolhidos
    .map((h): Combatente => {
      const a = atributosHeroi(h)
      return { id: `h${h.id}`, nome: h.nome, lado: 'heroi', classe: h.classe, pv: a.pv, pvMax: a.pv, atq: a.atq, def: a.def, vel: a.vel }
    })
    .sort((a, b) => b.def - a.def || Number(a.id.slice(1)) - Number(b.id.slice(1)))
}

/** Previsão: o mesmo cálculo da luta, sem tocar no estado. */
export function preverChefe(s: GameState, chefe: ChefeId, heroiIds: readonly number[]): ResultadoCombate {
  return simularCombate(montarEquipe(s, heroiIds), combatenteChefe(chefe))
}

export interface RecompensaChefe {
  reputacao: number
  fragmentos: number
  presente: Item
}

/**
 * Luta de verdade. Derrota não custa nada (a equipe recua). Vitória na primeira vez dá
 * reputação, fragmentos e o item lendário de presente (entra mesmo com o inventário cheio),
 * e registra o chefe como derrotado (libera a região 2 e o Forno de aço).
 */
export function lutarChefe(
  s: GameState,
  chefe: ChefeId,
  heroiIds: readonly number[],
): { estado: GameState; resultado: ResultadoCombate; recompensa: RecompensaChefe | null } {
  const resultado = preverChefe(s, chefe, heroiIds)
  if (!resultado.vitoria || s.chefesDerrotados.includes(chefe) || resultado.equipe.length === 0) {
    return { estado: s, resultado, recompensa: null }
  }
  const def = DEF_CHEFE[chefe]
  const p = def.presente
  const presente: Item = {
    id: s.proximoIdItem,
    tipo: p.tipo,
    material: p.material,
    qualidade: p.qualidade,
    ferreiro: p.origem,
    valor: valorItem(p.tipo, p.material, p.qualidade),
    pontuacao: 90,
  }
  const estado: GameState = {
    ...s,
    chefesDerrotados: [...s.chefesDerrotados, chefe],
    reputacao: s.reputacao + def.reputacao,
    fragmentos: s.fragmentos + def.fragmentos,
    itens: [...s.itens, presente],
    proximoIdItem: s.proximoIdItem + 1,
  }
  return { estado, resultado, recompensa: { reputacao: def.reputacao, fragmentos: def.fragmentos, presente } }
}

export const chefeDerrotado = (s: GameState, chefe: ChefeId): boolean => s.chefesDerrotados.includes(chefe)

