import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  FILA_MAX,
  faixaQ,
  estoqueDe,
  inventarioCheio,
  motivoParaNaoIniciar,
  type MotivoBloqueio,
} from '../game/bigorna.ts'
import { custoProximoNivel, podeComprar } from '../game/economy.ts'
import { formatar, formatarCusto } from '../game/format.ts'
import {
  MATERIAIS,
  MULT_MATERIAL,
  NOME_MATERIAL,
  NOME_TIPO,
  RECEITAS,
  TIPOS_ITEM,
  nomeQualidade,
  qualidadeDe,
  rotuloQualidade,
  type MaterialId,
  type ReceitaId,
} from '../game/items.ts'
import { useGame } from '../store.ts'
import { Flutuantes, useFlutuantes } from './Flutuantes.tsx'
import { Sprite } from './Sprite.tsx'
import { SpriteEstacao } from './SpritesEvolucao.tsx'
import { nomeEstagio } from '../game/visual.ts'

const TEXTO_BLOQUEIO: Record<MotivoBloqueio, string> = {
  bloqueada: '',
  ocupada: '',
  'sem-lingote': 'Faltam lingotes para esta receita.',
  'sem-forno': 'O aço precisa do Forno de aço.',
  'inventario-cheio': 'Inventário cheio. Venda itens para forjar.',
}


function Faiscas() {
  // 8 faíscas saindo do ponto de impacto; cada uma tem direção própria via variáveis CSS.
  return (
    <span className="faiscas" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const ang = (i / 8) * Math.PI * 2 - Math.PI / 2
        const estilo = { '--dx': `${Math.cos(ang) * 34}px`, '--dy': `${Math.sin(ang) * 34}px` }
        return <span key={i} className="faisca" style={estilo as CSSProperties} />
      })}
    </span>
  )
}

