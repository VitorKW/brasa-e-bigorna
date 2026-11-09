import { useEffect, useState, type CSSProperties } from 'react'

export type SpriteNome =
  | 'mina'
  | 'carvoaria'
  | 'fornalha'
  | 'fornalha_acesa'
  | 'icone_minerio'
  | 'icone_carvao'
  | 'icone_lingote'
  | 'icone_moeda'

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
}

const SPRITES: Record<SpriteNome, Def> = {
  mina: { w: 32, h: 32, cor: '#5b5662', texto: '#f3e9dc', inicial: 'M' },
  carvoaria: { w: 32, h: 32, cor: '#2e2a30', texto: '#f3e9dc', inicial: 'C' },
  fornalha: { w: 32, h: 32, cor: '#5b5662', texto: '#f3e9dc', inicial: 'F' },
  fornalha_acesa: { w: 32, h: 32, cor: '#f29a3a', texto: '#1b1618', inicial: 'F', quadros: 4 },
  icone_minerio: { w: 16, h: 16, cor: '#5b5662', texto: '#f3e9dc', inicial: 'M' },
  icone_carvao: { w: 16, h: 16, cor: '#2e2a30', texto: '#f3e9dc', inicial: 'C' },
  icone_lingote: { w: 16, h: 16, cor: '#f29a3a', texto: '#1b1618', inicial: 'L' },
  icone_moeda: { w: 16, h: 16, cor: '#ffd47a', texto: '#1b1618', inicial: 'm' },
}

const urlDe = (nome: SpriteNome) => `${import.meta.env.BASE_URL}sprites/${nome}.png`

/** Cache de "essa imagem existe?" para não retestar a cada render. */
const existe = new Map<string, Promise<boolean>>()
function testarImagem(url: string): Promise<boolean> {
  let p = existe.get(url)
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth > 0)
      img.onerror = () => resolve(false)
      img.src = url
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
  const [carregou, setCarregou] = useState<boolean | null>(null)
  const n = Math.max(1, quadros ?? def.quadros ?? 1)
  const esc = Math.max(1, Math.round(escala))
  const largura = def.w * esc
  const altura = def.h * esc

  useEffect(() => {
    let vivo = true
    setCarregou(null)
    void testarImagem(url).then((ok) => vivo && setCarregou(ok))
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

  // Carregando ou arquivo ausente: quadrado com a cor da paleta e a inicial.
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
