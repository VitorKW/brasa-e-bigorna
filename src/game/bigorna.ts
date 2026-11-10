// Bigorna: tarefas de forja, fila, modo automático, minigame e conclusão do item.
// Tudo puro: o aleatório vem de `s.rng` e nunca de Math.random.
import { tempoForjaBase } from './constants.ts'
import { multProducaoGlobal } from './bonus.ts'
import { alvoDe, avaliarBatida, zonasDe } from './batida.ts'
import { FERREIRO, darXp, ferreiroEm, FERREIROS_DEF, multiplicadorEstacao, nivelFerreiroEm, passivasBigorna } from './ferreiros.ts'
import {
  ALEATORIO_MAX,
  RECEITAS,
  calcularQ,
  qualidadeDe,
  valorItem,
  type Item,
  type MaterialId,
  type ReceitaId,
  type ResultadoBatida,
} from './items.ts'
import { inteiro, proximo } from './rng.ts'
import type { Forja, GameState, PedidoForja } from './state.ts'

export const FILA_MAX = 5

/** Item recém-forjado, com o resultado da batida que o gerou (a UI usa para as faíscas). */
export interface Forjado {
  item: Item
  batida: ResultadoBatida
}

export type MotivoBloqueio = 'bloqueada' | 'ocupada' | 'sem-lingote' | 'sem-forno' | 'inventario-cheio'

export function inventarioCheio(s: GameState): boolean {
  return s.itens.length >= s.limiteInventario
}

/** Lingotes disponíveis do material (ferro = lingote de ferro, aço = lingote de aço). */
export function estoqueDe(s: GameState, material: MaterialId): number {
  return material === 'aco' ? s.recursos.aco : s.recursos.lingote
}

/** Segundos para forjar a receita com a bigorna e o ferreiro atuais. */
export function tempoForjaAtual(s: GameState, receita: ReceitaId): number {
  const base = tempoForjaBase(RECEITAS[receita].segundos, s.niveis.bigorna)
  return base / (multiplicadorEstacao(s, 'bigorna') * multProducaoGlobal(s))
}

/** Dá para começar agora? (ignora se já há tarefa; veja `forjar` para fila.) */
export function motivoParaNaoIniciar(
  s: GameState,
  receita: ReceitaId,
  material: MaterialId = 'ferro',
): MotivoBloqueio | null {
  if (s.niveis.bigorna < 1) return 'bloqueada'
  if (material === 'aco' && s.niveis.forno < 1) return 'sem-forno'
  if (s.forja) return 'ocupada'
  if (estoqueDe(s, material) < RECEITAS[receita].lingotes) return 'sem-lingote'
  if (inventarioCheio(s)) return 'inventario-cheio'
  return null
}

/**
 * Começa a tarefa: gasta os lingotes e sorteia TUDO (aleatório da qualidade, alvo do
 * minigame, segundo item da Iara) antes de qualquer interação do jogador. O sorteio é
 * gravado no estado, então fechar o app não permite "tentar de novo" (GDD §4.5).
 * Os 3 sorteios acontecem sempre, mesmo sem Iara, para trocar de ferreiro não "rerrolar".
 */
export function iniciarTarefa(
  s: GameState,
  receita: ReceitaId,
  comBatida: boolean,
  material: MaterialId = 'ferro',
): GameState {
  if (motivoParaNaoIniciar(s, receita, material) !== null) return s
  const a = inteiro(s.rng, ALEATORIO_MAX)
  const b = proximo(a.rng)
  const c = proximo(b.rng)
  const forja: Forja = {
    receita,
    material,
    progresso: 0,
    aleatorio: a.valor,
    alvo: alvoDe(b.valor),
    duplo: c.valor < FERREIRO.chanceDuplo, // só vale se a Iara estiver no posto na conclusão
    batida: 'automatico',
    minigame: comBatida ? 'pendente' : 'nenhum',
  }
  return {
    ...s,
    rng: c.rng,
    recursos:
      material === 'aco'
        ? { ...s.recursos, aco: s.recursos.aco - RECEITAS[receita].lingotes }
        : { ...s.recursos, lingote: s.recursos.lingote - RECEITAS[receita].lingotes },
    forja,
    ultimaReceita: receita,
    ultimoMaterial: material,
  }
}

/**
 * Ação do jogador. Com a bigorna livre começa já; ocupada, "Forjar" entra na fila.
 * "Com batida" só vale para começar agora (o overlay abre na hora), nunca na fila.
 */
export function forjar(
  s: GameState,
  receita: ReceitaId,
  comBatida = false,
  material: MaterialId = 'ferro',
): GameState {
  const motivo = motivoParaNaoIniciar(s, receita, material)
  if (motivo === null) return iniciarTarefa(s, receita, comBatida, material)
  if (motivo === 'ocupada' && !comBatida && s.fila.length < FILA_MAX) {
    return { ...s, fila: [...s.fila, { receita, material }], ultimaReceita: receita, ultimoMaterial: material }
  }
  return s
}

export function removerDaFila(s: GameState, indice: number): GameState {
  if (indice < 0 || indice >= s.fila.length) return s
  return { ...s, fila: s.fila.filter((_, i) => i !== indice) }
}

export function alternarAutomatico(s: GameState): GameState {
  return { ...s, automatico: !s.automatico }
}

/**
 * Registra o resultado do minigame. Só vale uma vez por tarefa e só enquanto está
 * 'pendente'. `posicao` nula = acabou o tempo.
 */
export function registrarBatida(s: GameState, posicao: number | null): GameState {
  const f = s.forja
  if (!f || f.minigame !== 'pendente') return s
  return { ...s, forja: { ...f, batida: avaliarBatida(posicao, zonasDe(f.alvo)), minigame: 'feito' } }
}

