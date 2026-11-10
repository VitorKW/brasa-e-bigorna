import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { bonusBrasas } from '../game/bonus.ts'
import { chefeDerrotado } from '../game/chefe.ts'
import { DEF_CONSTRUCAO, temConstrucao } from '../game/construcoes.ts'
import { formatar, formatarCusto } from '../game/format.ts'
import { previaReforjar } from '../game/reforjar.ts'
import {
  DEF_RAMO,
  DEF_TALENTO,
  RAMOS,
  custoTalento,
  motivoNaoComprarTalento,
  preRequisito,
  talentosDoRamo,
  temTalento,
  type RamoId,
  type TalentoId,
} from '../game/talentos.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'

/** Tempo que o botão de confirmação precisa ficar apertado. */
export const SEGURAR_MS = 1500

/**
 * Botão de confirmação por "segurar": a ação forte do jogo não acontece num toque sem querer.
 * O progresso avança em passos de 50 ms (sem animação CSS, então vale também com movimento
 * reduzido). Funciona com ponteiro (dedo ou mouse) e com Enter ou Espaço.
 */
function BotaoSegurar({ rotulo, onConfirmar }: { rotulo: string; onConfirmar: () => void }) {
  const [progresso, setProgresso] = useState(0)
  const timer = useRef<number | null>(null)
  const inicio = useRef(0)
  const confirmar = useRef(onConfirmar)
  confirmar.current = onConfirmar

  const parar = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    setProgresso(0)
  }
  const comecar = () => {
    if (timer.current !== null) return
    inicio.current = performance.now()
    timer.current = window.setInterval(() => {
      const p = (performance.now() - inicio.current) / SEGURAR_MS
      if (p >= 1) {
        parar()
        confirmar.current()
      } else {
        setProgresso(p)
      }
    }, 50)
  }
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    },
    [],
  )

  const aoTeclar = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault()
      comecar()
    }
  }
  const aoSoltarTecla = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') parar()
  }

  return (
    <button
      type="button"
      className="botao botao-primario botao-largo segurar"
      onPointerDown={comecar}
      onPointerUp={parar}
      onPointerLeave={parar}
      onPointerCancel={parar}
      onKeyDown={aoTeclar}
      onKeyUp={aoSoltarTecla}
      onBlur={parar}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${rotulo}. Segure por ${SEGURAR_MS / 1000} segundos para confirmar.`}
    >
      <span className="segurar-enchimento" style={{ width: `${Math.floor(progresso * 100)}%` }} aria-hidden="true" />
      <span className="segurar-texto">{progresso > 0 ? 'Segurando...' : rotulo}</span>
    </button>
  )
}

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={`requisito ${ok ? 'ok' : ''}`}>
      <span className="requisito-estado">{ok ? 'feito' : 'falta'}</span>
      <span>{texto}</span>
    </li>
  )
}

function Trancado() {
  const jogo = useGame((s) => s.jogo)
  const muralha = DEF_CONSTRUCAO.muralha
  return (
    <section className="secao painel trancado" aria-label="Reforjar (trancado)">
      <div className="secao-topo">
        <h2>Reforjar</h2>
        <span className="secao-contagem cheio">trancado</span>
      </div>
      <p className="estacao-dica">
        Quando o vilarejo vira cidade, dá para derreter tudo e forjar de novo, mais forte. Primeiro a Muralha precisa
        de pé.
      </p>
      <ul className="requisitos">
        <Requisito ok={jogo.reputacao >= muralha.reputacao} texto={`Reputação ${formatar(Math.min(jogo.reputacao, muralha.reputacao))}/${muralha.reputacao}`} />
        <Requisito ok={chefeDerrotado(jogo, 'serpe')} texto="Derrotar a Serpe de Cinza, na Serra Cinzenta" />
        <Requisito ok={temConstrucao(jogo, 'muralha')} texto={`Construir a Muralha no Vilarejo (${formatarCusto(muralha.custo)} moedas)`} />
      </ul>
    </section>
  )
}

function Previa() {
  const jogo = useGame((s) => s.jogo)
  const reforjar = useGame((s) => s.reforjar)
  const ultimo = useGame((s) => s.ultimoReforjar)
  const [confirmando, setConfirmando] = useState(false)
  const p = previaReforjar(jogo, jogo.lastTick)

  const mensagemBloqueio =
    p.motivo === 'expedicao'
      ? `Espere ${p.expedicoesEmAndamento === 1 ? 'o herói' : `os ${p.expedicoesEmAndamento} heróis`} voltar${p.expedicoesEmAndamento === 1 ? '' : 'em'} da estrada.`
      : p.motivo === 'sem-brasas'
        ? 'Este ciclo ainda não rende nenhuma brasa. A primeira vem com 1 M de moedas ganhas.'
        : null

  return (
    <section className="secao painel previa-reforjar" aria-label="Prévia do Reforjar">
      <div className="secao-topo">
        <h2>Reforjar</h2>
        <span className="secao-contagem">{jogo.reforjas === 0 ? 'primeira vez' : `${jogo.reforjas}ª reforja feita`}</span>
      </div>

      {ultimo && (
        <p className="resultado-ok" role="status">
          Reforjado. A cidade rendeu {ultimo.brasas} {ultimo.brasas === 1 ? 'brasa' : 'brasas'}.
        </p>
      )}

      <div className="previa-brasas" role="group" aria-label="Brasas deste ciclo">
        <Sprite nome="icone_brasa" escala={3} />
        <div>
          <span className="previa-numero">+{p.brasasGanhas}</span>
          <span className="estacao-dica">
            brasas por {formatar(p.moedasDoCiclo)} moedas neste ciclo (raiz de moedas / 1 M)
          </span>
        </div>
      </div>
      <p className="estacao-dica">
        Brasa não gasta dá +2 % de produção. Hoje: +{p.bonusAntes} %. Depois, sem gastar nada: +{p.bonusDepois} %.
      </p>

      <div className="previa-listas">
        <div>
          <h3>O que se perde</h3>
          <ul>
            {p.perde.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>O que fica</h3>
          <ul>
            {p.fica.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {p.expedicoesParaColetar > 0 && (
        <p className="estacao-dica">
          {p.expedicoesParaColetar === 1 ? 'Uma expedição já voltou' : `${p.expedicoesParaColetar} expedições já voltaram`}: o
          loot é coletado junto (reputação e fragmentos ficam).
        </p>
      )}
      {mensagemBloqueio && <p className="estacao-aviso">{mensagemBloqueio}</p>}

      {!confirmando ? (
        <button
          type="button"
          className="botao botao-primario botao-largo"
          disabled={p.motivo !== null}
          onClick={() => setConfirmando(true)}
        >
          Preparar o Reforjar
        </button>
      ) : (
        <div className="confirmar" role="group" aria-label="Confirmar o Reforjar">
          <p className="estacao-aviso">
            Isso não tem volta. A forja esfria e começa do zero, com +{p.brasasGanhas} {p.brasasGanhas === 1 ? 'brasa' : 'brasas'}.
          </p>
          <BotaoSegurar
            rotulo="Segurar para Reforjar"
            onConfirmar={() => {
              setConfirmando(false)
              reforjar()
            }}
          />
          <button type="button" className="botao botao-secundario botao-largo" onClick={() => setConfirmando(false)}>
            Voltar
          </button>
        </div>
      )}
    </section>
  )
}

function No({ id }: { id: TalentoId }) {
  const jogo = useGame((s) => s.jogo)
  const comprar = useGame((s) => s.comprarTalento)
  const def = DEF_TALENTO[id]
  const comprado = temTalento(jogo, id)
  const motivo = motivoNaoComprarTalento(jogo, id)
  const pre = preRequisito(id)
  const custo = custoTalento(id)

  return (
    <li className={`no ${comprado ? 'comprado' : ''} ${motivo === 'pre-requisito' ? 'bloqueado' : ''}`} aria-label={def.nome}>
      <div className="no-texto">
        <span className="no-nome">
          {def.nome}
          <small> · tier {def.tier}</small>
        </span>
        <span className="no-desc">{def.descricao}</span>
        {motivo === 'pre-requisito' && pre && <span className="estacao-dica">Exige {DEF_TALENTO[pre].nome}.</span>}
      </div>
      {comprado ? (
        <span className="no-estado">Aprendido</span>
      ) : (
        <button
          type="button"
          className="botao botao-primario no-botao"
          disabled={motivo !== null}
          onClick={() => comprar(id)}
          aria-label={`Aprender ${def.nome} por ${custo} ${custo === 1 ? 'brasa' : 'brasas'}`}
        >
          <Sprite nome="icone_brasa" escala={1} />
          {custo}
        </button>
      )}
    </li>
  )
}

function Ramo({ ramo }: { ramo: RamoId }) {
  const def = DEF_RAMO[ramo]
  return (
    <section className="ramo painel" aria-label={def.nome}>
      <div className="ramo-topo">
        <Sprite nome={`talento_${ramo}`} escala={2} />
        <div>
          <h3>{def.nome}</h3>
          <span className="estacao-dica">{def.resumo}</span>
        </div>
      </div>
      <ul className="nos">
        {talentosDoRamo(ramo).map((id) => (
          <No key={id} id={id} />
        ))}
      </ul>
    </section>
  )
}

/** Aba Reforjar: o prestígio (trancado até a Muralha) e a árvore de talentos. */
export function ReforjarScreen() {
  const jogo = useGame((s) => s.jogo)
  const livre = temConstrucao(jogo, 'muralha')

  return (
    <>
      {livre ? <Previa /> : <Trancado />}

      <section className="secao painel" aria-label="Talentos">
        <div className="secao-topo">
          <h2>Talentos</h2>
          <span className="secao-contagem">
            <Sprite nome="icone_brasa" escala={1} /> {jogo.brasas} {jogo.brasas === 1 ? 'brasa' : 'brasas'}
          </span>
        </div>
        <p className="estacao-dica">
          Cada brasa guardada dá +2 % de produção (hoje +{Math.round((bonusBrasas(jogo) - 1) * 100)} %). Gastar em um
          talento tira esse bônus: escolha com calma.
        </p>
        {RAMOS.map((r) => (
          <Ramo key={r} ramo={r} />
        ))}
      </section>
    </>
  )
}
