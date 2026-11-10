import { describe, expect, it } from 'vitest'
import {
  COMBATE,
  DEF_CHEFE,
  combatenteChefe,
  chefeDisponivel,
  danoDe,
  equipeDisponivel,
  lutarChefe,
  montarEquipe,
  preverChefe,
  simularCombate,
  type Combatente,
} from './chefe.ts'
import { equipar, recrutar } from './herois.ts'
import type { Item } from './items.ts'
import { estadoInicial, type GameState } from './state.ts'

const heroi = (id: string, o: Partial<Combatente> = {}): Combatente => ({
  id,
  nome: id,
  lado: 'heroi',
  pv: 100,
  pvMax: 100,
  atq: 10,
  def: 0,
  vel: 10,
  ...o,
})

const boss = (o: Partial<Combatente> = {}): Combatente => ({
  id: 'chefe',
  nome: 'Chefe',
  lado: 'chefe',
  pv: 100,
  pvMax: 100,
  atq: 10,
  def: 0,
  vel: 5,
  ...o,
})

describe('dano', () => {
  it('max(1, ATQ × 100 / (100 + DEF))', () => {
    expect(danoDe(40, 0)).toBe(40)
    expect(danoDe(40, 100)).toBe(20)
    expect(danoDe(100, 20)).toBe(83)
    expect(danoDe(1, 1000)).toBe(1) // piso de 1
    expect(danoDe(0, 0)).toBe(1)
  })
})

describe('simularCombate', () => {
  it('é determinístico: mesma entrada, mesmo log', () => {
    const eq = [heroi('h1', { atq: 30 }), heroi('h2', { atq: 25, vel: 12 })]
    const a = simularCombate(eq, boss({ pv: 400, pvMax: 400 }))
    const b = simularCombate(eq, boss({ pv: 400, pvMax: 400 }))
    expect(b).toEqual(a)
  })

  it('não muta os combatentes de entrada', () => {
    const eq = [heroi('h1')]
    const b = boss()
    const copia = structuredClone({ eq, b })
    simularCombate(eq, b)
    expect({ eq, b }).toEqual(copia)
  })

  it('vitória: o chefe cai e o log termina no golpe final', () => {
    const r = simularCombate([heroi('h1', { atq: 50 })], boss({ pv: 100, pvMax: 100 }))
    expect(r.vitoria).toBe(true)
    expect(r.rodadas).toBe(2)
    expect(r.pvChefeFinal).toBe(0)
    const ultimo = r.log[r.log.length - 1]!
    expect(ultimo).toMatchObject({ ator: 'h1', alvo: 'chefe', derrubou: true, pvAlvo: 0 })
  })

  it('ordem por VEL: o mais rápido age primeiro; empate, o herói antes do chefe', () => {
    const r = simularCombate(
      [heroi('lento', { vel: 5 }), heroi('rapido', { vel: 20 })],
      boss({ vel: 10, pv: 1000, pvMax: 1000 }),
      1,
    )
    expect(r.log.map((e) => e.ator)).toEqual(['rapido', 'chefe', 'lento'])
    const empate = simularCombate([heroi('h1', { vel: 5 })], boss({ vel: 5, pv: 1000, pvMax: 1000 }), 1)
    expect(empate.log.map((e) => e.ator)).toEqual(['h1', 'chefe'])
  })

  it('o chefe bate no primeiro herói vivo da formação', () => {
    const r = simularCombate(
      [heroi('frente', { pv: 20, pvMax: 20 }), heroi('tras')],
      boss({ atq: 30, pv: 1000, pvMax: 1000 }),
      3,
    )
    const golpes = r.log.filter((e) => e.ator === 'chefe')
    expect(golpes[0]!.alvo).toBe('frente')
    expect(golpes[0]!.derrubou).toBe(true)
    expect(golpes[1]!.alvo).toBe('tras')
  })

  it('derrota por tempo: no máximo 30 rodadas, o chefe sobrevive e a equipe recua', () => {
    const r = simularCombate([heroi('h1', { pv: 1e6, pvMax: 1e6, atq: 1 })], boss({ pv: 1e6, pvMax: 1e6, atq: 1 }))
    expect(r.vitoria).toBe(false)
    expect(r.rodadas).toBe(COMBATE.rodadasMax)
    expect(r.sobreviventes).toBe(1)
  })

  it('derrota por queda da equipe inteira', () => {
    const r = simularCombate([heroi('h1', { pv: 10, pvMax: 10 })], boss({ atq: 100, pv: 1e6, pvMax: 1e6 }))
    expect(r.vitoria).toBe(false)
    expect(r.sobreviventes).toBe(0)
    expect(r.rodadas).toBeLessThan(COMBATE.rodadasMax)
  })

  it('cada evento do log tem o PV do alvo coerente', () => {
    const r = simularCombate([heroi('h1', { atq: 20 })], boss({ pv: 100, pvMax: 100 }))
    let pv = 100
    for (const e of r.log.filter((x) => x.alvo === 'chefe')) {
      pv = Math.max(0, pv - e.dano)
      expect(e.pvAlvo).toBe(pv)
    }
  })
})

