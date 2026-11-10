import { describe, expect, it } from 'vitest'
import { simular } from './sim.ts'

// Metas do GDD §4.4 das fatias 1 a 3 (jogo contínuo). A sim roda uma vez (leva alguns segundos).
// As metas de dias (Serpe, construções, Reforjar) estão em sim.dias.test.ts.
describe('ritmo (simulação gulosa de 2 h)', () => {
  const r = simular(2)

  it('primeira compra em menos de 15 s', () => {
    expect(r.primeiraCompra).not.toBeNull()
    expect(r.primeiraCompra!).toBeLessThan(15)
  })

  it('nunca mais de 10 min sem comprar nas primeiras 2 h', () => {
    expect(r.maiorIntervaloEntreCompras.duracao).toBeLessThanOrEqual(10 * 60)
  })

  it('nunca mais de 10 min sem nada comprável (upgrade ou ferreiro) nas primeiras 2 h', () => {
    expect(r.maiorIntervaloSemComprar.duracao).toBeLessThanOrEqual(10 * 60)
  })

  it('nenhum valor passa de 1e15 (limite do number)', () => {
    expect(r.maiorValor).toBeLessThan(1e15)
  })

  it('as três estações chegam ao nível 10 dentro de 2 h', () => {
    for (const t of Object.values(r.nivel10)) expect(t).not.toBeNull()
  })

  it('bigorna desbloqueada entre 3 e 8 min (meta: ~5 min)', () => {
    expect(r.bigornaDesbloqueada).not.toBeNull()
    expect(r.bigornaDesbloqueada!).toBeGreaterThanOrEqual(3 * 60)
    expect(r.bigornaDesbloqueada!).toBeLessThanOrEqual(8 * 60)
  })

  it('contrata ferreiro e forja itens de qualidade crescente', () => {
    expect(r.primeiroFerreiro).not.toBeNull()
    expect(r.itensForjados).toBeGreaterThan(100)
    expect(r.primeiraQualidade.incomum).not.toBeNull()
    expect(r.primeiraQualidade.raro).not.toBeNull()
    // o épico agora vem perto das 2 h: coberto pelo bloco de raridade abaixo
  })

  it('primeiro herói entre 5 e 15 min (meta: ~10 min)', () => {
    expect(r.primeiroHeroi).not.toBeNull()
    expect(r.primeiroHeroi!).toBeGreaterThanOrEqual(5 * 60)
    expect(r.primeiroHeroi!).toBeLessThanOrEqual(15 * 60)
  })

  it('manda expedições e elas rendem reputação', () => {
    expect(r.primeiraExpedicao).not.toBeNull()
    expect(r.primeiraExpedicao!).toBeGreaterThanOrEqual(r.primeiroHeroi!)
    expect(r.expedicoes.enviadas).toBeGreaterThan(20)
    expect(r.expedicoes.sucessos).toBeGreaterThan(r.expedicoes.falhas)
    expect(r.reputacaoFinal).toBeGreaterThan(100)
  })

  it('o 2º herói (150 de reputação) chega entre 30 e 60 min', () => {
    expect(r.segundoHeroi).not.toBeNull()
    expect(r.segundoHeroi!).toBeGreaterThanOrEqual(30 * 60)
    expect(r.segundoHeroi!).toBeLessThanOrEqual(60 * 60)
  })

  it('a reputação não infla: jogando 2 h sem parar fica longe dos 1 000 da Muralha (era 765 só com a Trilha)', () => {
    expect(r.reputacaoFinal).toBeGreaterThan(150)
    expect(r.reputacaoFinal).toBeLessThan(550)
  })

  it('Golem derrotado entre 15 e 40 min (meta: ~20 min)', () => {
    expect(r.golemDerrotado).not.toBeNull()
    expect(r.golemDerrotado!).toBeGreaterThanOrEqual(15 * 60)
    expect(r.golemDerrotado!).toBeLessThanOrEqual(40 * 60)
    expect(r.golemDerrotado!).toBeGreaterThan(r.primeiroHeroi!)
  })

  it('depois do Golem: forno de aço, primeiro lingote de aço e itens de aço', () => {
    expect(r.fornoComprado).not.toBeNull()
    expect(r.fornoComprado!).toBeGreaterThanOrEqual(r.golemDerrotado!)
    expect(r.primeiroAco).not.toBeNull()
    expect(r.primeiroAco!).toBeGreaterThan(r.fornoComprado!)
    expect(Object.values(r.itensPorMaterial.aco).reduce((a, b) => a + b, 0)).toBeGreaterThan(100)
  })

  it('o 2º herói chega com reputação e o 3º depois do Golem', () => {
    expect(r.segundoHeroi).not.toBeNull()
    expect(r.terceiroHeroi).not.toBeNull()
    expect(r.terceiroHeroi!).toBeGreaterThanOrEqual(r.golemDerrotado!)
    expect(r.heroisFinais).toHaveLength(3)
  })

  it('é determinística (mesma semente, mesmo resultado)', () => {
    const a = simular(0.25)
    const b = simular(0.25)
    expect(b.itensPorQualidade).toEqual(a.itensPorQualidade)
    expect(b.compras).toEqual(a.compras)
    expect(b.golemDerrotado).toEqual(a.golemDerrotado)
  })
})

// Metas de raridade (GDD §4.4). Elas falam de itens de FERRO: depois do Golem o sim forja em aço (+10 de
// qualidade), que é a recompensa da região 2, então o aço tem o seu próprio teste mais abaixo. O sim joga contínuo e sempre no automático, então é o caminho
// mais rápido possível sem minigame: se aqui o épico já sai cedo, no jogo real sai mais cedo ainda.
describe('raridade (simulação gulosa de 3 h, passo de 1 s)', () => {
  const r = simular(3, 1)
  it('primeiro épico de ferro entre 1 h 30 e 2 h 45 (meta: ~2 h)', () => {
    const epico = r.primeiraQualidadePorMaterial.ferro.epico
    expect(epico).not.toBeNull()
    expect(epico!).toBeGreaterThanOrEqual(90 * 60)
    expect(epico!).toBeLessThanOrEqual(165 * 60)
  })

  it('nenhum lendário de ferro no automático nas primeiras 3 h', () => {
    expect(r.primeiraQualidadePorMaterial.ferro.lendario).toBeNull()
  })

  it('épicos de ferro são menos de 10 % dos itens de ferro nas primeiras 3 h', () => {
    const ferro = r.itensPorMaterial.ferro
    const totalFerro = Object.values(ferro).reduce((a, b) => a + b, 0)
    expect(totalFerro).toBeGreaterThan(500)
    expect(ferro.epico / totalFerro).toBeLessThan(0.1)
  })

  it('o aço (+10) antecipa o épico: sai bem antes do épico de ferro', () => {
    const aco = r.primeiraQualidadePorMaterial.aco.epico
    const ferro = r.primeiraQualidadePorMaterial.ferro.epico
    expect(aco).not.toBeNull()
    expect(ferro === null || aco! < ferro).toBe(true)
    expect(aco!).toBeLessThan(90 * 60)
  })
}, 30_000)
