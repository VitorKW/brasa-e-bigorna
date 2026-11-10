import { create } from 'zustand'
import { NIVEIS_MARCO, OFFLINE, type EstacaoId, type RecursoId } from './game/constants.ts'
import {
  alternarAutomatico,
  forjar as forjarRegra,
  registrarBatida as registrarBatidaRegra,
  removerDaFila as removerDaFilaRegra,
  type Forjado,
} from './game/bigorna.ts'
import { aplicarConquistas, type ConquistaId } from './game/conquistas.ts'
import { construir as construirRegra, type ConstrucaoId } from './game/construcoes.ts'
import { avancarEncomendas, entregar as entregarRegra, type Entrega } from './game/encomendas.ts'
import { registrarSessao, somarTempoAtivo } from './game/estatisticas.ts'
import { tocar, type SomId } from './audio.ts'
import { lutarChefe, type ChefeId, type RecompensaChefe, type ResultadoCombate } from './game/chefe.ts'
import {
  coletar as coletarRegra,
  coletarTodas as coletarTodasRegra,
  partir,
  type Coleta,
  type ExpedicaoId,
} from './game/expedicoes.ts'
import { desequipar as desequiparRegra, equipar as equiparRegra, recrutar as recrutarRegra, type ClasseId } from './game/herois.ts'
import { alocar as alocarRegra, contratar as contratarRegra, type FerreiroId } from './game/ferreiros.ts'
import { venderItem as venderItemRegra, venderPorQualidade } from './game/inventario.ts'
import type { MaterialId, Qualidade, ReceitaId, Slot } from './game/items.ts'
import { brasasDoCiclo, moedasDoCicloComPendentes, reforjar as reforjarRegra } from './game/reforjar.ts'
import { semente } from './game/rng.ts'
import { comprarUpgrade, vender as venderRegra } from './game/economy.ts'
import { applyOffline, type ResumoOffline } from './game/offline.ts'
import { desserializar, serializar } from './game/save.ts'
import { estadoInicial, type GameState } from './game/state.ts'
import { comprarTalento as comprarTalentoRegra, type TalentoId } from './game/talentos.ts'
import { tickDetalhado } from './game/tick.ts'
import { TOQUE, tocar as tocarRegra, type AlvoToque } from './game/toque.ts'

const CHAVE_SAVE = 'brasa-e-bigorna:save'
const CHAVE_BACKUP = 'brasa-e-bigorna:save-backup'

/** Acima disso o intervalo vira "offline" (aba em segundo plano, celular bloqueado). */
const LIMITE_TICK_NORMAL_S = 5
/** Voltar depois de tanto tempo fora conta como uma nova sessão nas estatísticas. */
const AUSENCIA_NOVA_SESSAO_S = 5 * 60

function lerSave(): GameState | null {
  try {
    for (const chave of [CHAVE_SAVE, CHAVE_BACKUP]) {
      const bruto = localStorage.getItem(chave)
      const estado = bruto ? desserializar(bruto) : null
      if (estado) return estado
    }
  } catch {
    /* localStorage indisponível: joga sem salvar */
  }
  return null
}

function gravarSave(estado: GameState): void {
  try {
    const atual = localStorage.getItem(CHAVE_SAVE)
    // Só promove a backup se o save atual ainda for válido.
    if (atual && desserializar(atual)) localStorage.setItem(CHAVE_BACKUP, atual)
    localStorage.setItem(CHAVE_SAVE, serializar(estado))
  } catch {
    /* quota cheia ou modo privado */
  }
}

export type AbaId = 'forja' | 'guilda' | 'mapa' | 'vilarejo' | 'reforjar'
/** A Forja se divide em três partes para não virar uma rolagem sem fim. */
export type SubForja = 'producao' | 'bigorna' | 'ferreiros'

/** Resultado de uma luta contra o chefe, para o replay. A recompensa já foi aplicada ao jogo. */
export interface CombateAtivo {
  id: number
  chefe: ChefeId
  resultado: ResultadoCombate
  recompensa: RecompensaChefe | null
}