const item = (
  id: number,
  tipo: Item['tipo'],
  qualidade: Item['qualidade'],
  material: Item['material'] = 'ferro',
): Item => ({ id, tipo, material, qualidade, ferreiro: 'x', valor: 1, pontuacao: 1 })

function comEquipe(): GameState {
  let s: GameState = { ...estadoInicial(0, 3), moedas: 1e6, reputacao: 150, chefesDerrotados: [] }
  s = recrutar(s, 'guerreiro')
  s = recrutar(s, 'guardia')
  return s
}

describe('Golem de Escória', () => {
  it('tem os números do GDD (ATQ 40, DEF 20) e PV ajustado pelo sim', () => {
    expect(DEF_CHEFE.golem).toMatchObject({ atq: 40, def: 20, reputacao: 100, fragmentos: 5 })
    expect(DEF_CHEFE.golem.pv).toBeGreaterThan(0)
    expect(combatenteChefe('golem').pvMax).toBe(DEF_CHEFE.golem.pv)
  })

  it('heróis sem equipamento recuam, sem perder nada', () => {
    const s = comEquipe()
    const { estado, resultado, recompensa } = lutarChefe(s, 'golem', [1, 2])
    expect(resultado.vitoria).toBe(false)
    expect(recompensa).toBeNull()
    expect(estado).toBe(s)
  })

  it('a previsão é exatamente o que acontece', () => {
    let s = comEquipe()
    s = {
      ...s,
      itens: [item(1, 'machado', 'lendario', 'aco'), item(2, 'armadura', 'lendario', 'aco'), item(3, 'escudo', 'epico', 'aco')],
    }
    s = equipar(equipar(equipar(s, 1, 1), 2, 2), 2, 3)
    const previsao = preverChefe(s, 'golem', [1, 2])
    const real = lutarChefe(s, 'golem', [1, 2])
    expect(real.resultado).toEqual(previsao)
    expect(previsao.vitoria).toBe(true)
  })

  it('vitória dá reputação, fragmentos e um lendário de presente, e libera a região 2', () => {
    let s = comEquipe()
    s = { ...s, itens: [item(1, 'machado', 'lendario', 'aco'), item(2, 'armadura', 'lendario', 'aco')] }
    s = equipar(equipar(s, 1, 1), 2, 2)
    const r = lutarChefe(s, 'golem', [1, 2])
    expect(r.resultado.vitoria).toBe(true)
    expect(r.estado.chefesDerrotados).toContain('golem')
    expect(r.estado.reputacao).toBe(s.reputacao + 100)
    expect(r.estado.fragmentos).toBe(s.fragmentos + 5)
    const presente = r.estado.itens.find((i) => i.id === r.recompensa!.presente.id)!
    expect(presente.qualidade).toBe('lendario')
    expect(r.estado.proximoIdItem).toBe(s.proximoIdItem + 1)
  })

  it('a recompensa só vem na primeira vitória e entra mesmo com o inventário cheio', () => {
    let s = comEquipe()
    s = {
      ...s,
      itens: [item(1, 'machado', 'lendario', 'aco'), item(2, 'armadura', 'lendario', 'aco')],
      limiteInventario: 0,
    }
    s = equipar(equipar(s, 1, 1), 2, 2)
    const r = lutarChefe(s, 'golem', [1, 2])
    expect(r.estado.itens).toHaveLength(1)
    const deNovo = lutarChefe(r.estado, 'golem', [1, 2])
    expect(deNovo.recompensa).toBeNull()
    expect(deNovo.estado).toBe(r.estado)
  })

  it('a formação põe quem tem mais DEF na frente; herói em expedição não luta', () => {
    let s = comEquipe()
    expect(montarEquipe(s, [1, 2]).map((c) => c.nome)[0]).toBe(s.herois[1]!.nome) // guardiã (DEF maior)
    expect(equipeDisponivel(s)).toEqual([2, 1])
    s = {
      ...s,
      expedicoes: [
        { id: 1, heroi: 2, tipo: 'trilha', inicio: 0, fim: 1, sucesso: true, chance: 1, moedas: 0, xp: 0, reputacao: 0, fragmentos: 0 },
      ],
    }
    expect(montarEquipe(s, [1, 2])).toHaveLength(1)
    expect(equipeDisponivel(s)).toEqual([1])
  })

  it('sem heróis livres não há vitória nem recompensa', () => {
    const s = { ...estadoInicial(0), chefesDerrotados: [] }
    const r = lutarChefe(s, 'golem', [])
    expect(r.resultado.vitoria).toBe(false)
    expect(r.estado).toBe(s)
  })
})

