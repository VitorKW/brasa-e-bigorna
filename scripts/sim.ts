// Uso: npm run sim                 2 h contínuas e depois a sim de dias (padrão)
//      npm run sim -- 8            só a sim contínua, 8 h
//      npm run sim -- dias [h]     só a sim de dias (até 2 Reforjars, no máximo h horas; padrão 240)
// Roda direto no Node 22.18+ (remove os tipos sozinho), por isso os imports levam ".ts".
import { DEF_CONSTRUCAO } from '../src/game/construcoes.ts'
import { formatarCusto, formatarDuracao } from '../src/game/format.ts'
import { QUALIDADES } from '../src/game/items.ts'
import { DEF_TALENTO } from '../src/game/talentos.ts'
import { BRASAS_ALVO_PADRAO, OPCOES_DIAS, PADRAO_REALISTA, simular } from '../src/game/sim.ts'

const arg = process.argv[2]
const soDias = arg === 'dias'
const horas = soDias ? 0 : Number(arg ?? 2)
const horasDias = soDias ? Number(process.argv[3] ?? 240) : 240
if ((!soDias && (!Number.isFinite(horas) || horas <= 0)) || !Number.isFinite(horasDias) || horasDias <= 0) {
  console.error('Uso: npm run sim -- <horas>   ou   npm run sim -- dias [horas]')
  process.exit(1)
}

const dur = (s: number | null) => (s === null ? 'não atingiu' : formatarDuracao(s))
const seg = (s: number | null) => (s === null ? 'não atingiu' : `${s.toFixed(1).replace('.', ',')} s`)
const virgula = (n: number, casas = 1) => n.toFixed(casas).replace('.', ',')
const milhoes = (n: number) => `${virgula(n / 1e6)} M`

function imprimir(titulo: string, linhas: [string, string][]) {
  console.log(`\n${titulo}\n`)
  console.log('Marco                                     Resultado')
  console.log('----------------------------------------  -----------------------------')
  for (const [k, v] of linhas) console.log(`${k.padEnd(48)}  ${v}`)
}

function continua() {
  const r = simular(horas)
  imprimir(`Brasa & Bigorna - simulação gulosa de ${horas} h`, [
    ['Primeira compra', seg(r.primeiraCompra)],
    ['Mina no nível 10', dur(r.nivel10.mina)],
    ['Carvoaria no nível 10', dur(r.nivel10.carvoaria)],
    ['Fornalha no nível 10', dur(r.nivel10.fornalha)],
    ['Bigorna desbloqueada', dur(r.bigornaDesbloqueada)],
    ['Primeiro item incomum', dur(r.primeiraQualidade.incomum)],
    ['Primeiro item raro', dur(r.primeiraQualidade.raro)],
    ['Primeiro item épico', dur(r.primeiraQualidade.epico)],
    ['Primeiro item lendário', dur(r.primeiraQualidade.lendario)],
    ['Primeiro ferreiro contratado', dur(r.primeiroFerreiro)],
    ['Primeiro herói contratado', dur(r.primeiroHeroi)],
    ['Primeira expedição', dur(r.primeiraExpedicao)],
    ['Segundo herói (reputação)', dur(r.segundoHeroi)],
    ['Golem de Escória derrotado', dur(r.golemDerrotado)],
    ['  rodadas do combate', r.rodadasDoGolem === null ? '-' : String(r.rodadasDoGolem)],
    ['Terceiro herói (Golem)', dur(r.terceiroHeroi)],
    ['Forno de aço comprado', dur(r.fornoComprado)],
    ['Primeiro lingote de aço', dur(r.primeiroAco)],
    ['Primeiro lendário de ferro', dur(r.primeiraQualidadePorMaterial.ferro.lendario)],
    ['Primeiro lendário de aço', dur(r.primeiraQualidadePorMaterial.aco.lendario)],
    [
      'Primeiro épico de ferro / de aço',
      `${dur(r.primeiraQualidadePorMaterial.ferro.epico)} / ${dur(r.primeiraQualidadePorMaterial.aco.epico)}`,
    ],
    [
      'Maior intervalo entre compras',
      `${dur(r.maiorIntervaloEntreCompras.duracao)} (a partir de ${dur(r.maiorIntervaloEntreCompras.inicio)})`,
    ],
    [
      'Maior intervalo sem nada comprável',
      `${dur(r.maiorIntervaloSemComprar.duracao)} (a partir de ${dur(r.maiorIntervaloSemComprar.inicio)})`,
    ],
    ...r.moedasPorSegundo.map((m): [string, string] => [
      `Moedas/s em ${m.rotulo}`,
      m.valor === null ? 'fora do período' : virgula(m.valor, 2),
    ]),
    ['Compras no total', String(r.compras.length)],
    [
      'Níveis finais (mina/carvoaria/fornalha/forno/bigorna)',
      `${r.niveisFinais.mina} / ${r.niveisFinais.carvoaria} / ${r.niveisFinais.fornalha} / ${r.niveisFinais.forno} / ${r.niveisFinais.bigorna}`,
    ],
    ['Itens forjados', String(r.itensForjados)],
    ['  de ferro', QUALIDADES.map((q) => `${q} ${r.itensPorMaterial.ferro[q]}`).join(', ')],
    ['  de aço', QUALIDADES.map((q) => `${q} ${r.itensPorMaterial.aco[q]}`).join(', ')],
    ['Encomendas (entregues / vencidas / reputação)', `${r.encomendas.entregues} / ${r.encomendas.expiradas} / ${virgula(r.encomendas.reputacao, 0)}`],
    [
      'Expedições (enviadas / sucessos / falhas)',
      `${r.expedicoes.enviadas} / ${r.expedicoes.sucessos} / ${r.expedicoes.falhas}`,
    ],
    ['Reputação / fragmentos', `${Math.floor(r.reputacaoFinal)} / ${r.fragmentosFinais}`],
    [
      'Heróis (nível, poder)',
      r.heroisFinais.map((h) => `${h.nome} ${h.classe} ${h.nivel} (${Math.round(h.poder)})`).join('; ') || 'nenhum',
    ],
    [
      'Ferreiros (nível, posto)',
      r.ferreirosFinais.map((f) => `${f.id} ${f.nivel} ${f.estacao ?? '-'}`).join('; ') || 'nenhum',
    ],
    ['Maior valor visto (limite 1e15)', r.maiorValor.toExponential(2).replace('.', ',')],
  ])

  console.log('\nPrimeiras compras')
  for (const c of r.compras.slice(0, 12)) {
    const nivel = c.tipo === 'ferreiro' || c.tipo === 'heroi' ? 'contratado' : `-> nível ${c.nivel}`
    console.log(`  ${virgula(c.t).padStart(7)} s  ${c.alvo.padEnd(9)} ${nivel}  (custo ${virgula(c.custo)})`)
  }
  console.log('')
}

