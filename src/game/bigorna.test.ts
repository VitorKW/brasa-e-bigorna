import { describe, expect, it } from 'vitest'
import {
  FILA_MAX,
  abandonarMinigame,
  alternarAutomatico,
  avancarBigorna,
  forjar,
  iniciarTarefa,
  registrarBatida,
  removerDaFila,
  tempoForjaAtual,
  valorEsperadoItem,
} from './bigorna.ts'
import { zonasDe } from './batida.ts'
import { alocar, contratar } from './ferreiros.ts'
import { estadoInicial, type GameState } from './state.ts'

/** Bigorna nível 1, lingotes de sobra. */
const oficina = (mut: Partial<GameState> = {}): GameState => ({
  ...estadoInicial(0, 1234),
  moedas: 1e6,
  niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1 },
  recursos: { minerio: 0, carvao: 0, lingote: 100 },
  ...mut,
})

describe('iniciar a forja', () => {
  it('bloqueada (nível 0) não inicia', () => {
    const s = oficina({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 0 } })
    expect(forjar(s, 'espada')).toBe(s)
  })

  it('gasta os lingotes da receita e grava o sorteio ANTES do minigame', () => {
    const s = iniciarTarefa(oficina(), 'escudo', true)
    expect(s.recursos.lingote).toBe(96)
    expect(s.forja).not.toBeNull()
    expect(s.forja!.aleatorio).toBeGreaterThanOrEqual(0)
    expect(s.forja!.aleatorio).toBeLessThanOrEqual(20)
    expect(s.forja!.minigame).toBe('pendente')
    expect(s.rng).not.toBe(oficina().rng)
    expect(s.ultimaReceita).toBe('escudo')
  })

  it('anti-trapaça: abandonar o minigame não rerrola o aleatório', () => {
    const inicio = iniciarTarefa(oficina(), 'espada', true)
    const sorteio = inicio.forja!.aleatorio
    const reaberto = abandonarMinigame(inicio) // "fechou o app"
    expect(reaberto.forja!.aleatorio).toBe(sorteio)
    expect(reaberto.forja!.minigame).toBe('feito')
    expect(reaberto.forja!.batida).toBe('automatico')
    // sem segunda chance
    expect(registrarBatida(reaberto, zonasDe(reaberto.forja!.alvo).alvo)).toBe(reaberto)
  })

  it('mesmo estado + mesma receita = mesmo sorteio (determinismo)', () => {
    const a = iniciarTarefa(oficina(), 'espada', false)
    const b = iniciarTarefa(oficina(), 'espada', false)
    expect(a.forja).toEqual(b.forja)
    expect(a.rng).toBe(b.rng)
  })

  it('sem lingotes suficientes não inicia', () => {
    const s = oficina({ recursos: { minerio: 0, carvao: 0, lingote: 2 } })
    expect(forjar(s, 'espada')).toBe(s)
  })
})

describe('fila e modo automático', () => {
  it('ocupada: "forjar" enfileira até FILA_MAX; "com batida" não enfileira', () => {
    let s = forjar(oficina(), 'espada')
    expect(s.forja).not.toBeNull()
    expect(forjar(s, 'espada', true)).toBe(s)
    for (let i = 0; i < FILA_MAX + 2; i++) s = forjar(s, 'machado')
    expect(s.fila).toHaveLength(FILA_MAX)
    expect(removerDaFila(s, 0).fila).toHaveLength(FILA_MAX - 1)
    expect(removerDaFila(s, 99)).toBe(s)
  })

  it('a fila toca na ordem quando a tarefa acaba', () => {
    let s = forjar(oficina(), 'espada')
    s = forjar(s, 'escudo')
    s = forjar(s, 'armadura')
    const r = avancarBigorna(s, 10 + 12 + 20 + 1)
    expect(r.forjados.map((f) => f.item.tipo)).toEqual(['espada', 'escudo', 'armadura'])
    expect(r.estado.fila).toEqual([])
  })

  it('automático repete a última receita enquanto houver lingotes', () => {
    let s = forjar(oficina({ recursos: { minerio: 0, carvao: 0, lingote: 9 } }), 'espada')
    s = alternarAutomatico(s)
    const r = avancarBigorna(s, 1000)
    expect(r.forjados).toHaveLength(3) // 9 lingotes / 3
    expect(r.estado.recursos.lingote).toBe(0)
    expect(r.estado.forja).toBeNull()
  })

  it('sem automático e sem fila, a bigorna fica parada ao terminar', () => {
    const r = avancarBigorna(forjar(oficina(), 'espada'), 1000)
    expect(r.forjados).toHaveLength(1)
    expect(r.estado.forja).toBeNull()
  })

  it('um passo grande conclui várias tarefas (offline)', () => {
    let s = alternarAutomatico(forjar(oficina(), 'espada'))
    s = avancarBigorna(s, 0.0001).estado
    const r = avancarBigorna(s, 100)
    expect(r.forjados.length).toBeGreaterThanOrEqual(9)
    expect(r.forjados.length).toBeLessThanOrEqual(10)
  })

  it('o tempo respeita 0,92^(n−1): nível 3 forja espada em ~8,46 s', () => {
    const s = oficina({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 3 } })
    expect(tempoForjaAtual(s, 'espada')).toBeCloseTo(10 * 0.92 ** 2, 9)
  })
})

