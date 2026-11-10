import { analisarCadeia, taxas } from '../game/chain.ts'
import {
  FORNO,
  NIVEIS_MARCO,
  producaoCarvoaria,
  producaoMina,
  velocidadeFornalha,
  velocidadeForno,
  type EstacaoProducao,
} from '../game/constants.ts'
import { chefeDerrotado } from '../game/chefe.ts'
import { custoProximoNivel, podeComprar } from '../game/economy.ts'
import { formatarCusto } from '../game/format.ts'
import { multiplicadorEstacao } from '../game/ferreiros.ts'
import { useGame, type SubForja } from '../store.ts'
import { BigornaCard } from './BigornaCard.tsx'
import { CenaForja } from './CenaForja.tsx'
import { FerreirosPanel } from './FerreirosPanel.tsx'
import { Dica } from './Dica.tsx'
import { ItensPanel } from './ItensPanel.tsx'
import { Sprite } from './Sprite.tsx'
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

const SUBS: readonly { id: SubForja; nome: string }[] = [
  { id: 'producao', nome: 'Produção' },
  { id: 'bigorna', nome: 'Bigorna' },
  { id: 'ferreiros', nome: 'Ferreiros' },
]

/** Produção / Bigorna / Ferreiros: uma coisa de cada vez na tela. */
function SubAbas() {
  const sub = useGame((s) => s.subForja)
  const irParaForja = useGame((s) => s.irParaForja)
  // Bigorna de pé e parada (sem automático): um ponto chama a atenção para ela.
  const bigornaParada = useGame((s) => s.jogo.niveis.bigorna >= 1 && s.jogo.forja === null && !s.jogo.automatico)
  return (
    <div className="sub-abas" role="tablist" aria-label="Partes da forja">
      {SUBS.map((x) => (
        <button
          key={x.id}
          type="button"
          role="tab"
          aria-selected={sub === x.id}
          className={`sub-aba ${sub === x.id ? 'ativa' : ''}`}
          onClick={() => irParaForja(x.id)}
        >
          {x.nome}
          {x.id === 'bigorna' && bigornaParada && sub !== 'bigorna' && <span className="ponto-aviso" aria-label="parada" />}
        </button>
      ))}
    </div>
  )
}

export function ForgeScreen() {
  const sub = useGame((s) => s.subForja)
  return (
    <>
      <SubAbas />
      {sub === 'producao' && <Producao />}
      {sub === 'bigorna' && (
        <>
          <BigornaDicas />
          <section className="cadeia" aria-label="Bigorna">
            <BigornaCard />
          </section>
          <ItensSecao />
        </>
      )}
      {sub === 'ferreiros' && <FerreirosPanel />}
    </>
  )
}

function BigornaDicas() {
  const jogo = useGame((s) => s.jogo)
  return (
    <Dica id="bigorna" visivel={jogo.niveis.bigorna >= 1 && jogo.itens.length === 0 && jogo.stats.itensForjados === 0}>
      A bigorna transforma lingotes em peças. Escolha uma receita e toque em Forjar: a peça vale muito mais que os lingotes.
    </Dica>
  )
}