function porDias() {
  const p = PADRAO_REALISTA
  const r = simular(horasDias, 1, OPCOES_DIAS)
  const [r1, r2] = r.reforjas
  const rep = (m: number) => dur(r.reputacaoMarcos.find((x) => x.minimo === m)?.t ?? null)
  const razao = r1 && r2 ? r2.duracaoCiclo / r1.duracaoCiclo : null

  console.log('\nPadrão de jogador (sim de dias)')
  console.log(
    `  As primeiras ${p.horasContinuas} h de cada ciclo são jogadas sem parar. Depois, ${p.horasAcordado} h acordado por dia,`,
  )
  console.log(
    `  com uma sessão ativa de ${p.sessaoMin} min a cada ${p.intervaloMin} min e o resto offline (com o teto real); ${24 - p.horasAcordado} h de sono.`,
  )
  console.log(`  Reforja quando a Muralha existe e o ciclo rende ${BRASAS_ALVO_PADRAO} brasas. Talentos: lista fixa, comprados até acabarem as brasas.`)

  imprimir(`Brasa & Bigorna - simulação de dias (${virgula(r.horas / 24)} dias simulados)`, [
    ['Segundo herói (150 de reputação)', dur(r.segundoHeroi)],
    ['Golem de Escória derrotado', dur(r.golemDerrotado)],
    ['Reputação 400 / 650 / 1 000', `${rep(400)} / ${rep(650)} / ${rep(1000)}`],
    ...(Object.keys(r.construcoes) as (keyof typeof r.construcoes)[]).map((c): [string, string] => [
      `Construção: ${DEF_CONSTRUCAO[c].nome}`,
      `${dur(r.construcoes[c])} (${DEF_CONSTRUCAO[c].reputacao} rep, ${formatarCusto(DEF_CONSTRUCAO[c].custo)} moedas)`,
    ]),
    ['Quarto herói (Taverna)', dur(r.quartoHeroi)],
    ['Serpe de Cinza derrotada', dur(r.serpeDerrotada)],
    ['  rodadas do combate', r.rodadasDaSerpe === null ? '-' : String(r.rodadasDaSerpe)],
    ['Primeiro lendário de aço', dur(r.primeiraQualidadePorMaterial.aco.lendario)],
    ...r.reforjas.flatMap((x, i): [string, string][] => [
      [`Reforjar ${i + 1}: quando`, dur(x.t)],
      [`  moedas do ciclo / brasas`, `${milhoes(x.moedasDoCiclo)} / ${x.brasas}`],
      [`  duração do ciclo`, dur(x.duracaoCiclo)],
      [
        `  talentos comprados`,
        x.compradas.map((id) => DEF_TALENTO[id].nome).join(', ') || 'nenhum',
      ],
      [`  brasas guardadas`, String(x.brasasRestantes)],
    ]),
    ['Segundo ciclo / primeiro ciclo', razao === null ? 'não atingiu' : `${virgula(razao * 100, 0)} %`],
    ['Moedas acumuladas ao fim de cada dia', r.moedasPorDia.map(milhoes).join(', ')],
    ['Expedições (enviadas / sucessos / falhas)', `${r.expedicoes.enviadas} / ${r.expedicoes.sucessos} / ${r.expedicoes.falhas}`],
    ['Encomendas (entregues / vencidas / reputação)', `${r.encomendas.entregues} / ${r.encomendas.expiradas} / ${virgula(r.encomendas.reputacao, 0)}`],
    ['Maior valor visto (limite 1e15)', r.maiorValor.toExponential(2).replace('.', ',')],
  ])
  console.log('')
}

if (!soDias) continua()
if (soDias || arg === undefined) porDias()
