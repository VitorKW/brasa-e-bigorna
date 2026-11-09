import { analisarCadeia } from '../game/chain.ts'
import {
  NIVEIS_MARCO,
  producaoCarvoaria,
  producaoMina,
  velocidadeFornalha,
} from '../game/constants.ts'
import { custoProximoNivel, podeComprar } from '../game/economy.ts'
import { useGame } from '../store.ts'
import { StationCard } from './StationCard.tsx'

const proximoMarco = (n: number): number | null => NIVEIS_MARCO.find((m) => m > n) ?? null

function Conector({ texto, ativo }: { texto: string; ativo: boolean }) {
  return (
    <div className={`conector ${ativo ? 'ativo' : ''}`} aria-hidden="true">
      <span className="conector-linha" />
      <span className="conector-texto">{texto}</span>
    </div>
  )
}

/** Cadeia: mina -> fornalha <- carvoaria. */
export function ForgeScreen() {
  const jogo = useGame((s) => s.jogo)
  const melhorar = useGame((s) => s.melhorar)
  const { fornalha, gargalo } = analisarCadeia(jogo)
  const n = jogo.niveis

  return (
    <section className="cadeia" aria-label="Estações da forja">
      <StationCard
        nome="Mina"
        sprite="mina"
        nivel={n.mina}
        saida={{ icone: 'icone_minerio', rotulo: 'minério', porSegundo: producaoMina(n.mina) }}
        proximaSaida={producaoMina(n.mina + 1)}
        proximoMarco={proximoMarco(n.mina)}
        custo={custoProximoNivel(jogo, 'mina')}
        podeComprar={podeComprar(jogo, 'mina')}
        onMelhorar={() => melhorar('mina')}
        parada={false}
        gargalo={gargalo === 'mina'}
      />
      <Conector texto="2 minérios por lingote" ativo={fornalha !== 'sem-minerio'} />

      <StationCard
        nome="Fornalha"
        sprite="fornalha"
        animada
        nivel={n.fornalha}
        saida={{ icone: 'icone_lingote', rotulo: 'lingote', porSegundo: velocidadeFornalha(n.fornalha) }}
        proximaSaida={velocidadeFornalha(n.fornalha + 1)}
        proximoMarco={proximoMarco(n.fornalha)}
        custo={custoProximoNivel(jogo, 'fornalha')}
        podeComprar={podeComprar(jogo, 'fornalha')}
        onMelhorar={() => melhorar('fornalha')}
        parada={fornalha !== 'trabalhando'}
        mensagemParada={
          fornalha === 'sem-carvao'
            ? 'A fornalha esfriou. Falta carvão.'
            : 'A fornalha esfriou. Falta minério.'
        }
        gargalo={gargalo === 'fornalha'}
      />

      <Conector texto="1 carvão por lingote" ativo={fornalha !== 'sem-carvao'} />
      <StationCard
        nome="Carvoaria"
        sprite="carvoaria"
        nivel={n.carvoaria}
        saida={{ icone: 'icone_carvao', rotulo: 'carvão', porSegundo: producaoCarvoaria(n.carvoaria) }}
        proximaSaida={producaoCarvoaria(n.carvoaria + 1)}
        proximoMarco={proximoMarco(n.carvoaria)}
        custo={custoProximoNivel(jogo, 'carvoaria')}
        podeComprar={podeComprar(jogo, 'carvoaria')}
        onMelhorar={() => melhorar('carvoaria')}
        parada={false}
        gargalo={gargalo === 'carvoaria'}
      />
    </section>
  )
}