interface Store {
  aba: AbaId
  subForja: SubForja
  jogo: GameState
  resumoOffline: ResumoOffline | null
  /** Último ganho de venda, para a UI mostrar o "+N" (id muda a cada venda). */
  ultimoGanho: { id: number; valor: number } | null
  /** Último item forjado com o app aberto (a UI mostra o '+1 Espada (rara)'). */
  ultimoForjado: { id: number; forjado: Forjado } | null
  /** Id do overlay da batida aberto agora (null = fechado). Só UI; não vai para o save. */
  batidaAtiva: number | null
  /** Combate em replay (null = nenhum). Só UI; não vai para o save. */
  combate: CombateAtivo | null
  /** Última coleta de expedições (a UI faz os números subirem). */
  ultimaColeta: { id: number; coleta: Coleta } | null
  /** Último Reforjar (a tela mostra o que rendeu). Só UI; não vai para o save. */
  ultimoReforjar: { id: number; brasas: number } | null
  /** Conquistas recém-desbloqueadas, esperando o aviso discreto. Só UI. */
  avisoConquistas: ConquistaId[]
  /** Última entrega de encomenda (a UI mostra o morador agradecendo). Só UI. */
  ultimaEntrega: { id: number; entrega: Entrega } | null
  irPara: (aba: AbaId) => void
  irParaForja: (sub: SubForja) => void
  /** Toque na cena da forja. Devolve quanto rendeu (0 = nada aconteceu; null = cedo demais, ignorado). */
  tocarCena: (alvo: AlvoToque) => number | null
  avancar: (now: number) => void
  melhorar: (estacao: EstacaoId) => void
  vender: (recurso: RecursoId | 'tudo') => void
  forjar: (receita: ReceitaId, comBatida?: boolean, material?: MaterialId) => void
  removerDaFila: (indice: number) => void
  alternarAutomatico: () => void
  /** Posição do toque (0..1) ou null se o tempo acabou. */
  registrarBatida: (posicao: number | null) => void
  fecharBatida: () => void
  contratar: (id: FerreiroId) => void
  alocar: (id: FerreiroId, estacao: EstacaoId | null) => void
  venderItem: (id: number) => void
  venderItens: (qualidade: Qualidade | 'todas') => void
  fecharResumo: () => void
  salvar: () => void
  /** Texto do save atual, para o jogador guardar ou levar a outro aparelho. */
  exportarSave: () => string
  /** Troca o jogo pelo save colado. Devolve false (e não muda nada) se o texto não for um save válido. */
  importarSave: (texto: string) => boolean
  recrutar: (classe: ClasseId) => void
  equipar: (heroiId: number, itemId: number) => void
  desequipar: (heroiId: number, slot: Slot) => void
  enviarExpedicao: (heroiId: number, tipo: ExpedicaoId) => void
  coletarExpedicao: (id: number) => void
  coletarTodas: () => void
  lutar: (chefe: ChefeId, heroiIds: number[]) => void
  fecharCombate: () => void
  construir: (id: ConstrucaoId) => void
  comprarTalento: (id: TalentoId) => void
  reforjar: () => void
  entregarEncomenda: (id: number) => void
  alternarAutoVenda: () => void
  alternarSom: () => void
  /** Toca um efeito se o som estiver ligado (para a UI: replay do combate, revelação de peça rara). */
  som: (id: SomId, volume?: number) => void
  dispensarDica: (id: string) => void
  fecharAvisoConquistas: () => void
}

/** Depois de cada passo do jogo: encomendas que vencem ou surgem e conquistas que passaram a valer. */
function aposPasso(jogo: GameState, agora: number): { jogo: GameState; novas: ConquistaId[] } {
  const r = aplicarConquistas(avancarEncomendas(jogo, agora))
  return { jogo: r.estado, novas: r.novas }
}

