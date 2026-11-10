import { describe, expect, it } from 'vitest'
import {
  CLASSES,
  DEF_CLASSE,
  RECRUTAMENTO,
  atributosBase,
  atributosHeroi,
  darXpHeroi,
  desequipar,
  diferencaAtributos,
  equipar,
  poderBaseNivel,
  poderHeroi,
  proximaVaga,
  recrutar,
  xpParaNivel,
  type Heroi,
} from './herois.ts'
import { atributosItem, type Item } from './items.ts'
import { estadoInicial, type GameState } from './state.ts'

const item = (
  id: number,
  tipo: Item['tipo'],
  qualidade: Item['qualidade'] = 'comum',
  material: Item['material'] = 'ferro',
): Item => ({ id, tipo, material, qualidade, ferreiro: 'Você', valor: 10, pontuacao: 10 })

/** Estado com 1 guerreiro e os itens dados no inventário. */
function comHeroi(itens: Item[] = [], mut: Partial<GameState> = {}): GameState {
  const s = estadoInicial(0, 5)
  return recrutar({ ...s, moedas: 1e6, itens, proximoIdItem: 100, ...mut }, 'guerreiro')
}

describe('atributos do herói', () => {
  it('poder base: 20 × 1,12^(n−1)', () => {
    expect(poderBaseNivel(1)).toBe(20)
    expect(poderBaseNivel(2)).toBeCloseTo(22.4, 6)
    expect(poderBaseNivel(10)).toBeCloseTo(20 * Math.pow(1.12, 9), 6)
  })

  it('os pesos de cada classe somam 1', () => {
    for (const c of CLASSES) {
      const p = DEF_CLASSE[c].pesos
      expect(p.atq + p.def + p.pv).toBeCloseTo(1, 9)
    }
  })

  it('no nível 1 sem itens, o poder de expedição ≈ poder base × fator da classe', () => {
    for (const c of CLASSES) {
      const poder = poderHeroi({ classe: c, nivel: 1, equipamento: { arma: null, escudo: null, armadura: null, elmo: null } })
      expect(poder).toBeCloseTo(20 * DEF_CLASSE[c].fatorPoder, 0)
    }
  })

  it('cada classe puxa para o seu atributo', () => {
    const g = atributosBase('guerreiro', 5)
    const d = atributosBase('guardia', 5)
    const b = atributosBase('batedor', 5)
    expect(g.atq).toBeGreaterThan(d.atq)
    expect(d.def).toBeGreaterThan(g.def)
    expect(d.pv).toBeGreaterThan(g.pv)
    expect(b.vel).toBeGreaterThan(g.vel)
    expect(g.vel).toBeGreaterThan(d.vel)
  })

  it('itens somam aos atributos conforme tipo, material e qualidade', () => {
    const base = atributosBase('guerreiro', 1)
    const h: Pick<Heroi, 'classe' | 'nivel' | 'equipamento'> = {
      classe: 'guerreiro',
      nivel: 1,
      equipamento: {
        arma: item(1, 'espada', 'raro'),
        escudo: null,
        armadura: item(2, 'armadura', 'comum', 'aco'),
        elmo: null,
      },
    }
    const a = atributosHeroi(h)
    const espada = atributosItem(h.equipamento.arma!)
    const armadura = atributosItem(h.equipamento.armadura!)
    expect(a.atq).toBe(base.atq + espada.atq)
    expect(a.pv).toBe(base.pv + armadura.pv)
    expect(a.def).toBe(base.def + armadura.def)
    expect(a.vel).toBe(base.vel + espada.vel)
  })

  it('qualidade e material multiplicam os atributos do item (raro x2,5; aço x4)', () => {
    const comum = atributosItem(item(1, 'machado'))
    expect(atributosItem(item(1, 'machado', 'raro')).atq).toBe(Math.round(comum.atq * 2.5))
    expect(atributosItem(item(1, 'machado', 'comum', 'aco')).atq).toBe(comum.atq * 4)
    expect(atributosItem(item(1, 'machado', 'lendario', 'aco')).atq).toBe(comum.atq * 28)
  })

  it('espada dá ATQ, escudo dá DEF, armadura dá PV e DEF', () => {
    expect(atributosItem(item(1, 'espada')).atq).toBeGreaterThan(0)
    expect(atributosItem(item(1, 'escudo')).def).toBeGreaterThan(0)
    const a = atributosItem(item(1, 'armadura'))
    expect(a.pv).toBeGreaterThan(0)
    expect(a.def).toBeGreaterThan(0)
  })
})

describe('XP e nível', () => {
  it('XP para o próximo nível: 50 × 1,25^(n−1)', () => {
    expect(xpParaNivel(1)).toBe(50)
    expect(xpParaNivel(2)).toBeCloseTo(62.5, 6)
    expect(xpParaNivel(3)).toBeCloseTo(78.125, 6)
  })

  it('sobe vários níveis de uma vez e guarda o resto', () => {
    const s = comHeroi()
    const h = darXpHeroi(s.herois[0]!, 50 + 62.5 + 10)
    expect(h.nivel).toBe(3)
    expect(h.xp).toBeCloseTo(10, 6)
  })

  it('XP zero ou negativo não muda nada', () => {
    const h = comHeroi().herois[0]!
    expect(darXpHeroi(h, 0)).toBe(h)
    expect(darXpHeroi(h, -3)).toBe(h)
  })
})

