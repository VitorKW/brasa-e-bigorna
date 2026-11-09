// Uso: npm run sim [-- horas]   (padrão: 2 h)
// Roda direto no Node 22.18+ (remove os tipos sozinho), por isso os imports levam ".ts".
import { formatarDuracao } from '../src/game/format.ts'
import { simular } from '../src/game/sim.ts'

const horas = Number(process.argv[2] ?? 2)
if (!Number.isFinite(horas) || horas <= 0) {
  console.error('Uso: npm run sim -- <horas>')
  process.exit(1)
}

const r = simular(horas)
const dur = (s: number | null) => (s === null ? 'não atingiu' : formatarDuracao(s))
const seg = (s: number | null) => (s === null ? 'não atingiu' : `${s.toFixed(1).replace('.', ',')} s`)

console.log(`\nBrasa & Bigorna - simulação gulosa de ${horas} h\n`)
console.log('Marco                                     Resultado')
console.log('----------------------------------------  -----------------------------')
const linhas: [string, string][] = [
  ['Primeira compra', seg(r.primeiraCompra)],
  ['Mina no nível 10', dur(r.nivel10.mina)],
  ['Carvoaria no nível 10', dur(r.nivel10.carvoaria)],
  ['Fornalha no nível 10', dur(r.nivel10.fornalha)],
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
    m.valor === null ? 'fora do período' : m.valor.toFixed(2).replace('.', ','),
  ]),
  ['Compras no total', String(r.compras.length)],
  [
    'Níveis finais (mina/carvoaria/fornalha)',
    `${r.niveisFinais.mina} / ${r.niveisFinais.carvoaria} / ${r.niveisFinais.fornalha}`,
  ],
  ['Maior valor visto (limite 1e15)', r.maiorValor.toExponential(2).replace('.', ',')],
]
for (const [k, v] of linhas) console.log(`${k.padEnd(40)}  ${v}`)

console.log('\nPrimeiras compras')
for (const c of r.compras.slice(0, 8)) {
  console.log(`  ${c.t.toFixed(1).replace(".", ",").padStart(7)} s  ${c.estacao.padEnd(9)} -> nível ${c.nivel}  (custo ${c.custo.toFixed(1).replace('.', ',')})`)
}
console.log('')
