// Evolução visível (fatia 7): o que a arte mostra a partir do estado. Puro e testável.
// Estações mudam de cara a cada marco de nível (os mesmos 10/25/50/100 que dobram a produção) e ganham
// um nome novo; heróis vestem por cima o que estão usando.
import { NIVEIS_MARCO } from './constants.ts'
import type { Heroi } from './herois.ts'
import { QUALIDADES, type Qualidade } from './items.ts'

export type EstacaoVisual = 'mina' | 'carvoaria' | 'fornalha' | 'bigorna'

/** 0 = arte-base; 1 a 4 = marcos alcançados (camadas e1..e4, cumulativas). */
export function estagio(nivel: number): number {
  return NIVEIS_MARCO.filter((m) => nivel >= m).length
}

export const NOME_ESTAGIO: Record<EstacaoVisual, readonly [string, string, string, string, string]> = {
  mina: ['Mina', 'Mina escorada', 'Mina com trilhos', 'Mina de pedra lavrada', 'Mina real'],
  carvoaria: ['Carvoaria', 'Carvoaria de lenha farta', 'Carvoaria cintada', 'Carvoaria dupla', 'Carvoaria do mestre'],
  fornalha: ['Fornalha', 'Fornalha com fole', 'Fornalha de ferro batido', 'Fornalha alta', 'Alto-forno'],
  bigorna: ['Bigorna', 'Bigorna com ferramentas', 'Bigorna com tina', 'Bigorna de pedra', 'Bigorna do mestre'],
}

export function nomeEstagio(estacao: EstacaoVisual, nivel: number): string {
  return NOME_ESTAGIO[estacao][estagio(nivel)]!
}

/** Próximo marco que muda a arte, ou null no último estágio. */
export function proximoEstagio(nivel: number): number | null {
  return NIVEIS_MARCO.find((m) => m > nivel) ?? null
}

export type CamadaEstacao = `${EstacaoVisual}_e${1 | 2 | 3 | 4}`

export function camadasEstacao(estacao: EstacaoVisual, nivel: number): CamadaEstacao[] {
  const n = estagio(nivel)
  return ([1, 2, 3, 4] as const).filter((k) => k <= n).map((k) => `${estacao}_e${k}` as const)
}

export type CamadaHeroi =
  | `equip_armadura_${'ferro' | 'aco'}`
  | `equip_elmo_${'ferro' | 'aco'}`
  | `equip_escudo_${'ferro' | 'aco'}`
  | `equip_espada_${'ferro' | 'aco'}`
  | `equip_machado_${'ferro' | 'aco'}`

/** Camadas por cima do herói, de trás para a frente: armadura, elmo, escudo e arma. */
export function camadasHeroi(h: Pick<Heroi, 'equipamento'>): CamadaHeroi[] {
  const e = h.equipamento
  const out: CamadaHeroi[] = []
  if (e.armadura) out.push(`equip_armadura_${e.armadura.material}`)
  if (e.elmo) out.push(`equip_elmo_${e.elmo.material}`)
  if (e.escudo) out.push(`equip_escudo_${e.escudo.material}`)
  if (e.arma) out.push(e.arma.tipo === 'machado' ? `equip_machado_${e.arma.material}` : `equip_espada_${e.arma.material}`)
  return out
}

/** Melhor qualidade vestida (a aura do herói), ou null se só tem peças comuns ou nada. */
export function auraHeroi(h: Pick<Heroi, 'equipamento'>): Qualidade | null {
  let melhor = -1
  for (const item of Object.values(h.equipamento)) {
    if (item) melhor = Math.max(melhor, QUALIDADES.indexOf(item.qualidade))
  }
  return melhor >= QUALIDADES.indexOf('raro') ? QUALIDADES[melhor]! : null
}
