// Campanha (fatia 9): a história do vilarejo em capítulos. Cada capítulo tem um morador que o abre,
// três ou quatro missões e uma recompensa. As missões são funções puras do estado, conferidas depois de
// cada tick (como as conquistas), e uma vez cumpridas ficam gravadas: o Reforjar zera níveis e itens,
// mas não a história. Todas contam desde o início, mesmo as de capítulos futuros; o que anda em ordem é
// o capítulo ATUAL, o primeiro cuja recompensa ainda não foi recebida.
import { DEF_CONQUISTA } from './conquistas.ts'
import { temConstrucao } from './construcoes.ts'
import type { NpcId } from './encomendas.ts'
import { formatarCusto } from './format.ts'
import { NOME_MATERIAL, NOME_TIPO, Q_MINIMO, SLOTS, nomeQualidade, valorItem, type Item, type MaterialId, type Qualidade, type TipoItem } from './items.ts'
import type { GameState } from './state.ts'

export interface EstadoCampanha {
  /** Ids das missões já cumpridas (ficam para sempre). */
  feitas: string[]
  /** Números dos capítulos com a recompensa já recebida. */
  recompensas: number[]
  /** A abertura do capítulo 1 já foi mostrada? (jogo novo abre a Crônica uma vez) */
  introVista: boolean
}

export const campanhaInicial = (): EstadoCampanha => ({ feitas: [], recompensas: [], introVista: false })

export interface Missao {
  id: string
  texto: string
  cumpre: (s: GameState) => boolean
}

export type Recompensa =
  | { tipo: 'moedas'; valor: number }
  | { tipo: 'item'; item: TipoItem; material: MaterialId; qualidade: Qualidade; origem: string }
  | { tipo: 'brasas'; valor: number }

export interface Capitulo {
  numero: number
  titulo: string
  /** Quem conta a abertura. */
  narrador: NpcId
  abertura: string
  /** Dita pelo mesmo morador quando o capítulo fecha. */
  desfecho: string
  missoes: readonly Missao[]
  recompensa: Recompensa
}

const algumHeroi = (s: GameState, f: (h: GameState['herois'][number]) => boolean): boolean => s.herois.some(f)

