// "Próximo objetivo": uma frase só dizendo o que fazer agora e onde. É o fio que guia o jogador pelo
// loop inteiro (mina -> bigorna -> heróis -> chefes -> vilarejo -> Reforjar) sem tutorial longo.
// Puro: recebe o estado e o relógio, devolve o texto, a aba e o progresso até a meta.
import { chefeDerrotado, chefeDisponivel, equipeDisponivel, preverChefe, DEF_CHEFE } from './chefe.ts'
import { CONSTRUCOES, DEF_CONSTRUCAO, temConstrucao } from './construcoes.ts'
import { custoProximoNivel } from './economy.ts'
import { retornosPendentes } from './expedicoes.ts'
import { formatarCusto } from './format.ts'
import { proximaVaga } from './herois.ts'
import type { GameState } from './state.ts'

export type DestinoObjetivo = 'producao' | 'bigorna' | 'guilda' | 'mapa' | 'vilarejo' | 'reforjar'

export interface Objetivo {
  /** Chave estável (para testes e para animar a troca). */
  id: string
  texto: string
  destino: DestinoObjetivo
  /** 0 a 1, quando a meta é juntar algo (moedas, reputação, níveis). */
  progresso: number | null
}

/** A mina precisa disso antes de a bigorna valer a pena: os primeiros minutos são só cavar e vender. */
export const NIVEL_MINA_INICIAL = 5

const fracao = (tem: number, precisa: number): number => (precisa <= 0 ? 1 : Math.max(0, Math.min(1, tem / precisa)))

export function proximoObjetivo(s: GameState, now: number): Objetivo {
  const voltaram = retornosPendentes(s, now).length
  if (voltaram > 0) {
    const texto = voltaram === 1 ? 'Um herói voltou. Colete o loot.' : `${voltaram} heróis voltaram. Colete o loot.`
    return { id: 'coletar', texto, destino: 'mapa', progresso: null }
  }

  if (s.niveis.bigorna < 1) {
    if (s.niveis.mina < NIVEL_MINA_INICIAL) {
      return {
        id: 'mina',
        texto: `Venda minério e melhore a mina até o nível ${NIVEL_MINA_INICIAL}.`,
        destino: 'producao',
        progresso: fracao(s.niveis.mina, NIVEL_MINA_INICIAL),
      }
    }
    const custo = custoProximoNivel(s, 'bigorna')
    return {
      id: 'bigorna',
      texto: `Construa a bigorna (${formatarCusto(custo)} moedas).`,
      destino: 'bigorna',
      progresso: fracao(s.moedas, custo),
    }
  }

  if (s.stats.itensForjados === 0) {
    return { id: 'forjar', texto: 'Forje sua primeira peça na bigorna.', destino: 'bigorna', progresso: null }
  }

  if (s.herois.length === 0) {
    const vaga = proximaVaga(s)
    const custo = vaga?.condicao.tipo === 'moedas' ? vaga.condicao.custo : 0
    return {
      id: 'recrutar',
      texto: `Contrate seu primeiro herói na Guilda (${formatarCusto(custo)} moedas).`,
      destino: 'guilda',
      progresso: fracao(s.moedas, custo),
    }
  }

  if (s.herois.every((h) => h.equipamento.arma === null)) {
    return { id: 'equipar', texto: 'Equipe seu herói com uma arma forjada.', destino: 'guilda', progresso: null }
  }

  if (!chefeDerrotado(s, 'golem')) {
    // Sem nenhuma expedição feita ainda, o passo é o mais simples: mandar alguém sair.
    if (s.reputacao <= 0 && s.expedicoes.length === 0) {
      return { id: 'expedicao', texto: 'Mande um herói em expedição no Mapa.', destino: 'mapa', progresso: null }
    }
    return { id: 'golem', texto: `Derrote o ${DEF_CHEFE.golem.nome} no Mapa.`, destino: 'mapa', progresso: null }
  }

  if (s.niveis.forno < 1) {
    const custo = custoProximoNivel(s, 'forno')
    return {
      id: 'forno',
      texto: `Construa o Forno de aço (${formatarCusto(custo)} moedas).`,
      destino: 'producao',
      progresso: fracao(s.moedas, custo),
    }
  }

  // A Serpe passa na frente das construções assim que a equipe já ganha a luta.
  if (!chefeDerrotado(s, 'serpe') && chefeDisponivel(s, 'serpe')) {
    const equipe = equipeDisponivel(s)
    if (equipe.length > 0 && preverChefe(s, 'serpe', equipe).vitoria) {
      return { id: 'serpe', texto: `Sua equipe já vence a ${DEF_CHEFE.serpe.nome}. Enfrente-a no Mapa.`, destino: 'mapa', progresso: null }
    }
  }

  for (const id of CONSTRUCOES) {
    if (temConstrucao(s, id)) continue
    const d = DEF_CONSTRUCAO[id]
    if (d.exige && !chefeDerrotado(s, d.exige)) {
      return {
        id: d.exige,
        texto: `Fortaleça os heróis e derrote a ${DEF_CHEFE[d.exige].nome} no Mapa.`,
        destino: 'mapa',
        progresso: null,
      }
    }
    if (s.reputacao < d.reputacao) {
      return {
        id: `rep-${id}`,
        texto: `Junte ${d.reputacao} de reputação (expedições e encomendas) para ${artigo(d.nome)}.`,
        destino: 'mapa',
        progresso: fracao(s.reputacao, d.reputacao),
      }
    }
    return {
      id: `construir-${id}`,
      texto: `Construa ${artigo(d.nome)} no Vilarejo (${formatarCusto(d.custo)} moedas).`,
      destino: 'vilarejo',
      progresso: fracao(s.moedas, d.custo),
    }
  }

  return { id: 'reforjar', texto: 'A cidade está de pé. Reforje para recomeçar mais forte.', destino: 'reforjar', progresso: null }
}

// "a Taverna", "o Armazém": as construções femininas terminam em "a" (Taverna, Muralha, Segunda fornalha).
const artigo = (nome: string): string => `${nome.endsWith('a') ? 'a' : 'o'} ${nome}`
