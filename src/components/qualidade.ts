import type { Qualidade } from '../game/items.ts'

/**
 * Cor de cada qualidade (borda, texto e fio do cartão). Nunca é o único sinal: o nome da
 * qualidade sempre vem escrito. Contraste >= 4,5:1 contra carvão e aço escuro (qualidade.test.ts).
 */
export const COR_QUALIDADE: Record<Qualidade, string> = {
  comum: '#b9b1bf',
  incomum: '#7bd88f',
  raro: '#6fb1ff',
  epico: '#c792ff',
  lendario: '#ffd47a',
}

export const FUNDOS_PAINEL = ['#1b1618', '#2e2a30', '#34303a'] as const

function canal(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Luminância relativa (WCAG) de uma cor "#rrggbb". */
export function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (la + 0.05) / (lb + 0.05)
}