export const CAPITULOS: readonly Capitulo[] = [
  {
    numero: 1,
    titulo: 'A forja herdada',
    narrador: 'quiteria',
    abertura:
      'Então você é a herança do velho ferreiro. A forja está fria faz dois invernos e o vilarejo inteiro sente falta dela. Acenda esse fogo, e a primeira caneca é por minha conta.',
    desfecho: 'Olha só: fumaça na chaminé outra vez. O velho ia gostar de ver.',
    missoes: [
      { id: 'c1_mina', texto: 'Melhore a mina até o nível 5', cumpre: (s) => s.niveis.mina >= 5 },
      { id: 'c1_bigorna', texto: 'Construa a bigorna', cumpre: (s) => s.niveis.bigorna >= 1 },
      { id: 'c1_peca', texto: 'Forje a primeira peça', cumpre: (s) => s.stats.itensForjados >= 1 },
      { id: 'c1_cinco', texto: 'Forje 5 peças', cumpre: (s) => s.stats.itensForjados >= 5 },
    ],
    recompensa: { tipo: 'moedas', valor: 500 },
  },
  {
    numero: 2,
    titulo: 'O primeiro herói',
    narrador: 'amaro',
    abertura:
      'Espada boa parada na prateleira é desperdício. Tem gente disposta a enfrentar a estrada por você: contrate, arme e mande. O que voltar no alforje é seu, e o nome da forja corre junto.',
    desfecho: 'Voltou inteiro e com história para contar. É assim que uma forja ganha nome.',
    missoes: [
      { id: 'c2_heroi', texto: 'Contrate um herói na Guilda', cumpre: (s) => s.herois.length >= 1 },
      { id: 'c2_arma', texto: 'Equipe o herói com uma arma', cumpre: (s) => algumHeroi(s, (h) => h.equipamento.arma !== null) },
      { id: 'c2_expedicao', texto: 'Mande-o em expedição', cumpre: (s) => s.expedicoes.length > 0 || s.reputacao > 0 },
      { id: 'c2_reputacao', texto: 'Junte 20 de reputação', cumpre: (s) => s.reputacao >= 20 },
    ],
    recompensa: { tipo: 'item', item: 'escudo', material: 'ferro', qualidade: 'raro', origem: 'Presente do Sargento Amaro' },
  },
  {
    numero: 3,
    titulo: 'O Golem de Escória',
    narrador: 'ines',
    abertura:
      'Vi a coisa de longe, lá na Gruta dos Ecos: um monte de escória que anda, com brasa no peito. Enquanto ela estiver de pé, ninguém passa para a serra. Um herói só não dá conta.',
    desfecho: 'Caiu feito parede velha. O caminho da serra está aberto, e tem coisa boa lá em cima.',
    missoes: [
      { id: 'c3_dois', texto: 'Tenha 2 heróis no grupo', cumpre: (s) => s.herois.length >= 2 },
      { id: 'c3_kit', texto: 'Vista um herói com as 4 peças', cumpre: (s) => algumHeroi(s, (h) => SLOTS.every((slot) => h.equipamento[slot] !== null)) },
      { id: 'c3_encomenda', texto: 'Entregue uma encomenda no Vilarejo', cumpre: (s) => s.stats.encomendasEntregues >= 1 },
      { id: 'c3_golem', texto: 'Derrote o Golem de Escória', cumpre: (s) => s.chefesDerrotados.includes('golem') },
    ],
    recompensa: { tipo: 'item', item: 'elmo', material: 'ferro', qualidade: 'epico', origem: 'Troféu da caçada, de Inês' },
  },
  {
    numero: 4,
    titulo: 'O segredo do aço',
    narrador: 'jurema',
    abertura:
      'Na serra o povo mistura o ferro com mais carvão e sopra até o fogo ficar branco. Sai um metal azulado que não lasca. Quem forjar isso aqui embaixo vende para o reino inteiro. Eu compro primeiro.',
    desfecho: 'Aço de verdade, e feito aqui. Vou espalhar pelas feiras, pode deixar.',
    missoes: [
      { id: 'c4_forno', texto: 'Construa o Forno de aço', cumpre: (s) => s.niveis.forno >= 1 },
      { id: 'c4_peca', texto: 'Forje uma peça de aço', cumpre: (s) => DEF_CONQUISTA.primeiro_aco.cumpre(s) },
      { id: 'c4_vestir', texto: 'Equipe um herói com aço', cumpre: (s) => algumHeroi(s, (h) => SLOTS.some((slot) => h.equipamento[slot]?.material === 'aco')) },
      { id: 'c4_fornalha', texto: 'Construa a Segunda fornalha', cumpre: (s) => temConstrucao(s, 'segunda_fornalha') },
    ],
    recompensa: { tipo: 'moedas', valor: 50_000 },
  },
  {
    numero: 5,
    titulo: 'A Serpe de Cinza',
    narrador: 'zuleica',
    abertura:
      'A cinza que cai nas hortas não é de fornalha, é do cume. Tem uma serpe enrolada lá, velha como a serra, e ela acordou com o barulho. Mande os seus bem vestidos, que queimadura dessas eu não curo.',
    desfecho: 'A cinza parou de cair. Faz anos que não vejo o céu limpo assim.',
    missoes: [
      { id: 'c5_tres', texto: 'Tenha 3 heróis no grupo', cumpre: (s) => s.herois.length >= 3 },
      { id: 'c5_armazem', texto: 'Construa o Armazém', cumpre: (s) => temConstrucao(s, 'armazem') },
      { id: 'c5_reputacao', texto: 'Junte 400 de reputação', cumpre: (s) => s.reputacao >= 400 },
      { id: 'c5_serpe', texto: 'Derrote a Serpe de Cinza', cumpre: (s) => s.chefesDerrotados.includes('serpe') },
    ],
    recompensa: { tipo: 'item', item: 'escudo', material: 'aco', qualidade: 'lendario', origem: 'Escama da Serpe, benzida por Zuleica' },
  },
  {
    numero: 6,
    titulo: 'De vilarejo a cidade',
    narrador: 'almir',
    abertura:
      'Sem golem na estrada e sem serpe no cume, vem gente de todo lado querendo morar aqui. Taverna cheia, feira armada. Falta o que separa vilarejo de cidade: pedra em volta. Eu cuido dos papéis, você cuida do resto.',
    desfecho: 'Portão, torre e estandarte. Assino hoje mesmo: isto aqui é uma cidade.',
    missoes: [
      { id: 'c6_taverna', texto: 'Construa a Taverna', cumpre: (s) => temConstrucao(s, 'taverna') },
      { id: 'c6_mercado', texto: 'Construa o Mercado', cumpre: (s) => temConstrucao(s, 'mercado') },
      { id: 'c6_reputacao', texto: 'Junte 1000 de reputação', cumpre: (s) => s.reputacao >= 1000 },
      { id: 'c6_muralha', texto: 'Erga a Muralha', cumpre: (s) => temConstrucao(s, 'muralha') },
    ],
    recompensa: { tipo: 'brasas', valor: 1 },
  },
  {
    numero: 7,
    titulo: 'Epílogo: a forja não esquece',
    narrador: 'dito',
    abertura:
      'Toda forja velha guarda uma brasa que não apaga. Dizem que quem derrete tudo e começa de novo leva essa brasa junto, e o ferro lembra da mão que o bateu. Dá uma boa canção, se for verdade.',
    desfecho: 'Então era verdade. A canção já tem refrão: a forja não esquece.',
    missoes: [
      { id: 'c7_reforjar', texto: 'Reforje pela primeira vez', cumpre: (s) => s.reforjas >= 1 },
      { id: 'c7_talento', texto: 'Aprenda um talento', cumpre: (s) => s.talentos.length >= 1 },
    ],
    recompensa: { tipo: 'brasas', valor: 2 },
  },
]