export function BigornaCard() {
  const jogo = useGame((s) => s.jogo)
  const ultimoForjado = useGame((s) => s.ultimoForjado)
  const melhorar = useGame((s) => s.melhorar)
  const forjar = useGame((s) => s.forjar)
  const alternarAutomatico = useGame((s) => s.alternarAutomatico)
  const removerDaFila = useGame((s) => s.removerDaFila)
  const reduzir = useReducedMotion()

  const [escolhida, setEscolhida] = useState<ReceitaId>(jogo.ultimaReceita ?? 'espada')
  const [materialEscolhido, setMaterial] = useState<MaterialId>(jogo.ultimoMaterial)
  // Sem forno não há aço, mesmo que o save tenha 'aço' como último material.
  const material: MaterialId = jogo.niveis.forno >= 1 ? materialEscolhido : 'ferro'
  const { itens, adicionar, remover } = useFlutuantes(2)
  const [faiscas, setFaiscas] = useState<number | null>(null)
  const visto = useRef<number | null>(ultimoForjado?.id ?? null)

  // "+1 Espada (rara)" a cada item concluído; faíscas só no perfeito (e sem reduced-motion).
  useEffect(() => {
    if (!ultimoForjado || ultimoForjado.id === visto.current) return
    visto.current = ultimoForjado.id
    const { item, batida } = ultimoForjado.forjado
    adicionar(`+1 ${NOME_TIPO[item.tipo]} (${nomeQualidade(item.qualidade, item.tipo)})`)
    if (batida === 'perfeito' && !reduzir) {
      setFaiscas(ultimoForjado.id)
      const id = window.setTimeout(() => setFaiscas(null), 700)
      return () => window.clearTimeout(id)
    }
  }, [ultimoForjado, adicionar, reduzir])

  const nivel = jogo.niveis.bigorna
  const custo = custoProximoNivel(jogo, 'bigorna')

  if (nivel < 1) {
    return (
      <article className="estacao painel fria" aria-label="Bigorna, bloqueada">
        <div className="estacao-arte">
          <Sprite nome="bigorna" escala={2} rotulo="Bigorna" />
        </div>
        <div className="estacao-info">
          <div className="estacao-titulo">
            <h2>Bigorna</h2>
            <span className="nivel">bloqueada</span>
          </div>
          <p className="estacao-aviso">Lingotes viram espadas, escudos e armaduras.</p>
          <p className="estacao-dica">Cada item vale muito mais que os lingotes que ele usa.</p>
        </div>
        <button
          type="button"
          className="botao botao-primario botao-melhorar"
          disabled={!podeComprar(jogo, 'bigorna')}
          onClick={() => melhorar('bigorna')}
          aria-label={`Construir a bigorna por ${formatarCusto(custo)} moedas`}
        >
          <span>Construir bigorna</span>
          <span className="botao-custo">
            <Sprite nome="icone_moeda" escala={1} />
            {formatarCusto(custo)}
          </span>
        </button>
      </article>
    )
  }

  const forja = jogo.forja
  const trabalhando = forja !== null && (forja.progresso < 1 || forja.minigame === 'pendente')
  const parada = forja === null
  const faixa = faixaQ(jogo, material)
  const qMin = qualidadeDe(faixa.min)
  const qMax = qualidadeDe(faixa.max)
  const motivo = motivoParaNaoIniciar(jogo, escolhida, material)
  const ocupada = motivo === 'ocupada'
  const filaCheia = jogo.fila.length >= FILA_MAX
  // "Forjar" vale também com a bigorna ocupada (entra na fila); "com batida" só com ela livre.
  const podeForjar = motivo === null || (ocupada && !filaCheia)
  const podeBatida = motivo === null
  const aviso = motivo ? TEXTO_BLOQUEIO[motivo] : ''
  const nomeForja = forja ? NOME_TIPO[forja.receita] : ''
  const pct = forja ? Math.floor(forja.progresso * 100) : 0
  const esperandoEspaco = forja !== null && forja.progresso >= 1 && forja.minigame !== 'pendente'

  return (
    <article className={`estacao painel bigorna ${trabalhando ? 'quente' : 'fria'}`} aria-label="Bigorna">
      <div className="estacao-arte">
        <SpriteEstacao estacao="bigorna" nivel={nivel} base={trabalhando ? 'bigorna_batendo' : 'bigorna'} escala={2} fps={4} rotulo={nomeEstagio('bigorna', nivel)} />
        {faiscas !== null && <Faiscas key={faiscas} />}
      </div>

      <div className="estacao-info">
        <div className="estacao-titulo">
          <h2>{nomeEstagio('bigorna', nivel)}</h2>
          <span className="nivel">nível {nivel}</span>
        </div>
        <div className="estacao-taxa bigorna-feedback">
          <span>
            {qMin === qMax
              ? rotuloQualidade(qMin)
              : `${rotuloQualidade(qMin)} a ${rotuloQualidade(qMax)}`}
          </span>
          <Flutuantes itens={itens} onFim={remover} subida={26} />
        </div>
      </div>

      {forja && (
        <div className="forja-andamento" role="status">
          <div className="forja-linha">
            <span>
              {esperandoEspaco
                ? `${nomeForja} pronta. Falta espaço no inventário.`
                : forja.minigame === 'pendente'
                  ? `${nomeForja}: dê a batida!`
                  : `Forjando ${nomeForja.toLowerCase()}`}
            </span>
            <strong>{pct}%</strong>
          </div>
          <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso da forja">
            <div className="barra-cheia" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {jogo.niveis.forno >= 1 && (
        <div className="materiais" role="radiogroup" aria-label="Material">
          {MATERIAIS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={material === m}
              className={`material ${material === m ? 'marcado' : ''}`}
              onClick={() => setMaterial(m)}
            >
              <Sprite nome={m === 'aco' ? 'icone_lingote_aco' : 'icone_lingote'} escala={1} />
              <span>{m === 'aco' ? 'Aço' : 'Ferro'}</span>
              <small>{formatar(estoqueDe(jogo, m))} lingotes</small>
            </button>
          ))}
        </div>
      )}

      <div className="receitas" role="radiogroup" aria-label="Receita">
        {TIPOS_ITEM.map((tipo) => {
          const r = RECEITAS[tipo]
          const marcada = escolhida === tipo
          const faltaLingote = estoqueDe(jogo, material) < r.lingotes
          return (
            <button
              key={tipo}
              type="button"
              role="radio"
              aria-checked={marcada}
              className={`receita ${marcada ? 'marcada' : ''}`}
              onClick={() => setEscolhida(tipo)}
            >
              <Sprite nome={`item_${tipo}_${material}`} escala={2} />
              <span className="receita-nome">{NOME_TIPO[tipo]}</span>
              <span className={`receita-info ${faltaLingote ? 'falta' : ''}`}>
                <Sprite nome={material === 'aco' ? 'icone_lingote_aco' : 'icone_lingote'} escala={1} /> {r.lingotes}
              </span>
              <span className="receita-valor">
                <Sprite nome="icone_moeda" escala={1} /> {formatar(r.valorBase * MULT_MATERIAL[material])}
              </span>
            </button>
          )
        })}
      </div>

      <div className="forja-acoes">
        <button
          type="button"
          className="botao botao-primario"
          disabled={!podeForjar}
          onClick={() => forjar(escolhida, false, material)}
        >
          {ocupada ? 'Enfileirar' : 'Forjar'}
        </button>
        <button
          type="button"
          className="botao botao-secundario"
          disabled={!podeBatida}
          onClick={() => forjar(escolhida, true, material)}
          aria-describedby="dica-batida"
        >
          Forjar com batida
        </button>
      </div>
      <p id="dica-batida" className="estacao-dica forja-dica">
        {aviso || (ocupada && filaCheia ? 'A fila está cheia.' : 'Com batida: acerte o ritmo e o item sai melhor.')}
      </p>

      <button
        type="button"
        className={`botao interruptor ${jogo.automatico ? 'ligado' : ''}`}
        role="switch"
        aria-checked={jogo.automatico}
        onClick={alternarAutomatico}
      >
        <span className="interruptor-trilho" aria-hidden="true">
          <span className="interruptor-bola" />
        </span>
        <span>
          Modo automático
          <small>
            {jogo.automatico
              ? ` · repete ${jogo.ultimaReceita ? `${NOME_TIPO[jogo.ultimaReceita].toLowerCase()} de ${NOME_MATERIAL[jogo.ultimoMaterial]}` : 'a última receita'}`
              : ' · desligado'}
          </small>
        </span>
      </button>

      {jogo.fila.length > 0 && (
        <ol className="fila" aria-label="Fila de forja">
          {jogo.fila.map((r, i) => (
            <li key={`${i}-${r.receita}-${r.material}`}>
              <span>{i + 1}. {NOME_TIPO[r.receita]} de {NOME_MATERIAL[r.material]}</span>
              <button
                type="button"
                className="botao-icone"
                onClick={() => removerDaFila(i)}
                aria-label={`Tirar ${NOME_TIPO[r.receita].toLowerCase()} de ${NOME_MATERIAL[r.material]} da fila`}
              >
                Tirar
              </button>
            </li>
          ))}
        </ol>
      )}

      {parada && jogo.automatico && inventarioCheio(jogo) && (
        <p className="estacao-aviso forja-dica">A bigorna parou: inventário cheio.</p>
      )}

      <button
        type="button"
        className="botao botao-primario botao-melhorar"
        disabled={!podeComprar(jogo, 'bigorna')}
        onClick={() => melhorar('bigorna')}
        aria-label={`Melhorar Bigorna por ${formatarCusto(custo)} moedas`}
      >
        <span>Melhorar</span>
        <span className="botao-custo">
          <Sprite nome="icone_moeda" escala={1} />
          {formatarCusto(custo)}
        </span>
      </button>
    </article>
  )
}
