import { useEffect, useRef } from 'react'
import { motion, useIsPresent, useReducedMotion } from 'motion/react'
import { formatar, formatarDuracao, formatarTaxa } from '../game/format.ts'
import type { ResumoOffline } from '../game/offline.ts'
import { DEF_EXPEDICAO } from '../game/expedicoes.ts'
import { QUALIDADES, rotuloQualidade } from '../game/items.ts'
import { COR_QUALIDADE } from './qualidade.ts'
import { useGame } from '../store.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'

const LINHAS: { id: keyof ResumoOffline['produzido']; rotulo: string; icone: SpriteNome }[] = [
  { id: 'minerio', rotulo: 'Minério extraído', icone: 'icone_minerio' },
  { id: 'carvao', rotulo: 'Carvão produzido', icone: 'icone_carvao' },
  { id: 'lingote', rotulo: 'Lingotes fundidos', icone: 'icone_lingote' },
  { id: 'aco', rotulo: 'Lingotes de aço', icone: 'icone_lingote_aco' },
]

export function OfflineModal({ resumo, onFechar }: { resumo: ResumoOffline; onFechar: () => void }) {
  const reduzir = useReducedMotion()
  // Durante a animação de saída o fundo não pode interceptar toques (bug da fatia 1:
  // o primeiro 'Vender tudo' logo após fechar era engolido pelo backdrop).
  const presente = useIsPresent()
  const botao = useRef<HTMLButtonElement>(null)
  const autoVenda = useGame((s) => s.jogo.autoVenda)
  const alternarAutoVenda = useGame((s) => s.alternarAutoVenda)

  useEffect(() => {
    botao.current?.focus()
    const aoTecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [onFechar])

  return (
    <motion.div
      className="modal-fundo"
      style={{ pointerEvents: presente ? 'auto' : 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduzir ? 0 : 0.2 }}
    >
      <motion.div
        className="modal painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-offline"
        initial={{ y: reduzir ? 0 : 24 }}
        animate={{ y: 0 }}
        transition={{ duration: reduzir ? 0 : 0.25, ease: 'easeOut' }}
      >
        <h2 id="titulo-offline">Enquanto você estava fora</h2>
        <p className="modal-texto">
          A forja trabalhou por {formatarDuracao(resumo.segundosSimulados)}.
          {resumo.limitadoPeloTeto &&
            ` Você ficou ${formatarDuracao(resumo.segundosAusente)} fora, mas a forja só rende até ${formatarDuracao(resumo.segundosSimulados)} sozinha.`}
        </p>
        <ul className="modal-lista">
          {LINHAS.filter((l) => l.id !== 'aco' || resumo.produzido.aco >= 1).map((l) => (
            <li key={l.id}>
              <Sprite nome={l.icone} escala={2} />
              <span>{l.rotulo}</span>
              <strong>+{formatar(resumo.produzido[l.id])}</strong>
            </li>
          ))}
        </ul>
        {resumo.totalForjados > 0 && (
          <div className="modal-forjados">
            <p className="modal-texto">A bigorna forjou {resumo.totalForjados} {resumo.totalForjados === 1 ? 'item' : 'itens'}:</p>
            <ul className="modal-lista">
              {QUALIDADES.filter((q) => resumo.forjados[q] > 0).map((q) => (
                <li key={q} className="modal-qualidade" style={{ borderColor: COR_QUALIDADE[q] }}>
                  <span style={{ color: COR_QUALIDADE[q] }}>{rotuloQualidade(q)}</span>
                  <strong>+{resumo.forjados[q]}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        {resumo.expedicoes.voltaram.length > 0 && (
          <div className="modal-forjados">
            <p className="modal-texto">
              {resumo.expedicoes.voltaram.length === 1
                ? '1 expedição voltou. O loot espera por você no Mapa:'
                : `${resumo.expedicoes.voltaram.length} expedições voltaram. O loot espera por você no Mapa:`}
            </p>
            <ul className="modal-lista">
              {resumo.expedicoes.voltaram.map((v, i) => (
                <li key={i}>
                  <span>
                    {v.heroi} · {DEF_EXPEDICAO[v.expedicao].nome}
                  </span>
                  <strong className={v.sucesso ? '' : 'falhou'}>{v.sucesso ? 'sucesso' : 'falhou'}</strong>
                </li>
              ))}
              <li>
                <Sprite nome="icone_moeda" escala={2} />
                <span>Moedas a coletar</span>
                <strong>+{formatar(resumo.expedicoes.loot.moedas)}</strong>
              </li>
              {resumo.expedicoes.loot.reputacao > 0 && (
                <li>
                  <Sprite nome="icone_reputacao" escala={2} />
                  <span>Reputação</span>
                  <strong>+{formatarTaxa(resumo.expedicoes.loot.reputacao)}</strong>
                </li>
              )}
              {resumo.expedicoes.loot.fragmentos > 0 && (
                <li>
                  <Sprite nome="icone_fragmento" escala={2} />
                  <span>Fragmentos rúnicos</span>
                  <strong>+{resumo.expedicoes.loot.fragmentos}</strong>
                </li>
              )}
            </ul>
          </div>
        )}
        {resumo.vendidosAuto > 0 && (
          <p className="modal-texto">
            A venda automática vendeu {resumo.vendidosAuto} {resumo.vendidosAuto === 1 ? 'item' : 'itens'} e rendeu{' '}
            <strong>{formatar(resumo.ganhoAuto)}</strong> moedas.
          </p>
        )}
        {resumo.inventarioCheio && (
          <>
            <p className="modal-texto">O inventário encheu e a bigorna parou. Venda itens para ela continuar.</p>
            {!autoVenda && (
              <button type="button" className="botao botao-secundario botao-largo" onClick={alternarAutoVenda}>
                Ligar a venda automática
              </button>
            )}
          </>
        )}
        <button
          ref={botao}
          type="button"
          className="botao botao-primario botao-largo"
          onClick={onFechar}
        >
          Voltar à forja
        </button>
      </motion.div>
    </motion.div>
  )
}