/** Cadeia: mina e carvoaria -> fornalha (-> forno de aço). Os lingotes seguem para a bigorna. */
function Producao() {
  const jogo = useGame((s) => s.jogo)
  const melhorar = useGame((s) => s.melhorar)
  const { fornalha, gargalo } = analisarCadeia(jogo)
  const n = jogo.niveis
  const mult = (e: EstacaoProducao) => multiplicadorEstacao(jogo, e)

  return (
    <>
      <CenaForja />
      <section className="cadeia" aria-label="Estações da forja">
        <StationCard
          nome="Mina"
          visual="mina"
          sprite="mina"
          nivel={n.mina}
          saida={{ icone: 'icone_minerio', rotulo: 'minério', porSegundo: producaoMina(n.mina) * mult('mina') }}
          proximaSaida={producaoMina(n.mina + 1) * mult('mina')}
          proximoMarco={proximoMarco(n.mina)}
          custo={custoProximoNivel(jogo, 'mina')}
          podeComprar={podeComprar(jogo, 'mina')}
          onMelhorar={() => melhorar('mina')}
          parada={false}
          gargalo={gargalo === 'mina'}
        />
        <div className="espaco-cadeia" />
        <StationCard
          nome="Carvoaria"
          visual="carvoaria"
          sprite="carvoaria"
          nivel={n.carvoaria}
          saida={{
            icone: 'icone_carvao',
            rotulo: 'carvão',
            porSegundo: producaoCarvoaria(n.carvoaria) * mult('carvoaria'),
          }}
          proximaSaida={producaoCarvoaria(n.carvoaria + 1) * mult('carvoaria')}
          proximoMarco={proximoMarco(n.carvoaria)}
          custo={custoProximoNivel(jogo, 'carvoaria')}
          podeComprar={podeComprar(jogo, 'carvoaria')}
          onMelhorar={() => melhorar('carvoaria')}
          parada={false}
          gargalo={gargalo === 'carvoaria'}
        />

        <Conector texto="2 minérios e 1 carvão por lingote" ativo={fornalha === 'trabalhando'} />

        <StationCard
          nome="Fornalha"
          visual="fornalha"
          sprite="fornalha"
          animada
          nivel={n.fornalha}
          saida={{
            icone: 'icone_lingote',
            rotulo: 'lingote',
            porSegundo: velocidadeFornalha(n.fornalha) * mult('fornalha'),
          }}
          proximaSaida={velocidadeFornalha(n.fornalha + 1) * mult('fornalha')}
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

        <FornoDeAco />
      </section>
    </>
  )
}

function ItensSecao() {
  const nivel = useGame((s) => s.jogo.niveis.bigorna)
  return nivel >= 1 ? <ItensPanel /> : null
}

/** Forno de aço: aparece depois do Golem. Nível 0 = ainda por construir. */
function FornoDeAco() {
  const jogo = useGame((s) => s.jogo)
  const melhorar = useGame((s) => s.melhorar)
  if (!chefeDerrotado(jogo, 'golem')) return null
  const n = jogo.niveis.forno
  const custo = custoProximoNivel(jogo, 'forno')

  if (n < 1) {
    return (
      <>
        <Conector texto="1 lingote e 2 carvões por aço" ativo={false} />
        <article className="estacao painel fria" aria-label="Forno de aço, por construir">
          <div className="estacao-arte">
            <Sprite nome="forno_aco" escala={2} rotulo="Forno de aço" />
          </div>
          <div className="estacao-info">
            <div className="estacao-titulo">
              <h2>Forno de aço</h2>
              <span className="nivel">por construir</span>
            </div>
            <p className="estacao-aviso">O Golem caiu. A Serra Cinzenta ensinou o segredo do aço.</p>
            <p className="estacao-dica">Itens de aço valem 4 vezes mais e ganham +10 de qualidade.</p>
          </div>
          <button
            type="button"
            className="botao botao-primario botao-melhorar"
            disabled={!podeComprar(jogo, 'forno')}
            onClick={() => melhorar('forno')}
            aria-label={`Construir o Forno de aço por ${formatarCusto(custo)} moedas`}
          >
            <span>Construir forno</span>
            <span className="botao-custo">
              <Sprite nome="icone_moeda" escala={1} />
              {formatarCusto(custo)}
            </span>
          </button>
        </article>
      </>
    )
  }

  const t = taxas(jogo)
  const cheio = jogo.recursos.aco >= FORNO.estoqueMaximo - 0.01
  const parado = cheio || t.aco <= 1e-9
  const capacidade = velocidadeForno(n) * multiplicadorEstacao(jogo, 'forno')
  return (
    <>
      <Conector texto="1 lingote e 2 carvões por aço" ativo={!parado} />
      <StationCard
        nome="Forno de aço"
        sprite="forno_aco"
        spriteAceso="forno_aco_aceso"
        animada
        nivel={n}
        saida={{ icone: 'icone_lingote_aco', rotulo: 'aço', porSegundo: Math.min(capacidade, t.aco > 0 ? t.aco : capacidade) }}
        proximaSaida={velocidadeForno(n + 1) * multiplicadorEstacao(jogo, 'forno')}
        proximoMarco={proximoMarco(n)}
        custo={custo}
        podeComprar={podeComprar(jogo, 'forno')}
        onMelhorar={() => melhorar('forno')}
        parada={parado}
        mensagemParada={
          cheio ? 'O forno parou: o estoque de aço está cheio.' : 'O forno esfriou. Faltam lingotes de ferro ou carvão.'
        }
        gargalo={false}
      />
    </>
  )
}
