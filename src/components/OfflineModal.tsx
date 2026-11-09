import { useEffect, useRef } from 'react'
import { motion, useIsPresent, useReducedMotion } from 'motion/react'
import { OFFLINE } from '../game/constants.ts'
import { formatar, formatarDuracao } from '../game/format.ts'
import type { ResumoOffline } from '../game/offline.ts'
import { QUALIDADES, rotuloQualidade } from '../game/items.ts'
import { COR_QUALIDADE } from './qualidade.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'

const LINHAS: { id: keyof ResumoOffline['produzido']; rotulo: string; icone: SpriteNome }[] = [
  { id: 'minerio', rotulo: 'Minério extraído', icone: 'icone_minerio' },
  { id: 'carvao', rotulo: 'Carvão produzido', icone: 'icone_carvao' },
  { id: 'lingote', rotulo: 'Lingotes fundidos', icone: 'icone_lingote' },
]

export function OfflineModal({ resumo, onFechar }: { resumo: ResumoOffline; onFechar: () => void }) {
  const reduzir = useReducedMotion()
  // Durante a animação de saída o fundo não pode interceptar toques (bug da fatia 1:
  // o primeiro 'Vender tudo' logo após fechar era engolido pelo backdrop).
  const presente = useIsPresent()
  const botao = useRef<HTMLButtonElement>(null)

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
            ` Você ficou ${formatarDuracao(resumo.segundosAusente)} fora, mas a forja só rende até ${formatarDuracao(OFFLINE.tetoSegundos)} sozinha.`}
        </p>
        <ul className="modal-lista">
          {LINHAS.map((l) => (
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
        {resumo.inventarioCheio && (
          <p className="modal-texto">O inventário encheu e a bigorna parou. Venda itens para ela continuar.</p>
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
