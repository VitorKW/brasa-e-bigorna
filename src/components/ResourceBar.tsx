import { useEffect, useRef } from 'react'
import { formatar } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Flutuantes, useFlutuantes } from './Flutuantes.tsx'
import { Sprite, type SpriteNome } from './Sprite.tsx'

function Chip({ icone, valor, rotulo, escala }: { icone: SpriteNome; valor: number; rotulo: string; escala: number }) {
  return (
    <div className="chip" role="group" aria-label={`${rotulo}: ${formatar(valor)}`}>
      <Sprite nome={icone} escala={escala} />
      <span className="chip-valor">{formatar(valor)}</span>
    </div>
  )
}

export function ResourceBar() {
  const jogo = useGame((s) => s.jogo)
  const ultimoGanho = useGame((s) => s.ultimoGanho)
  const ultimaColeta = useGame((s) => s.ultimaColeta)
  const { itens, adicionar, remover } = useFlutuantes()
  const visto = useRef<number | null>(ultimoGanho?.id ?? null)
  const vistaColeta = useRef<number | null>(ultimaColeta?.id ?? null)

  useEffect(() => {
    if (ultimoGanho && ultimoGanho.id !== visto.current) {
      visto.current = ultimoGanho.id
      adicionar(`+${formatar(ultimoGanho.valor)}`)
    }
  }, [ultimoGanho, adicionar])

  // Coletar loot de expedição: os números sobem junto das moedas.
  useEffect(() => {
    if (ultimaColeta && ultimaColeta.id !== vistaColeta.current) {
      vistaColeta.current = ultimaColeta.id
      if (ultimaColeta.coleta.moedas >= 1) adicionar(`+${formatar(ultimaColeta.coleta.moedas)}`)
    }
  }, [ultimaColeta, adicionar])

  // Só mostra o que o jogador já conhece: a barra cabe em 390 px e não vira um painel de exames.
  const temAco = jogo.niveis.forno >= 1 || jogo.recursos.aco > 0
  const temFragmento = jogo.fragmentos > 0
  const temReputacao = jogo.reputacao > 0 || jogo.herois.length > 0
  const temBrasa = jogo.brasas > 0 || jogo.reforjas > 0
  // Com mais de 4 recursos a grade vira 2 linhas de ~80 px por chip: ícone 16 px e número menor para caber.
  const compacta = temAco || temFragmento || temReputacao || temBrasa
  const escala = compacta ? 1 : 2

  return (
    <header className={`barra-recursos painel${compacta ? ' compacta' : ''}`}>
      <Chip icone="icone_minerio" valor={jogo.recursos.minerio} rotulo="Minério" escala={escala} />
      <Chip icone="icone_carvao" valor={jogo.recursos.carvao} rotulo="Carvão" escala={escala} />
      <Chip icone="icone_lingote" valor={jogo.recursos.lingote} rotulo="Lingotes" escala={escala} />
      <div className="chip chip-moedas">
        <Sprite nome="icone_moeda" escala={escala} />
        <span className="chip-valor" aria-label={`Moedas: ${formatar(jogo.moedas)}`}>
          {formatar(jogo.moedas)}
        </span>
        <Flutuantes itens={itens} onFim={remover} />
      </div>
      {temAco && <Chip icone="icone_lingote_aco" valor={jogo.recursos.aco} rotulo="Lingotes de aço" escala={escala} />}
      {temFragmento && <Chip icone="icone_fragmento" valor={jogo.fragmentos} rotulo="Fragmentos rúnicos" escala={escala} />}
      {temReputacao && <Chip icone="icone_reputacao" valor={jogo.reputacao} rotulo="Reputação" escala={escala} />}
      {temBrasa && <Chip icone="icone_brasa" valor={jogo.brasas} rotulo="Brasas Ancestrais" escala={escala} />}
    </header>
  )
}
