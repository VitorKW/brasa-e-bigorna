import { formatar } from '../game/format.ts'
import type { Atributos as AtributosT } from '../game/items.ts'

export const ROTULO_ATRIBUTO: Record<keyof AtributosT, string> = { pv: 'PV', atq: 'ATQ', def: 'DEF', vel: 'VEL' }
const ORDEM: (keyof AtributosT)[] = ['pv', 'atq', 'def', 'vel']

/** Grade com os 4 atributos de um herói (ou de um item). */
export function GradeAtributos({ a, rotulo }: { a: AtributosT; rotulo: string }) {
  return (
    <dl className="atributos" aria-label={rotulo}>
      {ORDEM.map((k) => (
        <div key={k} className="atributo">
          <dt>{ROTULO_ATRIBUTO[k]}</dt>
          <dd>{formatar(a[k])}</dd>
        </div>
      ))}
    </dl>
  )
}

/** "+28 ATQ · +2 VEL" para os atributos não nulos de um item. */
export function textoAtributosItem(a: AtributosT): string {
  const partes = ORDEM.filter((k) => a[k] > 0).map((k) => `+${formatar(a[k])} ${ROTULO_ATRIBUTO[k]}`)
  return partes.join(' · ')
}

/**
 * Diferença ao equipar: o sinal (+ ou −) está sempre escrito, a cor só reforça.
 * Sem mudança aparece como "igual".
 */
export function Diferenca({ d }: { d: AtributosT }) {
  const itens = ORDEM.filter((k) => d[k] !== 0)
  if (itens.length === 0) return <span className="diferenca igual">sem mudança</span>
  return (
    <span className="diferenca">
      {itens.map((k) => (
        <span key={k} className={d[k] > 0 ? 'sobe' : 'desce'}>
          {d[k] > 0 ? '+' : '−'}
          {formatar(Math.abs(d[k]))} {ROTULO_ATRIBUTO[k]}
        </span>
      ))}
    </span>
  )
}
