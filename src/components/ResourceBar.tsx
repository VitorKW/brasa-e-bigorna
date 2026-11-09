import { useEffect, useRef } from 'react'
import { formatar } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Flutuantes, useFlutuantes } from './Flutuantes.tsx'
import { Sprite, type SpriteNome } from './Sprite.tsx'

function Chip({ icone, valor, rotulo }: { icone: SpriteNome; valor: number; rotulo: string }) {
  return (
    <div className="chip" role="group" aria-label={`${rotulo}: ${formatar(valor)}`}>
      <Sprite nome={icone} escala={2} />
      <span className="chip-valor">{formatar(valor)}</span>
    </div>
  )
}

export function ResourceBar() {
  const jogo = useGame((s) => s.jogo)
  const ultimoGanho = useGame((s) => s.ultimoGanho)
  const { itens, adicionar, remover } = useFlutuantes()
  const visto = useRef<number | null>(ultimoGanho?.id ?? null)

  useEffect(() => {
    if (ultimoGanho && ultimoGanho.id !== visto.current) {
      visto.current = ultimoGanho.id
      adicionar(`+${formatar(ultimoGanho.valor)}`)
    }
  }, [ultimoGanho, adicionar])

  return (
    <header className="barra-recursos painel">
      <Chip icone="icone_minerio" valor={jogo.recursos.minerio} rotulo="Minério" />
      <Chip icone="icone_carvao" valor={jogo.recursos.carvao} rotulo="Carvão" />
      <Chip icone="icone_lingote" valor={jogo.recursos.lingote} rotulo="Lingotes" />
      <div className="chip chip-moedas">
        <Sprite nome="icone_moeda" escala={2} />
        <span className="chip-valor" aria-label={`Moedas: ${formatar(jogo.moedas)}`}>
          {formatar(jogo.moedas)}
        </span>
        <Flutuantes itens={itens} onFim={remover} />
      </div>
    </header>
  )
}