function iniciar(): Pick<Store, 'jogo' | 'resumoOffline' | 'avisoConquistas'> {
  const agora = Date.now()
  const salvo = lerSave()
  if (!salvo) {
    const novo = registrarSessao(estadoInicial(agora, semente(Math.random() * 2 ** 32)))
    return { jogo: novo, resumoOffline: null, avisoConquistas: [] }
  }
  const { estado, resumo } = applyOffline(registrarSessao(salvo), agora)
  const r = aposPasso(estado, agora)
  return {
    jogo: r.jogo,
    resumoOffline: resumo.segundosSimulados > OFFLINE.minimoModalSegundos ? resumo : null,
    avisoConquistas: r.novas,
  }
}

const somAtivo = (jogo: GameState, id: SomId): void => {
  if (jogo.som) tocar(id)
}

const ultimoToque: Partial<Record<AlvoToque, number>> = {}
const SOM_DO_TOQUE: Record<AlvoToque, SomId> = { mina: 'picareta', carvoaria: 'carvao', fornalha: 'fole', bigorna: 'martelo' }
let contadorGanho = 0
let contadorForjado = 0
let contadorBatida = 0
let contadorColeta = 0
let contadorCombate = 0
let contadorReforjar = 0
let contadorEntrega = 0

export const useGame = create<Store>((set, get) => ({
  aba: 'forja',
  subForja: 'producao',
  ...iniciar(),
  ultimoGanho: null,
  ultimoForjado: null,
  batidaAtiva: null,
  combate: null,
  ultimaColeta: null,
  ultimoReforjar: null,
  ultimaEntrega: null,

  irPara: (aba) => {
    if (aba !== get().aba) somAtivo(get().jogo, 'aba')
    set({ aba, ultimoReforjar: null })
  },
  irParaForja: (sub) => {
    if (get().aba !== 'forja' || sub !== get().subForja) somAtivo(get().jogo, 'aba')
    set({ aba: 'forja', subForja: sub, ultimoReforjar: null })
  },

  tocarCena: (alvo) => {
    // Intervalo mínimo por estação: segura auto-clicker e multitoque sem punir o dedo rápido.
    const agora = Date.now()
    if (agora - (ultimoToque[alvo] ?? 0) < TOQUE.intervaloMinMs) return null
    ultimoToque[alvo] = agora
    const r = tocarRegra(get().jogo, alvo)
    if (r.ganho > 0) set({ jogo: r.estado })
    somAtivo(r.estado, r.ganho > 0 ? SOM_DO_TOQUE[alvo] : 'negado')
    return r.ganho
  },

  avancar: (now) => {
    const { jogo } = get()
    const dt = (now - jogo.lastTick) / 1000
    if (dt < 0) {
      // Relógio voltou: realinha sem punir (GDD §4.5).
      set({ jogo: { ...jogo, lastTick: now } })
      return
    }
    if (dt > LIMITE_TICK_NORMAL_S) {
      const base = dt >= AUSENCIA_NOVA_SESSAO_S ? registrarSessao(jogo) : jogo
      const { estado, resumo } = applyOffline(base, now)
      const pos = aposPasso(estado, now)
      set({
        jogo: pos.jogo,
        resumoOffline:
          resumo.segundosSimulados > OFFLINE.minimoModalSegundos ? resumo : get().resumoOffline,
        ...(pos.novas.length > 0 ? { avisoConquistas: [...get().avisoConquistas, ...pos.novas] } : {}),
      })
      return
    }
    const r = tickDetalhado(jogo, dt)
    const ultimo = r.forjados[r.forjados.length - 1]
    // Só soma tempo de sessão com a aba à vista: em segundo plano o navegador ainda dispara timers lentos.
    const visivel = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    const base = visivel ? somarTempoAtivo({ ...r.estado, lastTick: now }, dt) : { ...r.estado, lastTick: now }
    const pos = aposPasso(base, now)
    set({
      jogo: pos.jogo,
      ...(ultimo ? { ultimoForjado: { id: ++contadorForjado, forjado: ultimo } } : {}),
      ...(pos.novas.length > 0 ? { avisoConquistas: [...get().avisoConquistas, ...pos.novas] } : {}),
    })
    if (pos.novas.length > 0) somAtivo(pos.jogo, 'conquista')
  },

  melhorar: (estacao) => {
    const { jogo } = get()
    const novo = comprarUpgrade(jogo, estacao)
    if (novo === jogo) return
    set({ jogo: novo })
    // Construir (nível 0 -> 1) soa como obra; marco de nível (produção x2 e arte nova) ganha fanfarra.
    const nivel = novo.niveis[estacao]
    somAtivo(novo, nivel === 1 && jogo.niveis[estacao] === 0 ? 'construir' : (NIVEIS_MARCO as readonly number[]).includes(nivel) ? 'marco' : 'melhorar')
  },

  vender: (recurso) => {
    let estado = get().jogo
    let total = 0
    const alvos: RecursoId[] = recurso === 'tudo' ? ['minerio', 'carvao', 'lingote', 'aco'] : [recurso]
    for (const r of alvos) {
      const res = venderRegra(estado, r, 'tudo')
      estado = res.estado
      total += res.ganho
    }
    if (total > 0) {
      set({ jogo: estado, ultimoGanho: { id: ++contadorGanho, valor: total } })
      somAtivo(estado, 'moeda')
    }
  },

  forjar: (receita, comBatida = false, material = 'ferro') => {
    const { jogo } = get()
    const novo = forjarRegra(jogo, receita, comBatida, material)
    if (novo === jogo) return
    set({ jogo: novo, batidaAtiva: comBatida && novo.forja?.minigame === 'pendente' ? ++contadorBatida : null })
    somAtivo(novo, 'martelo')
  },

  removerDaFila: (indice) => set({ jogo: removerDaFilaRegra(get().jogo, indice) }),

  alternarAutomatico: () => set({ jogo: alternarAutomatico(get().jogo) }),

  registrarBatida: (posicao) => {
    const novo = registrarBatidaRegra(get().jogo, posicao)
    set({ jogo: novo })
    const resultado = novo.forja?.batida
    if (resultado === 'perfeito') somAtivo(novo, 'perfeito')
    else if (resultado) somAtivo(novo, 'batida')
  },

  fecharBatida: () => set({ batidaAtiva: null }),

  contratar: (id) => {
    const { jogo } = get()
    const novo = contratarRegra(jogo, id)
    if (novo === jogo) return
    set({ jogo: novo })
    somAtivo(novo, 'entrega')
  },

  alocar: (id, estacao) => {
    const { jogo } = get()
    const novo = alocarRegra(jogo, id, estacao)
    if (novo !== jogo) set({ jogo: novo })
  },

  venderItem: (id) => {
    const r = venderItemRegra(get().jogo, id)
    if (r.ganho > 0) {
      set({ jogo: r.estado, ultimoGanho: { id: ++contadorGanho, valor: r.ganho } })
      somAtivo(r.estado, 'moeda')
    }
  },

  venderItens: (qualidade) => {
    const r = venderPorQualidade(get().jogo, qualidade)
    if (r.ganho > 0) {
      set({ jogo: r.estado, ultimoGanho: { id: ++contadorGanho, valor: r.ganho } })
      somAtivo(r.estado, 'moeda')
    }
  },

  fecharResumo: () => set({ resumoOffline: null }),

  salvar: () => gravarSave(get().jogo),

  exportarSave: () => serializar(get().jogo),

  importarSave: (texto) => {
    const estado = desserializar(texto.trim())
    if (!estado) return false
    // O save antigo vira o backup (gravarSave promove o atual antes de escrever). O tempo desde o
    // lastTick do save importado entra como progresso offline no próximo tick, como em qualquer volta.
    gravarSave(get().jogo)
    set({ jogo: estado, batidaAtiva: null, combate: null, ultimoReforjar: null, ultimaEntrega: null, avisoConquistas: [] })
    gravarSave(estado)
    return true
  },

  recrutar: (classe) => {
    const { jogo } = get()
    const novo = recrutarRegra(jogo, classe)
    if (novo === jogo) return
    set({ jogo: novo })
    somAtivo(novo, 'entrega')
  },

  equipar: (heroiId, itemId) => {
    const { jogo } = get()
    const novo = equiparRegra(jogo, heroiId, itemId)
    if (novo === jogo) return
    set({ jogo: novo })
    somAtivo(novo, 'equipar')
  },

  desequipar: (heroiId, slot) => {
    const { jogo } = get()
    const novo = desequiparRegra(jogo, heroiId, slot)
    if (novo !== jogo) set({ jogo: novo })
  },

  // O relógio das expedições é o do jogo (lastTick, atualizado a cada 200 ms), o mesmo que decide a volta.
  enviarExpedicao: (heroiId, tipo) => {
    const { jogo } = get()
    const novo = partir(jogo, heroiId, tipo, Date.now())
    if (novo === jogo) return
    set({ jogo: novo })
    somAtivo(novo, 'partir')
  },

  coletarExpedicao: (id) => {
    const { jogo } = get()
    const r = coletarRegra(jogo, id, Date.now())
    if (r.estado === jogo) return
    set({ jogo: r.estado, ultimaColeta: { id: ++contadorColeta, coleta: r.coleta } })
    somAtivo(r.estado, 'moeda')
  },

  coletarTodas: () => {
    const { jogo } = get()
    const r = coletarTodasRegra(jogo, Date.now())
    if (r.estado === jogo) return
    set({ jogo: r.estado, ultimaColeta: { id: ++contadorColeta, coleta: r.coleta } })
    somAtivo(r.estado, 'moeda')
  },

  lutar: (chefe, heroiIds) => {
    const { jogo } = get()
    const r = lutarChefe(jogo, chefe, heroiIds)
    if (r.resultado.equipe.length === 0) return
    set({
      jogo: r.estado,
      combate: { id: ++contadorCombate, chefe, resultado: r.resultado, recompensa: r.recompensa },
    })
  },

  fecharCombate: () => set({ combate: null }),

  construir: (id) => {
    const { jogo } = get()
    const novo = construirRegra(jogo, id)
    if (novo === jogo) return
    set({ jogo: novo })
    somAtivo(novo, 'construir')
  },

  comprarTalento: (id) => {
    const { jogo } = get()
    const novo = comprarTalentoRegra(jogo, id)
    if (novo === jogo) return
    set({ jogo: novo })
    somAtivo(novo, 'raro')
  },

  // Reforjar é a ação mais forte do jogo: a UI só chama depois da confirmação (segurar o botão).
  reforjar: () => {
    const { jogo } = get()
    const agora = Date.now()
    const brasas = brasasDoCiclo(moedasDoCicloComPendentes(jogo, agora))
    const novo = reforjarRegra(jogo, agora)
    if (novo === jogo) return
    set({ jogo: novo, ultimoReforjar: { id: ++contadorReforjar, brasas }, batidaAtiva: null, combate: null })
    gravarSave(novo)
    somAtivo(novo, 'vitoria')
  },

  // O relógio da entrega é o mesmo que decide o prazo (Date.now), não o lastTick.
  entregarEncomenda: (id) => {
    const { jogo } = get()
    const r = entregarRegra(jogo, id, Date.now())
    if (!r.entrega) return
    set({
      jogo: r.estado,
      ultimaEntrega: { id: ++contadorEntrega, entrega: r.entrega },
      ultimoGanho: { id: ++contadorGanho, valor: r.entrega.moedas },
    })
    somAtivo(r.estado, 'entrega')
  },

  alternarAutoVenda: () => set({ jogo: { ...get().jogo, autoVenda: !get().jogo.autoVenda } }),

  som: (id, volume) => {
    if (get().jogo.som) tocar(id, volume)
  },

  alternarSom: () => {
    const novo = { ...get().jogo, som: !get().jogo.som }
    set({ jogo: novo })
    somAtivo(novo, 'marco') // confirma que ligou (o toque também destrava o áudio no celular)
  },

  dispensarDica: (id) => {
    const { jogo } = get()
    if (jogo.dicasVistas.includes(id)) return
    set({ jogo: { ...jogo, dicasVistas: [...jogo.dicasVistas, id] } })
  },

  fecharAvisoConquistas: () => set({ avisoConquistas: [] }),
}))
