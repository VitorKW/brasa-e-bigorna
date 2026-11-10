// Itens, materiais e qualidade (GDD §4.2 e §5). Só dados e funções puras.

export const TIPOS_ITEM = ['espada', 'machado', 'escudo', 'elmo', 'armadura'] as const
export type TipoItem = (typeof TIPOS_ITEM)[number]
/** A receita de cada item tem o mesmo id do tipo. */
export type ReceitaId = TipoItem

export const MATERIAIS = ['ferro', 'aco'] as const
export type MaterialId = (typeof MATERIAIS)[number]

export const QUALIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario'] as const
export type Qualidade = (typeof QUALIDADES)[number]

export interface Receita {
  lingotes: number
  segundos: number
  /** Machado e elmo são `[suposição]` (iguais a espada e escudo). */
  valorBase: number
}

export const RECEITAS: Record<ReceitaId, Receita> = {
  espada: { lingotes: 3, segundos: 10, valorBase: 25 },
  machado: { lingotes: 3, segundos: 10, valorBase: 25 },
  escudo: { lingotes: 4, segundos: 12, valorBase: 30 },
  elmo: { lingotes: 4, segundos: 12, valorBase: 30 },
  armadura: { lingotes: 6, segundos: 20, valorBase: 50 },
}

export const NOME_TIPO: Record<TipoItem, string> = {
  espada: 'Espada',
  machado: 'Machado',
  escudo: 'Escudo',
  elmo: 'Elmo',
  armadura: 'Armadura',
}

/** Gênero gramatical, para "espada rara" x "machado raro". */
export const GENERO_TIPO: Record<TipoItem, 'f' | 'm'> = {
  espada: 'f',
  machado: 'm',
  escudo: 'm',
  elmo: 'm',
  armadura: 'f',
}

export const NOME_MATERIAL: Record<MaterialId, string> = { ferro: 'ferro', aco: 'aço' }

const NOME_QUALIDADE: Record<Qualidade, { m: string; f: string }> = {
  comum: { m: 'comum', f: 'comum' },
  incomum: { m: 'incomum', f: 'incomum' },
  raro: { m: 'raro', f: 'rara' },
  epico: { m: 'épico', f: 'épica' },
  lendario: { m: 'lendário', f: 'lendária' },
}

export function nomeQualidade(q: Qualidade, tipo: TipoItem): string {
  return NOME_QUALIDADE[q][GENERO_TIPO[tipo]]
}

/** Forma neutra (rótulos de agrupamento): "Raro", "Épico". */
export function rotuloQualidade(q: Qualidade): string {
  const m = NOME_QUALIDADE[q].m
  return m.charAt(0).toUpperCase() + m.slice(1)
}

export const MULT_QUALIDADE: Record<Qualidade, number> = {
  comum: 1,
  incomum: 1.5,
  raro: 2.5,
  epico: 4,
  lendario: 7,
}

/** Menor Q de cada faixa (GDD §4.2). */
export const Q_MINIMO: Record<Qualidade, number> = {
  comum: -Infinity,
  incomum: 30,
  raro: 50,
  epico: 70,
  lendario: 90,
}

export const BONUS_MATERIAL: Record<MaterialId, number> = { ferro: 0, aco: 10 }
export const MULT_MATERIAL: Record<MaterialId, number> = { ferro: 1, aco: 4 }

export type ResultadoBatida = 'automatico' | 'errou' | 'bom' | 'perfeito'

/** "Errou" nunca é pior que o automático (GDD §3). */
export const BONUS_BATIDA: Record<ResultadoBatida, number> = {
  automatico: 5,
  errou: 5,
  bom: 10,
  perfeito: 20,
}

/** O aleatório da qualidade é um inteiro em [0, 20]. */
export const ALEATORIO_MAX = 20

export interface Item {
  id: number
  tipo: TipoItem
  material: MaterialId
  qualidade: Qualidade
  /** Nome de quem forjou ("Você" se a bigorna estava sem ferreiro). */
  ferreiro: string
  valor: number
  /** Q calculado, guardado para mostrar o "quanto faltou". */
  pontuacao: number
}

export interface EntradaQ {
  nivelFerreiro: number
  nivelBigorna: number
  material: MaterialId
  batida: ResultadoBatida
  aleatorio: number
  /** Bônus fixo de passivas (Dona Cida: +10). */
  bonusFixo?: number
  /** Multiplicador final (Mestre Odair: 1,05 ou 1,10). */
  multiplicador?: number
}

