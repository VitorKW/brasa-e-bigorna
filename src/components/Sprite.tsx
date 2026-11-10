import { useEffect, useState, type CSSProperties } from 'react'
import { CONSTRUCOES, type ConstrucaoId } from '../game/construcoes.ts'
import { NPCS, type NpcId } from '../game/encomendas.ts'
import { FERREIROS, type FerreiroId } from '../game/ferreiros.ts'
import { CLASSES, type ClasseId } from '../game/herois.ts'
import { MATERIAIS, TIPOS_ITEM, type MaterialId, type TipoItem } from '../game/items.ts'
import { RAMOS, type RamoId } from '../game/talentos.ts'
import type { CamadaEstacao, CamadaHeroi } from '../game/visual.ts'

export type SpriteNome =
  | `item_${TipoItem}_${MaterialId}`
  | `ferreiro_${FerreiroId}`
  | 'bigorna'
  | 'bigorna_batendo'
  | 'mina'
  | 'carvoaria'
  | 'fornalha'
  | 'fornalha_acesa'
  | 'icone_minerio'
  | 'icone_carvao'
  | 'icone_lingote'
  | 'icone_moeda'
  | 'icone_lingote_aco'
  | 'icone_fragmento'
  | 'icone_reputacao'
  | 'forno_aco'
  | 'forno_aco_aceso'
  | `heroi_${ClasseId}`
  | `heroi_${ClasseId}_andando`
  | 'chefe_golem'
  | 'chefe_serpe'
  | `construcao_${ConstrucaoId}`
  | `talento_${RamoId}`
  | 'icone_brasa'
  | 'icone_conquista'
  | `npc_${NpcId}`
  | 'regiao_vale'
  | 'regiao_serra'
  | 'cena_forja'
  | 'carrinho'
  | 'cena_vilarejo'
  | 'cena_muralha'
  | 'lote'
  | 'icone_som'
  | 'icone_mudo'
  | CamadaEstacao
  | CamadaHeroi

interface Def {
  /** Largura e altura de UM quadro, em pixels nativos. */
  w: number
  h: number
  /** Cor e inicial do placeholder (paleta do GDD §6). */
  cor: string
  texto: string
  inicial: string
  /** Quadros padrão se o arquivo for uma faixa horizontal. */
  quadros?: number
  /** Camada transparente por cima de outro sprite: sem arquivo, não desenha nada (nunca um quadrado). */
  camada?: boolean
}

const CAMADAS_ESTACAO = Object.fromEntries(
  (['mina', 'carvoaria', 'fornalha', 'bigorna'] as const).flatMap((e) =>
    ([1, 2, 3, 4] as const).map((k) => [`${e}_e${k}`, { w: 32, h: 32, cor: '', texto: '', inicial: '', camada: true } satisfies Def]),
  ),
) as Record<CamadaEstacao, Def>

const CAMADAS_HEROI = Object.fromEntries(
  (['armadura', 'elmo', 'escudo', 'espada', 'machado'] as const).flatMap((p) =>
    (['ferro', 'aco'] as const).map((m) => [`equip_${p}_${m}`, { w: 24, h: 24, cor: '', texto: '', inicial: '', camada: true } satisfies Def]),
  ),
) as Record<CamadaHeroi, Def>

const COR_MATERIAL: Record<MaterialId, string> = { ferro: '#5b5662', aco: '#7d8aa0' }

const SPRITES_ITEM = Object.fromEntries(
  TIPOS_ITEM.flatMap((tipo) =>
    MATERIAIS.map((m) => [
      `item_${tipo}_${m}`,
      { w: 16, h: 16, cor: COR_MATERIAL[m], texto: '#f3e9dc', inicial: tipo.charAt(0).toUpperCase() } satisfies Def,
    ]),
  ),
) as Record<`item_${TipoItem}_${MaterialId}`, Def>

const SPRITES_FERREIRO = Object.fromEntries(
  FERREIROS.map((id) => [
    `ferreiro_${id}`,
    { w: 24, h: 24, cor: '#2e2a30', texto: '#ffd47a', inicial: id.charAt(0).toUpperCase() } satisfies Def,
  ]),
) as Record<`ferreiro_${FerreiroId}`, Def>

const COR_CLASSE: Record<ClasseId, string> = { guerreiro: '#8a3b2a', guardia: '#3f5f7a', batedor: '#4d6b3a' }

const SPRITES_HEROI = Object.fromEntries(
  CLASSES.flatMap((c) => [
    [`heroi_${c}`, { w: 24, h: 24, cor: COR_CLASSE[c], texto: '#f3e9dc', inicial: c.charAt(0).toUpperCase() } satisfies Def],
    [
      `heroi_${c}_andando`,
      { w: 24, h: 24, cor: COR_CLASSE[c], texto: '#f3e9dc', inicial: c.charAt(0).toUpperCase(), quadros: 4 } satisfies Def,
    ],
  ]),
) as Record<`heroi_${ClasseId}` | `heroi_${ClasseId}_andando`, Def>

