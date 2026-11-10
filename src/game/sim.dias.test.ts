import { describe, expect, it } from 'vitest'
import { aplicarConquistas } from './conquistas.ts'
import { OPCOES_DIAS, PADRAO_REALISTA, presenteEm, proximaPresenca, simular } from './sim.ts'

const H = 3600

// Metas de dias do GDD §4.4. Fica em arquivo próprio para rodar em paralelo com sim.test.ts.
describe('padrão de jogador por dias', () => {
  it('as primeiras horas são contínuas; depois, 5 min de sessão a cada 90 min nas 16 h acordado', () => {
    const p = PADRAO_REALISTA
    expect(presenteEm(p, 0)).toBe(true)
    expect(presenteEm(p, 1.9 * H)).toBe(true) // ainda no começo contínuo
    expect(presenteEm(p, 2.5 * H)).toBe(false) // entre sessões
    expect(presenteEm(p, 3 * H)).toBe(true) // 3 h = 2 × 90 min
    expect(presenteEm(p, 3 * H + 4 * 60)).toBe(true)
    expect(presenteEm(p, 3 * H + 6 * 60)).toBe(false)
    expect(presenteEm(p, 17 * H)).toBe(false) // dormindo
    expect(presenteEm(p, 24 * H)).toBe(true) // acordou
    expect(presenteEm(p, 24 * H + 100 * 60)).toBe(false)
  })

  it('a próxima presença respeita o sono e o começo de ciclo', () => {
    const p = PADRAO_REALISTA
    expect(proximaPresenca(p, 2.5 * H)).toBe(3 * H)
    expect(proximaPresenca(p, 15.5 * H)).toBe(24 * H) // depois da última sessão, só no dia seguinte
    expect(proximaPresenca(p, 30 * H)).toBe(30 * H)
    // um ciclo que começou em t = 50 h joga 2 h sem parar
    expect(presenteEm(p, 51 * H, 50 * H)).toBe(true)
    expect(presenteEm(p, 52.2 * H, 50 * H)).toBe(false)
  })
})