describe('equipar e desequipar', () => {
  it('equipar tira o item do inventário e põe no espaço certo', () => {
    const s = equipar(comHeroi([item(1, 'machado')]), 1, 1)
    expect(s.itens).toHaveLength(0)
    expect(s.herois[0]!.equipamento.arma?.id).toBe(1)
  })

  it('trocar devolve o item anterior ao inventário (sem mudar o tamanho)', () => {
    let s = equipar(comHeroi([item(1, 'espada'), item(2, 'machado')]), 1, 1)
    expect(s.itens.map((i) => i.id)).toEqual([2])
    s = equipar(s, 1, 2)
    expect(s.herois[0]!.equipamento.arma?.id).toBe(2)
    expect(s.itens.map((i) => i.id)).toEqual([1])
  })

  it('espada e machado disputam o mesmo espaço; elmo e armadura são espaços separados', () => {
    let s = comHeroi([item(1, 'espada'), item(2, 'machado'), item(3, 'armadura'), item(4, 'elmo')])
    s = equipar(equipar(equipar(equipar(s, 1, 1), 1, 2), 1, 3), 1, 4)
    const e = s.herois[0]!.equipamento
    expect(e.arma?.id).toBe(2)
    expect(e.armadura?.id).toBe(3)
    expect(e.elmo?.id).toBe(4)
    expect(s.itens.map((i) => i.id)).toEqual([1])
  })

  it('desequipar devolve ao inventário, se houver espaço', () => {
    let s = equipar(comHeroi([item(1, 'escudo')]), 1, 1)
    const cheio = { ...s, limiteInventario: 0 }
    expect(desequipar(cheio, 1, 'escudo')).toBe(cheio)
    s = desequipar(s, 1, 'escudo')
    expect(s.herois[0]!.equipamento.escudo).toBeNull()
    expect(s.itens.map((i) => i.id)).toEqual([1])
  })

  it('herói em expedição não troca de equipamento', () => {
    const base = equipar(comHeroi([item(1, 'espada'), item(2, 'escudo')]), 1, 1)
    const fora: GameState = {
      ...base,
      expedicoes: [
        { id: 1, heroi: 1, tipo: 'trilha', inicio: 0, fim: 1000, sucesso: true, chance: 0.5, moedas: 1, xp: 1, reputacao: 5, fragmentos: 0 },
      ],
    }
    expect(equipar(fora, 1, 2)).toBe(fora)
    expect(desequipar(fora, 1, 'arma')).toBe(fora)
  })

  it('item inexistente ou herói inexistente não faz nada', () => {
    const s = comHeroi([item(1, 'espada')])
    expect(equipar(s, 1, 99)).toBe(s)
    expect(equipar(s, 9, 1)).toBe(s)
  })

  it('a diferença mostra o ganho (+) e a perda (−) em relação ao item atual', () => {
    const s = equipar(comHeroi([item(1, 'machado', 'raro'), item(2, 'espada')]), 1, 1)
    const d = diferencaAtributos(s.herois[0]!, s.itens[0]!)
    expect(d.atq).toBeLessThan(0)
    expect(d.vel).toBeGreaterThan(0)
    const novo = diferencaAtributos(comHeroi([item(3, 'escudo')]).herois[0]!, item(3, 'escudo'))
    expect(novo.def).toBe(atributosItem(item(3, 'escudo')).def)
  })
})

describe('recrutamento', () => {
  it('o 1º herói custa moedas', () => {
    const s = estadoInicial(0)
    expect(proximaVaga(s)?.condicao.tipo).toBe('moedas')
    expect(recrutar({ ...s, moedas: RECRUTAMENTO.custoPrimeiro - 1 }, 'guerreiro').herois).toHaveLength(0)
    const r = recrutar({ ...s, moedas: RECRUTAMENTO.custoPrimeiro + 5 }, 'batedor')
    expect(r.herois).toHaveLength(1)
    expect(r.moedas).toBe(5)
    expect(r.herois[0]).toMatchObject({ classe: 'batedor', nivel: 1, xp: 0, id: 1 })
  })

  it('o 2º herói chega com 150 de reputação, sem custo em moedas', () => {
    const um = { ...comHeroi(), moedas: 0 }
    expect(proximaVaga({ ...um, reputacao: 149 })?.liberada).toBe(false)
    expect(recrutar({ ...um, reputacao: 149 }, 'guardia').herois).toHaveLength(1)
    const dois = recrutar({ ...um, reputacao: 150 }, 'guardia')
    expect(dois.herois).toHaveLength(2)
    expect(dois.moedas).toBe(0)
    expect(dois.herois[1]!.id).toBe(2)
  })

  it('o 3º herói chega ao derrotar o Golem; o 4º espera a Taverna', () => {
    let s = comHeroi([], { reputacao: 150 })
    s = recrutar(s, 'guardia')
    expect(proximaVaga(s)?.condicao.tipo).toBe('chefe')
    expect(recrutar(s, 'batedor').herois).toHaveLength(2)
    s = recrutar({ ...s, chefesDerrotados: ['golem'] }, 'batedor')
    expect(s.herois).toHaveLength(3)
    const quarta = proximaVaga(s)
    expect(quarta?.condicao.tipo).toBe('taverna')
    expect(quarta?.liberada).toBe(false)
    expect(recrutar(s, 'guerreiro').herois).toHaveLength(3)
  })

  it('nomes não se repetem e são da classe', () => {
    let s = comHeroi([], { reputacao: 150 })
    s = recrutar(s, 'guerreiro')
    expect(new Set(s.herois.map((h) => h.nome)).size).toBe(2)
    expect(DEF_CLASSE.guerreiro.nomes).toContain(s.herois[1]!.nome)
  })
})