describe('inventário cheio', () => {
  it('não inicia nova tarefa com o inventário cheio', () => {
    const cheio = oficina({ limiteInventario: 1 })
    const um = avancarBigorna(forjar(cheio, 'espada'), 11).estado
    expect(um.itens).toHaveLength(1)
    expect(forjar(um, 'espada')).toBe(um)
  })

  it('automático para quando enche', () => {
    let s = alternarAutomatico(forjar(oficina({ limiteInventario: 2 }), 'espada'))
    s = avancarBigorna(s, 1000).estado
    expect(s.itens).toHaveLength(2)
    expect(s.forja).toBeNull()
    expect(s.recursos.lingote).toBe(100 - 6)
  })
})

describe('minigame na conclusão', () => {
  it('a tarefa espera o minigame pendente em 100 %', () => {
    const s = iniciarTarefa(oficina(), 'espada', true)
    const r = avancarBigorna(s, 50)
    expect(r.forjados).toHaveLength(0)
    expect(r.estado.forja!.progresso).toBe(1)
    const feito = registrarBatida(r.estado, r.estado.forja!.alvo)
    expect(feito.forja!.batida).toBe('perfeito')
    const fim = avancarBigorna(feito, 0.1)
    expect(fim.forjados).toHaveLength(1)
    expect(fim.forjados[0]!.batida).toBe('perfeito')
  })

  it('perfeito dá mais pontos que o automático com o mesmo sorteio', () => {
    const base = iniciarTarefa(oficina(), 'espada', true)
    const auto = avancarBigorna(abandonarMinigame(base), 11).forjados[0]!.item
    const perf = avancarBigorna(registrarBatida(base, base.forja!.alvo), 11).forjados[0]!.item
    expect(perf.pontuacao - auto.pontuacao).toBe(15) // +20 contra +5
  })

  it('erro (fora das zonas) vale o mesmo que o automático', () => {
    const base = iniciarTarefa(oficina(), 'espada', true)
    const longe = base.forja!.alvo > 0.5 ? 0 : 1
    const errou = avancarBigorna(registrarBatida(base, longe), 11).forjados[0]!.item
    const auto = avancarBigorna(abandonarMinigame(base), 11).forjados[0]!.item
    expect(errou.pontuacao).toBe(auto.pontuacao)
  })
})

describe('item forjado', () => {
  it('registra tipo, material, id sequencial, valor e ferreiro', () => {
    let s = alocar(contratar(oficina(), 'cida'), 'cida', 'bigorna')
    s = alternarAutomatico(forjar(s, 'machado'))
    const r = avancarBigorna(s, 25)
    const [a, b] = r.estado.itens
    expect(a).toMatchObject({ id: 1, tipo: 'machado', material: 'ferro', ferreiro: 'Dona Cida' })
    expect(b!.id).toBe(2)
    expect(a!.valor).toBeGreaterThanOrEqual(25)
  })

  it('sem ferreiro, "Você" forjou; com Cida o Q sobe 10', () => {
    const sem = avancarBigorna(forjar(oficina(), 'espada'), 11).estado.itens[0]!
    expect(sem.ferreiro).toBe('Você')
    const com = alocar(contratar(oficina(), 'cida'), 'cida', 'bigorna')
    const item = avancarBigorna(forjar(com, 'espada'), 11).estado.itens[0]!
    // mesma semente = mesmo aleatório; Cida soma 10 e o ferreiro nível 1 soma 2
    expect(item.pontuacao - sem.pontuacao).toBe(12)
  })

  it('ferreiro da bigorna ganha 1 XP por item', () => {
    const s = alocar(contratar(oficina(), 'cida'), 'cida', 'bigorna')
    const r = avancarBigorna(forjar(s, 'espada'), 11).estado
    expect(r.ferreiros.cida.xp).toBeCloseTo(1, 9)
  })

  it('Iara: item duplo quando o sorteio gravado diz sim; nunca sem Iara', () => {
    let achou = false
    for (let seed = 0; seed < 400 && !achou; seed++) {
      const base = oficina({ rng: seed })
      const iniciado = iniciarTarefa(base, 'espada', false)
      if (!iniciado.forja!.duplo) continue
      achou = true
      const semIara = avancarBigorna(iniciado, 11).estado
      expect(semIara.itens).toHaveLength(1)
      const comIara = alocar(contratar(base, 'iara'), 'iara', 'bigorna')
      const dobro = avancarBigorna(iniciarTarefa(comIara, 'espada', false), 11).estado
      expect(dobro.itens).toHaveLength(2)
      expect(dobro.itens[0]!.qualidade).toBe(dobro.itens[1]!.qualidade)
    }
    expect(achou).toBe(true)
  })

  it('Iara dá ~10 % de itens extras no longo prazo', () => {
    let s = alocar(contratar(oficina({ recursos: { minerio: 0, carvao: 0, lingote: 1e6 }, limiteInventario: 1e6 }), 'iara'), 'iara', 'bigorna')
    s = alternarAutomatico(forjar(s, 'espada'))
    const r = avancarBigorna(s, 10 * 2000)
    const tarefas = 2000
    expect(r.estado.itens.length / tarefas).toBeGreaterThan(1.06)
    expect(r.estado.itens.length / tarefas).toBeLessThan(1.14)
  })

  it('valor esperado cresce com a bigorna', () => {
    const baixo = oficina()
    const alto = oficina({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 40 } })
    expect(valorEsperadoItem(alto, 'espada')).toBeGreaterThan(valorEsperadoItem(baixo, 'espada'))
  })
})
