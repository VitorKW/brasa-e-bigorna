// Uso: npm run sim [-- horas]   (padrão: 2 h)
// Roda direto no Node 22.18+ (remove os tipos sozinho), por isso os imports levam ".ts".
import { formatarDuracao } from '../src/game/format.ts'
import { QUALIDADES } from '../src/game/items.ts'
import { simular } from '../src/game/sim.ts'

const horas = Number(process.argv[2] ?? 2)
if (!Number.isFinite(horas) || horas <= 0) {
  console.error('Uso: npm run sim -- <horas>')
  process.exit(1)
}

const r = simular(horas)
const dur = (s: number | null) => (s === null ? 'não atingiu' : formatarDuracao(s))
const seg = (s: number | null) => (s === null ? 'não atingiu' : `${s.toFixed(1).replace('.', ',')} s`)
const virgula = (n: number, casas = 1) => n.toFixed(casas).replace('.', ',')

console.log(`\nBrasa & Bigorna - simulação gulosa de ${horas} h\n`)
console.log('Marco                                     Resultado')
console.log('----------------------------------------  -----------------------------')
const linhas: [string, string][] = [
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
    'Níveis finais (mina/carvoaria/fornalha/bigorna)',
    `${r.niveisFinais.mina} / ${r.niveisFinais.carvoaria} / ${r.niveisFinais.fornalha} / ${r.niveisFinais.bigorna}`,
  ],
  ['Itens forjados', String(r.itensForjados)],
  ['  por qualidade', QUALIDADES.map((q) => `${q} ${r.itensPorQualidade[q]}`).join(', ')],
  [
    'Ferreiros (nível, posto)',
    r.ferreirosFinais.map((f) => `${f.id} ${f.nivel} ${f.estacao ?? '-'}`).join('; ') || 'nenhum',
  ],
  ['Maior valor visto (limite 1e15)', r.maiorValor.toExponential(2).replace('.', ',')],
]
for (const [k, v] of linhas) console.log(`${k.padEnd(48)}  ${v}`)

console.log('\nPrimeiras compras')
for (const c of r.compras.slice(0, 12)) {
  const nivel = c.tipo === 'ferreiro' ? 'contratado' : `-> nível ${c.nivel}`
  console.log(`  ${virgula(c.t).padStart(7)} s  ${c.alvo.padEnd(9)} ${nivel}  (custo ${virgula(c.custo)})`)
}
console.log('')