describe('Serpe de Cinza', () => {
  /** Heróis com escudo, armadura e elmo épicos de aço e arma lendária de aço (o kit do sim por volta de 24 h); o Golem já caiu. */
  function equipeDeAco(quantos: number): GameState {
    let s: GameState = {
      ...estadoInicial(0, 3),
      moedas: 1e6,
      reputacao: 400,
      chefesDerrotados: ['golem'],
      construcoes: ['taverna'],
      limiteInventario: 100,
    }
    for (let i = 0; i < quantos; i++) s = recrutar(s, (['guerreiro', 'guardia', 'batedor', 'guerreiro'] as const)[i]!)
    let id = 1
    for (const h of s.herois) {
      const kit: Item['tipo'][] = ['machado', 'escudo', 'armadura', 'elmo']
      for (const tipo of kit) {
        s = { ...s, itens: [...s.itens, item(id, tipo, tipo === 'machado' ? 'lendario' : 'epico', 'aco')] }
        s = equipar(s, h.id, id)
        id++
      }
    }
    return { ...s, proximoIdItem: id }
  }

  it('tem DEF 120 do GDD, com ATQ, PV e VEL ajustados pelo sim (fatia 5: ela pesa)', () => {
    expect(DEF_CHEFE.serpe).toMatchObject({ def: 120, exige: 'golem' })
    expect(DEF_CHEFE.serpe.atq).toBeGreaterThanOrEqual(3000)
    expect(DEF_CHEFE.serpe.pv).toBeGreaterThanOrEqual(25_000)
    expect(DEF_CHEFE.serpe.vel).toBeGreaterThan(0)
    expect(combatenteChefe('serpe').pvMax).toBe(DEF_CHEFE.serpe.pv)
    expect(DEF_CHEFE.serpe.libera).toContain('Muralha')
  })

  it('só pode ser enfrentada depois do Golem', () => {
    const s = { ...equipeDeAco(4), chefesDerrotados: [] }
    expect(chefeDisponivel(s, 'serpe')).toBe(false)
    const r = lutarChefe(s, 'serpe', [1, 2, 3, 4])
    expect(r.recompensa).toBeNull()
    expect(r.estado).toBe(s)
    expect(chefeDisponivel({ ...s, chefesDerrotados: ['golem'] }, 'serpe')).toBe(true)
  })

  it('heróis fracos recuam sem perder nada (derrota não custa)', () => {
    let s: GameState = { ...estadoInicial(0, 3), moedas: 1e6, reputacao: 400, chefesDerrotados: ['golem'] }
    s = recrutar(recrutar(s, 'guerreiro'), 'guardia')
    const r = lutarChefe(s, 'serpe', [1, 2])
    expect(r.resultado.vitoria).toBe(false)
    expect(r.estado).toBe(s)
  })

  it('o kit de 3 heróis não derruba a Serpe em 30 rodadas, o de 4 sim (a Taverna decide)', () => {
    const tres = preverChefe(equipeDeAco(3), 'serpe', [1, 2, 3])
    expect(tres.vitoria).toBe(false)
    const quatro = preverChefe(equipeDeAco(4), 'serpe', [1, 2, 3, 4])
    expect(quatro.vitoria).toBe(true)
    expect(quatro.rodadas).toBeLessThanOrEqual(COMBATE.rodadasMax)
  })

  it('a Serpe pesa: com 3 heróis o grupo todo cai, e mesmo vencendo com 4 ela derruba alguém', () => {
    const tres = preverChefe(equipeDeAco(3), 'serpe', [1, 2, 3])
    expect(tres.sobreviventes).toBe(0)
    const quatro = preverChefe(equipeDeAco(4), 'serpe', [1, 2, 3, 4])
    expect(quatro.sobreviventes).toBeLessThan(4)
    expect(quatro.sobreviventes).toBeGreaterThan(0)
  })

  it('vitória dá 150 de reputação, 10 fragmentos e uma armadura lendária de aço, e registra o chefe', () => {
    const s = equipeDeAco(4)
    const r = lutarChefe(s, 'serpe', [1, 2, 3, 4])
    expect(r.resultado.vitoria).toBe(true)
    expect(r.estado.chefesDerrotados).toEqual(['golem', 'serpe'])
    expect(r.estado.reputacao).toBe(s.reputacao + 150)
    expect(r.estado.fragmentos).toBe(s.fragmentos + 10)
    const presente = r.estado.itens.find((i) => i.id === r.recompensa!.presente.id)!
    expect(presente).toMatchObject({ tipo: 'armadura', material: 'aco', qualidade: 'lendario' })
    // a previsão é exatamente o que aconteceu
    expect(r.resultado).toEqual(preverChefe(s, 'serpe', [1, 2, 3, 4]))
    // e a recompensa não se repete
    expect(lutarChefe(r.estado, 'serpe', [1, 2, 3, 4]).recompensa).toBeNull()
  })
})