/** Texto curto da recompensa: "500 moedas", "Escudo raro de ferro", "2 Brasas Ancestrais". */
export function descreverRecompensa(r: Recompensa): string {
  switch (r.tipo) {
    case 'moedas':
      return `${formatarCusto(r.valor)} moedas`
    case 'brasas':
      return r.valor === 1 ? '1 Brasa Ancestral' : `${r.valor} Brasas Ancestrais`
    case 'item':
      return `${NOME_TIPO[r.item]} ${nomeQualidade(r.qualidade, r.item)} de ${NOME_MATERIAL[r.material]}`
  }
}

export const TODAS_MISSOES: readonly string[] = CAPITULOS.flatMap((c) => c.missoes.map((m) => m.id))

/** Missões que passaram a valer agora e ainda não estavam gravadas. */
export function novasMissoes(s: GameState): string[] {
  const novas: string[] = []
  for (const c of CAPITULOS) {
    for (const m of c.missoes) {
      if (!s.campanha.feitas.includes(m.id) && m.cumpre(s)) novas.push(m.id)
    }
  }
  return novas
}

/** Grava as missões cumpridas. Devolve o MESMO estado se nada mudou. */
export function aplicarCampanha(s: GameState): { estado: GameState; novas: string[] } {
  const novas = novasMissoes(s)
  if (novas.length === 0) return { estado: s, novas }
  return { estado: { ...s, campanha: { ...s.campanha, feitas: [...s.campanha.feitas, ...novas] } }, novas }
}

export const missaoFeita = (s: Pick<GameState, 'campanha'>, id: string): boolean => s.campanha.feitas.includes(id)

export const capituloCompleto = (s: Pick<GameState, 'campanha'>, c: Capitulo): boolean =>
  c.missoes.every((m) => missaoFeita(s, m.id))

export const recompensaRecebida = (s: Pick<GameState, 'campanha'>, c: Capitulo): boolean =>
  s.campanha.recompensas.includes(c.numero)

/** O capítulo em andamento: o primeiro sem recompensa recebida. Null = campanha encerrada. */
export function capituloAtual(s: Pick<GameState, 'campanha'>): Capitulo | null {
  return CAPITULOS.find((c) => !recompensaRecebida(s, c)) ?? null
}

export interface ProgressoCampanha {
  capitulo: Capitulo | null
  feitas: number
  total: number
  /** Todas as missões do capítulo atual cumpridas: falta só receber. */
  prontoParaReceber: boolean
  /** A próxima missão por fazer no capítulo atual. */
  proxima: Missao | null
}

export function progressoCampanha(s: Pick<GameState, 'campanha'>): ProgressoCampanha {
  const capitulo = capituloAtual(s)
  if (!capitulo) return { capitulo: null, feitas: 0, total: 0, prontoParaReceber: false, proxima: null }
  const feitas = capitulo.missoes.filter((m) => missaoFeita(s, m.id)).length
  return {
    capitulo,
    feitas,
    total: capitulo.missoes.length,
    prontoParaReceber: feitas === capitulo.missoes.length,
    proxima: capitulo.missoes.find((m) => !missaoFeita(s, m.id)) ?? null,
  }
}

/**
 * Recebe a recompensa do capítulo atual, se ele estiver completo. Qualquer outro caso devolve o MESMO
 * estado. O item entra mesmo com o inventário cheio (como o presente dos chefes); as moedas contam
 * como ganhas no ciclo.
 */
export function receberRecompensa(s: GameState): GameState {
  const c = capituloAtual(s)
  if (!c || !capituloCompleto(s, c)) return s
  const campanha = { ...s.campanha, recompensas: [...s.campanha.recompensas, c.numero] }
  const r = c.recompensa
  switch (r.tipo) {
    case 'moedas':
      return { ...s, campanha, moedas: s.moedas + r.valor, moedasGanhas: s.moedasGanhas + r.valor }
    case 'brasas':
      return { ...s, campanha, brasas: s.brasas + r.valor }
    case 'item': {
      const item: Item = {
        id: s.proximoIdItem,
        tipo: r.item,
        material: r.material,
        qualidade: r.qualidade,
        ferreiro: r.origem,
        valor: valorItem(r.item, r.material, r.qualidade),
        pontuacao: Q_MINIMO[r.qualidade],
      }
      return { ...s, campanha, itens: [...s.itens, item], proximoIdItem: s.proximoIdItem + 1 }
    }
  }
}
