import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DEF_CONSTRUCAO, temConstrucao, type ConstrucaoId } from '../game/construcoes.ts'
import { DEF_NPC, itensDaEntrega, textoPedido, type Encomenda } from '../game/encomendas.ts'
import { formatarCusto } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'
import { useEscalaCena } from './useEscalaCena.ts'

/** Tamanho nativo da cena (pixels da arte), igual ao da forja. */
const W = 176
const H = 88

/** Onde cada obra fica na paisagem (canto superior esquerdo do sprite 32×32). A Muralha é uma camada. */
const LOTES: readonly { id: Exclude<ConstrucaoId, 'muralha'>; x: number }[] = [
  { id: 'segunda_fornalha', x: 6 },
  { id: 'armazem', x: 48 },
  { id: 'taverna', x: 96 },
  { id: 'mercado', x: 138 },
]
const Y_OBRA = 31

/** Por onde cada morador anda (em pixels de arte) e em quanto tempo cruza o trecho. Eles ficam no primeiro
 * plano, abaixo da linha das obras: maiores que as casas por estarem mais perto, sem tapá-las. */
const PASSEIOS: readonly { de: number; ate: number; segundos: number; y: number }[] = [
  { de: 8, ate: 70, segundos: 9, y: 61 },
  { de: 140, ate: 84, segundos: 11, y: 63 },
  { de: 60, ate: 128, segundos: 13, y: 62 },
]

/**
 * O vilarejo como paisagem: começa com três casebres e um poço; cada obra construída aparece no seu
 * lote (com um salto de poeira na hora), a Muralha fecha o horizonte e os moradores com encomenda
 * aberta andam pela estrada. Tocar numa obra, num lote ou num morador mostra o que é.
 */
export function CenaVilarejo() {
  const jogo = useGame((s) => s.jogo)
  const { caixa, escala } = useEscalaCena(W)
  const [balao, setBalao] = useState<{ id: number; texto: string } | null>(null)
  const contador = useRef(0)

  // Obras que acabaram de ficar prontas (para a animação de chegada).
  const antes = useRef(jogo.construcoes)
  const [novas, setNovas] = useState<readonly ConstrucaoId[]>([])
  useEffect(() => {
    const chegaram = jogo.construcoes.filter((c) => !antes.current.includes(c))
    antes.current = jogo.construcoes
    if (chegaram.length === 0) return
    setNovas(chegaram)
    const t = window.setTimeout(() => setNovas([]), 1200)
    return () => window.clearTimeout(t)
  }, [jogo.construcoes])

  useEffect(() => {
    if (!balao) return
    const t = window.setTimeout(() => setBalao(null), 3200)
    return () => window.clearTimeout(t)
  }, [balao])

  const dizer = (texto: string) => setBalao({ id: ++contador.current, texto })

  const tocarObra = (id: ConstrucaoId) => {
    const d = DEF_CONSTRUCAO[id]
    if (temConstrucao(jogo, id)) {
      dizer(`${d.nome}: ${d.efeito}`)
      return
    }
    dizer(`${d.nome}: pede ${d.reputacao} de reputação e ${formatarCusto(d.custo)} moedas.`)
    document.getElementById(`obra-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const tocarMorador = (e: Encomenda) => dizer(`${DEF_NPC[e.npc].nome} quer ${textoPedido(e)}.`)

  const comMuralha = temConstrucao(jogo, 'muralha')
  const palco = { width: W, height: H, transform: `scale(${escala})` } as CSSProperties

  return (
    <div className="cena cena-vila" ref={caixa} style={{ height: H * escala }}>
      <div className="cena-palco" style={palco}>
        <Sprite nome="cena_vilarejo" escala={1} rotulo="O vilarejo" />

        {comMuralha && (
          <span className={`vila-muralha ${novas.includes('muralha') ? 'nova' : ''}`} aria-hidden="true">
            <Sprite nome="cena_muralha" escala={1} />
          </span>
        )}

        {LOTES.map(({ id, x }) => {
          const feita = temConstrucao(jogo, id)
          const d = DEF_CONSTRUCAO[id]
          return (
            <button
              key={id}
              type="button"
              className={`cena-ponto vila-obra ${feita ? 'feita' : 'lote'} ${novas.includes(id) ? 'nova' : ''}`}
              style={{ left: x, top: Y_OBRA }}
              onClick={() => tocarObra(id)}
              aria-label={feita ? `${d.nome}, construída` : `Lote da obra ${d.nome}, ainda por construir`}
            >
              <Sprite nome={feita ? `construcao_${id}` : 'lote'} escala={1} />
              {novas.includes(id) && <span className="vila-poeira" aria-hidden="true" />}
            </button>
          )
        })}

        {/* Fumaça da chaminé da taverna: sinal de casa cheia. */}
        {temConstrucao(jogo, 'taverna') && <span className="cena-fumaca" style={{ left: 119, top: 28 }} aria-hidden="true" />}

        {jogo.encomendas.slice(0, PASSEIOS.length).map((e, i) => {
          const p = PASSEIOS[i]!
          const pronta = itensDaEntrega(jogo, e) !== null
          const estilo = {
            left: p.de,
            top: p.y,
            '--passeio': `${p.ate - p.de}px`,
            '--tempo': `${p.segundos}s`,
            '--vira': p.ate < p.de ? -1 : 1,
          } as CSSProperties
          return (
            <button
              key={e.id}
              type="button"
              className="vila-andante"
              style={estilo}
              onClick={() => tocarMorador(e)}
              aria-label={`${DEF_NPC[e.npc].nome}, com uma encomenda${pronta ? ' pronta para entregar' : ''}`}
            >
              <span className="vila-andante-corpo">
                <Sprite nome={`npc_${e.npc}`} escala={1} />
              </span>
              {pronta && (
                <span className="vila-pronta" aria-hidden="true">
                  !
                </span>
              )}
            </button>
          )
        })}

        {balao && (
          <span key={balao.id} className="vila-balao" role="status">
            {balao.texto}
          </span>
        )}
      </div>
    </div>
  )
}