/** Minigame que ficou aberto (app fechado, offline): vale o automático. Sem segunda chance. */
export function abandonarMinigame(s: GameState): GameState {
  const f = s.forja
  if (!f || f.minigame !== 'pendente') return s
  return { ...s, forja: { ...f, minigame: 'feito' } }
}

/** Q que a tarefa dará hoje, com o ferreiro e a bigorna atuais. */
export function qualidadeDaTarefa(s: GameState, f: Forja): number {
  const p = passivasBigorna(s)
  return calcularQ({
    nivelFerreiro: nivelFerreiroEm(s, 'bigorna'),
    nivelBigorna: s.niveis.bigorna,
    material: f.material,
    batida: f.batida,
    aleatorio: f.aleatorio,
    bonusFixo: p.bonusFixo,
    multiplicador: p.multiplicador,
  })
}

/**
 * Conclui a tarefa em andamento. Devolve null se o inventário está cheio (a tarefa fica
 * esperando em 100 % até o jogador abrir espaço).
 */
export function concluir(s: GameState): { estado: GameState; forjados: Forjado[] } | null {
  const f = s.forja
  if (!f || inventarioCheio(s)) return null

  const q = qualidadeDaTarefa(s, f)
  const qualidade = qualidadeDe(q)
  const idFerreiro = ferreiroEm(s, 'bigorna')
  const molde = {
    tipo: f.receita,
    material: f.material,
    qualidade,
    ferreiro: idFerreiro ? FERREIROS_DEF[idFerreiro].nome : 'Você',
    valor: valorItem(f.receita, f.material, qualidade),
    pontuacao: q,
  }

  const novos: Item[] = [{ id: s.proximoIdItem, ...molde }]
  // Iara: o sorteio de 10 % foi gravado no início (`duplo`); aqui só conferimos o posto.
  if (f.duplo && passivasBigorna(s).chanceDuplo > 0 && s.itens.length + 1 < s.limiteInventario) {
    novos.push({ id: s.proximoIdItem + 1, ...molde })
  }

  let estado: GameState = {
    ...s,
    forja: null,
    itens: [...s.itens, ...novos],
    proximoIdItem: s.proximoIdItem + novos.length,
  }
  estado = darXp(estado, 'bigorna', 1)
  return { estado, forjados: novos.map((item) => ({ item, batida: f.batida })) }
}

function proximaDaFila(s: GameState): (PedidoForja & { daFila: boolean }) | null {
  const primeira = s.fila[0]
  if (primeira) return { ...primeira, daFila: true }
  if (s.automatico && s.ultimaReceita) {
    return { receita: s.ultimaReceita, material: s.ultimoMaterial, daFila: false }
  }
  return null
}

/**
 * Avança `dt` segundos da bigorna. Pode concluir várias tarefas num mesmo passo (bigorna
 * rápida, offline). Tarefa com minigame pendente espera em 100 %.
 */
export function avancarBigorna(
  s: GameState,
  dt: number,
): { estado: GameState; forjados: Forjado[] } {
  const forjados: Forjado[] = []
  if (s.niveis.bigorna < 1 || !(dt > 0)) return { estado: s, forjados }

  let est = s
  let restante = dt
  for (let guarda = 0; guarda < 10_000; guarda++) {
    if (!est.forja) {
      const prox = proximaDaFila(est)
      if (!prox || motivoParaNaoIniciar(est, prox.receita, prox.material) !== null) break
      est = iniciarTarefa(est, prox.receita, false, prox.material)
      if (prox.daFila) est = { ...est, fila: est.fila.slice(1) }
      continue
    }

    const f = est.forja
    if (f.progresso < 1) {
      if (restante <= 1e-9) break
      const tempo = tempoForjaAtual(est, f.receita)
      const falta = (1 - f.progresso) * tempo
      if (restante < falta) {
        est = { ...est, forja: { ...f, progresso: f.progresso + restante / tempo } }
        break
      }
      restante -= falta
      est = { ...est, forja: { ...f, progresso: 1 } }
      continue
    }

    if (f.minigame === 'pendente') break
    const r = concluir(est)
    if (!r) break // inventário cheio
    est = r.estado
    forjados.push(...r.forjados)
  }
  return { estado: est, forjados }
}

/** Valor médio de um item da receita hoje (média sobre os 21 aleatórios possíveis, no automático). */
export function valorEsperadoItem(s: GameState, receita: ReceitaId, material: MaterialId = 'ferro'): number {
  const p = passivasBigorna(s)
  let total = 0
  for (let a = 0; a <= ALEATORIO_MAX; a++) {
    const q = calcularQ({
      nivelFerreiro: nivelFerreiroEm(s, 'bigorna'),
      nivelBigorna: s.niveis.bigorna,
      material,
      batida: 'automatico',
      aleatorio: a,
      bonusFixo: p.bonusFixo,
      multiplicador: p.multiplicador,
    })
    total += valorItem(receita, material, qualidadeDe(q))
  }
  return (total / (ALEATORIO_MAX + 1)) * (1 + p.chanceDuplo)
}

/** Menor e maior Q possíveis hoje (aleatório 0 e 20), no automático. Para a dica da UI. */
export function faixaQ(s: GameState, material: MaterialId = 'ferro'): { min: number; max: number } {
  const p = passivasBigorna(s)
  const base = {
    nivelFerreiro: nivelFerreiroEm(s, 'bigorna'),
    nivelBigorna: s.niveis.bigorna,
    material,
    batida: 'automatico' as const,
    bonusFixo: p.bonusFixo,
    multiplicador: p.multiplicador,
  }
  return {
    min: calcularQ({ ...base, aleatorio: 0 }),
    max: calcularQ({ ...base, aleatorio: ALEATORIO_MAX }),
  }
}