/**
 * Peso de cada fonte na qualidade. A bigorna sobe de nível sem teto, então entra dividida
 * (ajustado pelo sim: com peso 1 o jogo virava 75 % lendário em 2 h).
 */
export const Q_PESOS = { porNivelFerreiro: 2, divisorBigorna: 3 } as const

/** Q = 2 × nívelFerreiro + ⌊nívelBigorna / 3⌋ + bônusMaterial + bônusBatida + aleatório (+ passivas). */
export function calcularQ(e: EntradaQ): number {
  const soma =
    Q_PESOS.porNivelFerreiro * e.nivelFerreiro +
    Math.floor(e.nivelBigorna / Q_PESOS.divisorBigorna) +
    BONUS_MATERIAL[e.material] +
    BONUS_BATIDA[e.batida] +
    e.aleatorio +
    (e.bonusFixo ?? 0)
  return Math.floor(soma * (e.multiplicador ?? 1))
}

export function qualidadeDe(q: number): Qualidade {
  let atual: Qualidade = 'comum'
  for (const nome of QUALIDADES) if (q >= Q_MINIMO[nome]) atual = nome
  return atual
}

/** Valor de venda = valorBase × multQualidade × multMaterial. */
export function valorItem(tipo: TipoItem, material: MaterialId, qualidade: Qualidade): number {
  return RECEITAS[tipo].valorBase * MULT_QUALIDADE[qualidade] * MULT_MATERIAL[material]
}

export function nomeItem(i: Pick<Item, 'tipo' | 'material'>): string {
  return `${NOME_TIPO[i.tipo]} de ${NOME_MATERIAL[i.material]}`
}

// ---------------------------------------------------------------------------
// Atributos dos itens (fatia 3). Valores base `[suposição]`, ajustados pelo sim.
// ---------------------------------------------------------------------------

export interface Atributos {
  pv: number
  atq: number
  def: number
  vel: number
}

export const ATRIBUTOS_ZERO: Readonly<Atributos> = { pv: 0, atq: 0, def: 0, vel: 0 }

/** Espaços de equipamento. O elmo tem espaço próprio (decisão da fatia 3, ver GDD §3). */
export const SLOTS = ['arma', 'escudo', 'armadura', 'elmo'] as const
export type Slot = (typeof SLOTS)[number]

export const NOME_SLOT: Record<Slot, string> = {
  arma: 'Arma',
  escudo: 'Escudo',
  armadura: 'Armadura',
  elmo: 'Elmo',
}

export const SLOT_DO_TIPO: Record<TipoItem, Slot> = {
  espada: 'arma',
  machado: 'arma',
  escudo: 'escudo',
  armadura: 'armadura',
  elmo: 'elmo',
}

/**
 * Atributos de um item comum de ferro. O valor real = base × multQualidade × multMaterial
 * (o mesmo multiplicador do preço, GDD §4.2): lendário de aço rende 28 vezes o comum de ferro.
 * Espada: ataque e um pouco de velocidade; machado: mais ataque, sem velocidade; escudo: defesa;
 * elmo: pouca defesa e vida; armadura: muita vida e defesa média.
 */
export const ATRIBUTOS_BASE: Record<TipoItem, Partial<Atributos>> = {
  espada: { atq: 28, vel: 2 },
  machado: { atq: 40 },
  escudo: { def: 18 },
  elmo: { def: 7, pv: 150 },
  armadura: { def: 10, pv: 400 },
}

/** Atributos que o item dá ao herói (inteiros; todo atributo base > 0 rende pelo menos 1). */
export function atributosItem(i: Pick<Item, 'tipo' | 'material' | 'qualidade'>): Atributos {
  const mult = MULT_QUALIDADE[i.qualidade] * MULT_MATERIAL[i.material]
  const base = ATRIBUTOS_BASE[i.tipo]
  const f = (v: number | undefined) => (v ? Math.max(1, Math.round(v * mult)) : 0)
  return { pv: f(base.pv), atq: f(base.atq), def: f(base.def), vel: f(base.vel) }
}

/** Quanto o item soma ao poder de expedição: ATQ + DEF + PV/10 (GDD §4.2). */
export function poderDe(a: Atributos): number {
  return a.atq + a.def + a.pv / 10
}
