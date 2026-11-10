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
  const aba = useGame((s) => s.aba)
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

  // Uma linha só, com o que importa na aba aberta: matéria-prima na Forja, reputação e fragmentos com
  // os heróis, brasas no Reforjar. Moedas sempre. Assim a barra nunca vira um painel de 8 números sem nome.
  const naForja = aba === 'forja'
  const temAco = naForja && (jogo.niveis.forno >= 1 || jogo.recursos.aco > 0)
  const temFragmento = (aba === 'guilda' || aba === 'mapa') && jogo.fragmentos > 0
  const temReputacao = !naForja && (jogo.reputacao > 0 || jogo.herois.length > 0)
  const temBrasa = aba === 'reforjar' && (jogo.brasas > 0 || jogo.reforjas > 0)
  const quantos = 1 + (naForja ? 3 : 0) + [temAco, temFragmento, temReputacao, temBrasa].filter(Boolean).length
  const compacta = quantos >= 5
  const escala = compacta ? 1 : 2

  return (
    <header className={`barra-recursos painel${compacta ? ' compacta' : ''}`} style={{ gridTemplateColumns: `repeat(${quantos}, minmax(0, 1fr))` }}>
      {naForja && <Chip icone="icone_minerio" valor={jogo.recursos.minerio} rotulo="Minério" escala={escala} />}
      {naForja && <Chip icone="icone_carvao" valor={jogo.recursos.carvao} rotulo="Carvão" escala={escala} />}
      {naForja && <Chip icone="icone_lingote" valor={jogo.recursos.lingote} rotulo="Lingotes" escala={escala} />}
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