const SPRITES_CONSTRUCAO = Object.fromEntries(
  CONSTRUCOES.map((c) => [
    `construcao_${c}`,
    { w: 32, h: 32, cor: '#4a4350', texto: '#f3e9dc', inicial: c.charAt(0).toUpperCase() } satisfies Def,
  ]),
) as Record<`construcao_${ConstrucaoId}`, Def>

const COR_RAMO: Record<RamoId, string> = { fornalheiro: '#e2582a', mestre: '#7d8aa0', capitao: '#6fb1ff' }

const SPRITES_TALENTO = Object.fromEntries(
  RAMOS.map((r) => [
    `talento_${r}`,
    { w: 16, h: 16, cor: COR_RAMO[r], texto: '#1b1618', inicial: r.charAt(0).toUpperCase() } satisfies Def,
  ]),
) as Record<`talento_${RamoId}`, Def>

const COR_NPC: Record<NpcId, string> = {
  quiteria: '#8a5a2a',
  amaro: '#3f5f7a',
  tonico: '#4d6b3a',
  jurema: '#7a4a6a',
  ines: '#5a6b3a',
  dito: '#a0522d',
  almir: '#6a5a8a',
  zuleica: '#3f7a6a',
}

const SPRITES_NPC = Object.fromEntries(
  NPCS.map((n) => [
    `npc_${n}`,
    { w: 24, h: 24, cor: COR_NPC[n], texto: '#f3e9dc', inicial: n.charAt(0).toUpperCase() } satisfies Def,
  ]),
) as Record<`npc_${NpcId}`, Def>

const SPRITES: Record<SpriteNome, Def> = {
  ...CAMADAS_ESTACAO,
  ...CAMADAS_HEROI,
  ...SPRITES_ITEM,
  ...SPRITES_NPC,
  ...SPRITES_CONSTRUCAO,
  ...SPRITES_TALENTO,
  ...SPRITES_FERREIRO,
  ...SPRITES_HEROI,
  bigorna: { w: 32, h: 32, cor: '#5b5662', texto: '#f3e9dc', inicial: 'B' },
  bigorna_batendo: { w: 32, h: 32, cor: '#f29a3a', texto: '#1b1618', inicial: 'B', quadros: 4 },
  mina: { w: 32, h: 32, cor: '#5b5662', texto: '#f3e9dc', inicial: 'M' },
  carvoaria: { w: 32, h: 32, cor: '#2e2a30', texto: '#f3e9dc', inicial: 'C' },
  fornalha: { w: 32, h: 32, cor: '#5b5662', texto: '#f3e9dc', inicial: 'F' },
  fornalha_acesa: { w: 32, h: 32, cor: '#f29a3a', texto: '#1b1618', inicial: 'F', quadros: 4 },
  icone_minerio: { w: 16, h: 16, cor: '#5b5662', texto: '#f3e9dc', inicial: 'M' },
  icone_carvao: { w: 16, h: 16, cor: '#2e2a30', texto: '#f3e9dc', inicial: 'C' },
  icone_lingote: { w: 16, h: 16, cor: '#f29a3a', texto: '#1b1618', inicial: 'L' },
  icone_moeda: { w: 16, h: 16, cor: '#ffd47a', texto: '#1b1618', inicial: 'm' },
  icone_lingote_aco: { w: 16, h: 16, cor: '#7d8aa0', texto: '#1b1618', inicial: 'A' },
  icone_fragmento: { w: 16, h: 16, cor: '#c792ff', texto: '#1b1618', inicial: 'F' },
  icone_reputacao: { w: 16, h: 16, cor: '#6fb1ff', texto: '#1b1618', inicial: 'R' },
  forno_aco: { w: 32, h: 32, cor: '#5b6677', texto: '#f3e9dc', inicial: 'A' },
  forno_aco_aceso: { w: 32, h: 32, cor: '#f29a3a', texto: '#1b1618', inicial: 'A', quadros: 4 },
  chefe_golem: { w: 48, h: 48, cor: '#4a3f45', texto: '#f3e9dc', inicial: 'G' },
  chefe_serpe: { w: 48, h: 48, cor: '#5a4a3c', texto: '#f3e9dc', inicial: 'S' },
  icone_brasa: { w: 16, h: 16, cor: '#e2582a', texto: '#1b1618', inicial: 'B' },
  icone_conquista: { w: 16, h: 16, cor: '#ffd47a', texto: '#1b1618', inicial: 'C' },
  regiao_vale: { w: 96, h: 32, cor: '#3f5a3a', texto: '#f3e9dc', inicial: 'Vale' },
  regiao_serra: { w: 96, h: 32, cor: '#4a4f5c', texto: '#f3e9dc', inicial: 'Serra' },
  cena_forja: { w: 176, h: 88, cor: '#2e2a30', texto: '#f3e9dc', inicial: '' },
  carrinho: { w: 16, h: 12, cor: '#5b5662', texto: '#f3e9dc', inicial: '' },
  cena_vilarejo: { w: 176, h: 88, cor: '#6b8a4c', texto: '#f3e9dc', inicial: '' },
  cena_muralha: { w: 176, h: 88, cor: '', texto: '', inicial: '', camada: true },
  lote: { w: 32, h: 32, cor: '#4a2f22', texto: '#f3e9dc', inicial: '' },
  icone_som: { w: 16, h: 16, cor: '#5b5662', texto: '#f3e9dc', inicial: '♪' },
  icone_mudo: { w: 16, h: 16, cor: '#3a353d', texto: '#f3e9dc', inicial: '×' },
}