describe('ritmo por dias (sim com padrão realista, até o 2º Reforjar)', () => {
  const r = simular(240, 1, OPCOES_DIAS)
  const [primeiro, segundo] = r.reforjas
  const marcoRep = (m: number) => r.reputacaoMarcos.find((x) => x.minimo === m)!.t

  it('reputação: 150 em 30 a 60 min, 400 em algumas horas, 650 e 1 000 perto da Serpe', () => {
    expect(marcoRep(150)!).toBeGreaterThanOrEqual(30 * 60)
    expect(marcoRep(150)!).toBeLessThanOrEqual(60 * 60)
    expect(marcoRep(400)!).toBeGreaterThanOrEqual(1.5 * H)
    expect(marcoRep(400)!).toBeLessThanOrEqual(6 * H)
    expect(marcoRep(650)!).toBeGreaterThanOrEqual(8 * H)
    expect(marcoRep(650)!).toBeLessThanOrEqual(20 * H)
    expect(marcoRep(1000)!).toBeGreaterThanOrEqual(18 * H)
    expect(marcoRep(1000)!).toBeLessThanOrEqual(36 * H)
  })

  it('Chefe 2 (Serpe de Cinza) cai entre 18 e 30 h, depois do Golem, com folga de rodadas', () => {
    expect(r.golemDerrotado).not.toBeNull()
    expect(r.serpeDerrotada).not.toBeNull()
    expect(r.serpeDerrotada!).toBeGreaterThanOrEqual(18 * H)
    expect(r.serpeDerrotada!).toBeLessThanOrEqual(30 * H)
    expect(r.serpeDerrotada!).toBeGreaterThan(r.golemDerrotado!)
    expect(r.rodadasDaSerpe!).toBeLessThanOrEqual(30)
  })

  it('as construções saem na ordem da reputação e a Muralha vem logo depois da Serpe', () => {
    const c = r.construcoes
    for (const t of Object.values(c)) expect(t).not.toBeNull()
    expect(c.segunda_fornalha!).toBeLessThan(c.armazem!)
    expect(c.armazem!).toBeLessThan(c.taverna!)
    expect(c.taverna!).toBeLessThanOrEqual(c.mercado!)
    expect(c.muralha!).toBeGreaterThan(r.serpeDerrotada!)
    // a espera vazia entre a Serpe e a Muralha era de 27 h (fatia 4); agora cabe em meio dia
    expect(c.muralha! - r.serpeDerrotada!).toBeLessThanOrEqual(12 * H)
    // a Taverna abre o 4º herói
    expect(r.quartoHeroi! - c.taverna!).toBeLessThan(5)
    // o Armazém e a Segunda fornalha são das primeiras horas
    expect(c.armazem!).toBeLessThan(2 * H)
  })

  it('primeiro Reforjar entre 2 e 4 dias, rendendo de 5 a 15 brasas', () => {
    expect(primeiro).toBeDefined()
    expect(primeiro!.t).toBeGreaterThanOrEqual(48 * H)
    expect(primeiro!.t).toBeLessThanOrEqual(96 * H)
    expect(primeiro!.brasas).toBeGreaterThanOrEqual(5)
    expect(primeiro!.brasas).toBeLessThanOrEqual(15)
    expect(primeiro!.t).toBeGreaterThan(r.construcoes.muralha!)
  })

  it('segundo ciclo leva no máximo 60 % do primeiro (e compra talentos de forma gulosa)', () => {
    expect(segundo).toBeDefined()
    expect(segundo!.duracaoCiclo / primeiro!.duracaoCiclo).toBeLessThanOrEqual(0.6)
    expect(segundo!.brasas).toBeGreaterThanOrEqual(5)
    // gastou quase tudo em talentos e a lista fixa segue a ordem: Foles, Sono e Veios vêm primeiro
    expect(primeiro!.compradas.slice(0, 3)).toEqual(['fornalheiro_1', 'fornalheiro_2', 'fornalheiro_3'])
    expect(r.talentosFinais.length).toBeGreaterThanOrEqual(5)
    expect(r.estadoFinal.reforjas).toBe(2)
  })

  it('nenhum valor passa de 1e15 (limite do number) em quatro dias de jogo', () => {
    expect(r.maiorValor).toBeLessThan(1e15)
    expect(r.estadoFinal.moedasGanhas).toBeLessThan(1e15)
  })

  it('o Reforjar manteve o que devia: heróis, construções, chefes e reputação', () => {
    const f = r.estadoFinal
    expect(f.herois.length).toBeGreaterThanOrEqual(4)
    expect(f.construcoes).toHaveLength(5)
    expect(f.chefesDerrotados).toEqual(['golem', 'serpe'])
    expect(f.reputacao).toBeGreaterThan(1000)
    // contadores e conquistas sobrevivem ao Reforjar
    expect(f.stats.itensForjados).toBeGreaterThan(1000)
    expect(aplicarConquistas(f).novas).toEqual(expect.arrayContaining(['primeiro_reforjar', 'golem', 'serpe', 'todas_obras', 'reputacao_mil']))
  })

  it('as encomendas contribuem com reputação sem inflar: de um quarto a metade do total, nunca o grosso', () => {
    expect(r.encomendas.entregues).toBeGreaterThan(15)
    const fracao = r.encomendas.reputacao / r.estadoFinal.reputacao
    expect(fracao).toBeGreaterThan(0.2)
    expect(fracao).toBeLessThan(0.55)
  })
}, 60_000)

describe('sim de dias é determinística', () => {
  it('mesma entrada, mesmo resultado', () => {
    const a = simular(8, 4, OPCOES_DIAS)
    const b = simular(8, 4, OPCOES_DIAS)
    expect(b.compras).toEqual(a.compras)
    expect(b.reputacaoFinal).toBe(a.reputacaoFinal)
    expect(b.moedasPorDia).toEqual(a.moedasPorDia)
  })
}, 30_000)
