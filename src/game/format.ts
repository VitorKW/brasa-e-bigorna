const SUFIXOS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'] as const

function virgula(texto: string): string {
  return texto.replace('.', ',')
}

/**
 * Formata para exibição em pt-BR: 999 -> "999", 1234 -> "1,2 K", 3,4 M, 5,6 B, T.
 * Trunca (nunca arredonda para cima) para não mostrar mais do que o jogador tem.
 */
export function formatar(valor: number): string {
  if (Number.isNaN(valor)) return '0'
  if (!Number.isFinite(valor)) return valor > 0 ? '∞' : '-∞'
  if (valor < 0) return '-' + formatar(-valor)
  if (valor < 1000) return String(Math.floor(valor))

  let indice = 0
  let v = valor
  while (v >= 1000 && indice < SUFIXOS.length - 1) {
    v /= 1000
    indice++
  }
  const truncado = Math.floor(v * 10) / 10
  const texto = Number.isInteger(truncado) ? String(truncado) : virgula(truncado.toFixed(1))
  return `${texto} ${SUFIXOS[indice]}`
}

/**
 * Custos: arredonda para cima, para o botão nunca prometer uma compra que o jogador ainda não
 * pode fazer (custo 11,5 aparece como "12", não "11").
 */
export function formatarCusto(valor: number): string {
  if (!Number.isFinite(valor) || valor < 1000) return formatar(Math.ceil(valor))
  let indice = 0
  let v = valor
  while (v >= 1000 && indice < SUFIXOS.length - 1) {
    v /= 1000
    indice++
  }
  const acima = Math.ceil(v * 10 - 1e-9) / 10
  const texto = Number.isInteger(acima) ? String(acima) : virgula(acima.toFixed(1))
  return `${texto} ${SUFIXOS[indice]}`
}

/**
 * Taxas por segundo: 2 casas abaixo de 10 (para "atual" e "próximo" nunca parecerem iguais),
 * 1 casa abaixo de 100, depois o formato normal. Zeros à direita somem ("0,5", "2", "0,29").
 */
export function formatarTaxa(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return '0'
  if (valor >= 100) return formatar(valor)
  const casas = valor < 10 ? 2 : 1
  const f = 10 ** casas
  const truncado = Math.floor(valor * f + 1e-9) / f
  if (truncado === 0) return '< 0,01'
  return virgula(String(truncado))
}

/** Duração legível: "45 s", "12 min", "1 h 20 min". */
export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  if (s < 60) return `${s} s`
  const min = Math.floor(s / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`
}