const urlDe = (nome: SpriteNome) => `${import.meta.env.BASE_URL}sprites/${nome}.png`

/** Cache de "essa imagem existe?" para não retestar a cada render. */
const existe = new Map<string, Promise<boolean>>()
/** Respostas já conhecidas, lidas de forma síncrona: um sprite que já carregou uma vez nunca mais pisca. */
const resultado = new Map<string, boolean>()
function testarImagem(url: string): Promise<boolean> {
  let p = existe.get(url)
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth > 0)
      img.onerror = () => resolve(false)
      img.src = url
    }).then((ok) => {
      resultado.set(url, ok)
      return ok
    })
    existe.set(url, p)
  }
  return p
}

interface Props {
  nome: SpriteNome
  /** Escala inteira (1, 2, 3...). Mantém pixels nítidos. */
  escala?: number
  /** Faixa horizontal: número de quadros (padrão do sprite, se houver). */
  quadros?: number
  fps?: number
  /** Texto para leitores de tela. Sem ele, o sprite é decorativo. */
  rotulo?: string
}

export function Sprite({ nome, escala = 2, quadros, fps = 6, rotulo }: Props) {
  const def = SPRITES[nome]
  const url = urlDe(nome)
  const [carregou, setCarregou] = useState<boolean | null>(() => resultado.get(url) ?? null)
  const n = Math.max(1, quadros ?? def.quadros ?? 1)
  const esc = Math.max(1, Math.round(escala))
  const largura = def.w * esc
  const altura = def.h * esc

  useEffect(() => {
    let vivo = true
    const conhecido = resultado.get(url)
    setCarregou(conhecido ?? null)
    if (conhecido === undefined) void testarImagem(url).then((ok) => vivo && setCarregou(ok))
    return () => {
      vivo = false
    }
  }, [url])

  const a11y = rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true }

  if (carregou === true) {
    if (n === 1) {
      return (
        <img
          className="sprite"
          src={url}
          width={largura}
          height={altura}
          alt={rotulo ?? ''}
          aria-hidden={rotulo ? undefined : true}
          draggable={false}
        />
      )
    }
    const faixa = largura * n
    const estilo = {
      width: largura,
      height: altura,
      backgroundImage: `url(${url})`,
      backgroundSize: `${faixa}px ${altura}px`,
      '--faixa': `${faixa}px`,
      animationDuration: `${n / fps}s`,
      animationTimingFunction: `steps(${n})`,
    } as CSSProperties
    return <div className="sprite sprite-faixa" style={estilo} {...a11y} />
  }

  // Camada sem arquivo (ou ainda carregando): nada, para não cobrir a arte de baixo.
  if (def.camada) return null

  // Carregando: uma caixa vazia do tamanho certo. O quadrado colorido piscando antes da arte era feio;
  // ele fica só para arquivo ausente de verdade.
  if (carregou === null && typeof window !== 'undefined') {
    // span: sprites aparecem dentro de <p> e <button>, onde um <div> é HTML inválido.
    return <span className="sprite" style={{ display: 'inline-block', width: largura, height: altura }} {...a11y} />
  }

  // Arquivo ausente (ou render no servidor, nos testes): quadrado com a cor da paleta e a inicial.
  const estilo: CSSProperties = {
    width: largura,
    height: altura,
    background: def.cor,
    color: def.texto,
    fontSize: Math.round(altura * 0.5),
  }
  return (
    <div className="sprite sprite-placeholder" style={estilo} {...a11y}>
      {def.inicial}
    </div>
  )
}
