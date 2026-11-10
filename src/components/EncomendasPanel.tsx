import {
  DEF_NPC,
  ENCOMENDA,
  itensDaEntrega,
  quantosServem,
  textoPedido,
  type Encomenda,
} from '../game/encomendas.ts'
import { formatar, formatarCusto, formatarDuracao } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Dica } from './Dica.tsx'
import { Sprite } from './Sprite.tsx'

function Cartao({ e }: { e: Encomenda }) {
  const jogo = useGame((s) => s.jogo)
  const entregar = useGame((s) => s.entregarEncomenda)
  const npc = DEF_NPC[e.npc]
  const restante = Math.max(0, Math.ceil((e.prazo - jogo.lastTick) / 1000))
  const tem = quantosServem(jogo, e)
  const pode = itensDaEntrega(jogo, e) !== null && restante > 0
  const urgente = restante <= 30 * 60
  const pedido = textoPedido(e)

  return (
    <li className={`encomenda painel ${pode ? 'pronta' : ''}`} aria-label={`${npc.nome}, ${npc.papel}: ${pedido}`}>
      <div className="encomenda-topo">
        <Sprite nome={`npc_${e.npc}`} escala={2} rotulo={`${npc.nome}, ${npc.papel}`} />
        <div className="encomenda-texto">
          <h3>{npc.nome}</h3>
          <p className="encomenda-pedido">{pedido}</p>
        </div>
      </div>

      <div className="encomenda-linhas">
        <span className={`encomenda-prazo ${urgente ? 'urgente' : ''}`}>
          {restante > 0 ? `Vence em ${formatarDuracao(restante)}` : 'Venceu'}
        </span>
        <span className={`encomenda-tem ${pode ? 'ok' : ''}`}>
          No inventário: {tem}/{e.quantidade}
        </span>
      </div>

      <div className="encomenda-paga" aria-label="Pagamento">
        <span className="encomenda-valor">
          <Sprite nome="icone_moeda" escala={1} />
          {formatarCusto(e.recompensa)}
        </span>
        <span className="encomenda-valor">
          <Sprite nome="icone_reputacao" escala={1} />+{e.reputacao}
        </span>
      </div>

      <button
        type="button"
        className="botao botao-primario botao-largo"
        disabled={!pode}
        onClick={() => entregar(e.id)}
        aria-label={`Entregar a encomenda de ${npc.nome}`}
      >
        {pode ? 'Entregar' : 'Faltam itens'}
      </button>
    </li>
  )
}

/** Encomendas do vilarejo (fatia 5): até 3 pedidos abertos, pagos em moedas e reputação. */
export function EncomendasPanel() {
  const encomendas = useGame((s) => s.jogo.encomendas)
  const bigorna = useGame((s) => s.jogo.niveis.bigorna)
  const proxima = useGame((s) => s.jogo.proximaEncomenda)
  const agora = useGame((s) => s.jogo.lastTick)
  const ultima = useGame((s) => s.ultimaEntrega)

  const espera = Math.max(0, Math.ceil((proxima - agora) / 1000))

  return (
    <section className="secao painel encomendas" aria-label="Encomendas">
      <div className="secao-topo">
        <h2>Encomendas</h2>
        <span className="secao-contagem">
          {encomendas.length}/{ENCOMENDA.maxAbertas}
        </span>
      </div>

      <Dica id="encomendas" visivel={encomendas.length > 0}>
        Os moradores pagam {ENCOMENDA.recompensaMult} vez o valor do pedido e ainda dão reputação. Entregue itens do inventário: os
        equipados ficam de fora.
      </Dica>

      {bigorna < 1 ? (
        <p className="estacao-dica">Os moradores só batem à porta quando a bigorna estiver de pé.</p>
      ) : encomendas.length === 0 ? (
        <p className="estacao-dica">
          Nenhum pedido agora.{' '}
          {espera > 0
            ? `Alguém deve aparecer em uns ${formatarDuracao(espera)}.`
            : 'Alguém aparece a qualquer momento.'}
        </p>
      ) : (
        <ul className="encomendas-lista">
          {encomendas.map((e) => (
            <Cartao key={e.id} e={e} />
          ))}
        </ul>
      )}

      {ultima && (
        <p className="resultado-ok" role="status">
          {DEF_NPC[ultima.entrega.npc].nome} agradece: +{formatar(ultima.entrega.moedas)} moedas e +{ultima.entrega.reputacao} de
          reputação.
        </p>
      )}
    </section>
  )
}
