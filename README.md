# Brasa & Bigorna

RPG idle + tycoon mobile (PWA) sobre uma forja de vilarejo de fronteira. Veja o `GDD.md` para a visão completa.
Estado atual: **Fatia 3** (heróis, equipamento, expedições, o Golem de Escória, a Serra Cinzenta e o Forno de aço),
sobre a Fatia 2 (Bigorna, itens com qualidade, minigame da batida e ferreiros) e a Fatia 1
(Mina, Carvoaria, Fornalha, venda, idle, progresso offline, save e simulador).

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes (Vitest)
npm run typecheck  # tsc em modo strict
npm run build      # tsc -b && vite build
npm run sim        # simulador de ritmo (2 h por padrão)
npm run sim -- 8   # simula 8 h
```

Requer Node 22.18 ou superior.

## Arquitetura

```
src/game/        Regras do jogo: funções puras, sem React, sem relógio, sem I/O
  constants.ts   Todas as curvas do GDD §4.2 (custos, produção, marcos, preços)
  state.ts       GameState serializável (version + lastTick)
  tick.ts        tick(state, dt): produção e fornalha com gargalo
  offline.ts     applyOffline(state, now): teto de 2 h, passos de 10 s, resumo
  economy.ts     comprarUpgrade e vender
  rng.ts         mulberry32: sorteio determinístico com o estado guardado no save
  items.ts       tipos, receitas, qualidade (Q), valor e nomes dos itens
  bigorna.ts     tarefa de forja, fila, modo automático, minigame, conclusão do item
  batida.ts      avaliarBatida(posição, zonas) e posição do marcador
  ferreiros.ts   contratar, alocar, XP e passivas
  herois.ts      classes, atributos, XP, equipar/desequipar e recrutamento
  expedicoes.ts  chance, loot, partir (sorteio gravado na partida) e coletar
  chefe.ts       combate determinístico por rodadas (devolve o log) e o Golem
  inventario.ts  venda individual e em massa por qualidade
  chain.ts       taxas e análise de gargalo (usadas pela UI e pelo sim)
  save.ts        validação e migração de save por versão
  format.ts      números grandes em pt-BR (1,2 K, 3,4 M, ...)
  sim.ts         simulador guloso
src/store.ts     Zustand: liga as regras ao localStorage e ao relógio
src/components/  UI (React + motion/react)
scripts/sim.ts   Entrada de `npm run sim`
```

**Por que regras puras em `src/game`?** Uma função pura (mesma entrada, mesma saída, sem efeitos) é trivial de testar,
roda igual no navegador, no Vitest e no Node (é assim que o simulador reutiliza o jogo inteiro sem abrir uma aba).
A UI só lê o estado e chama essas funções.

**Por que o offline roda em passos de 10 s?** Porque a produção depende de estoque: se a mina para de render ou o carvão
acaba no meio da ausência, um único cálculo `taxa × tempo` erraria. Em passos, o gargalo é respeitado a cada intervalo
(e o mesmo `tick` serve para online e offline). O tempo é limitado a 2 h e um relógio que voltou no tempo é ignorado
sem punir o jogador.

**Por que `number` e não `bigint`?** Os valores do MVP ficam muito abaixo de 1e15, onde o `double` ainda é exato para o que
mostramos. `bigint` não aceita frações (produção de 0,5/s) e complicaria todas as fórmulas. O teste do simulador falha se
algum valor passar de 1e15; nesse dia trocamos por `break_infinity.js`.

**Save:** `localStorage` com a chave `brasa-e-bigorna:save` (e um backup do save anterior). Grava a cada 5 s e quando a aba
fica oculta. O formato tem `version`; `src/game/save.ts` tem o registro de migrações (v1 -> v2 -> v3, cada uma com teste) e valida o
formato atual (herói com item no espaço errado ou expedição de herói inexistente não corrompem o resto do save).

## Decisões da Fatia 2

**RNG com semente no estado, nunca `Math.random` nas regras.** O gerador (mulberry32, 32 bits) vive em `GameState.rng`.
Cada sorteio devolve `{ valor, rng }` e quem chama grava o novo `rng`. Assim o sim e os testes são reproduzíveis e o
sorteio fica salvo. (`Math.random` aparece só na store, uma vez, para escolher a semente de um jogo novo.)

**Minigame da batida à prova de "fecha o app e tenta de novo".** Ao começar uma tarefa, `iniciarTarefa` sorteia e GRAVA
tudo de uma vez: o aleatório da qualidade (0..20), a posição do alvo da batida e o sorteio de 10 % da Iara. O minigame só
soma um bônus (+5 automático ou errou, +10 bom, +20 perfeito) ao que já foi sorteado; ele nunca rerrola nada. Se o jogador
fecha o app com o overlay aberto, `applyOffline` converte o minigame pendente em "feito, automático": sem segunda chance.
"Forjar com batida" é opt-in por item e só vale com a bigorna livre (não entra na fila), então o overlay nunca surge sozinho.

**Reduced motion no minigame.** O marcador continua se movendo, mas bem mais devagar (ida e volta em 3,6 s em vez de
1,4 s), sem faíscas e sem número subindo. Escolhi isso em vez de um "alvo fixo que pisca" porque piscar é pior para quem
tem sensibilidade a flashes, e o timing (a habilidade do minigame) continua existindo. Os 3 s e as zonas são iguais; só a
velocidade muda. Também dá para bater com Espaço ou Enter, e o "perfeito" vibra 15 ms quando o aparelho suporta.

**A bigorna trabalha por tarefas, não por taxa.** Mina, carvoaria e fornalha produzem por segundo; a bigorna tem uma
`Forja` em andamento (progresso 0..1), uma fila (até 5) e o modo automático. `tickDetalhado` fatia passos grandes
(offline: 10 s) em subpassos de 1 s quando a bigorna existe, para ela não perder tempo esperando lingotes. Offline não tem
minigame (bônus automático) e o inventário cheio para a bigorna.

**Save v2.** `MIGRACOES[1]` leva o save da Fatia 1 para a v2 (bigorna no nível 0, inventário vazio, ferreiros por contratar,
semente derivada do último tick). `validarEstado` rejeita itens ou ferreiros malformados e corrige postos inválidos.

**Bug da Fatia 1 corrigido.** O primeiro clique em "Vender tudo" logo depois de fechar o modal offline era engolido pelo
fundo do modal, que continuava na tela durante a animação de saída. Agora o fundo usa `pointer-events: none` assim que
começa a sair (`useIsPresent` do motion). Não há teste automático para isso (não temos navegador nos testes); vale conferir
no celular.

## Decisões da Fatia 3

**Combate determinístico, com log.** `simularCombate` (`src/game/chefe.ts`) não sorteia nada: dano = `max(1, ATQ × 100 / (100 + DEF))`,
ordem por VEL (empate: herói antes do chefe), até 30 rodadas, o chefe bate no primeiro herói vivo da formação (maior DEF na
frente). Devolve um log de golpes (quem, em quem, dano, PV restante). Por isso a "previsão" da UI não é uma estimativa: é a
mesma função rodando antes de lutar. O replay de ~6 s só reproduz o log (passo = tempo total / número de golpes, entre 35 e
450 ms); com `prefers-reduced-motion` vai direto para o resultado. Derrota não custa nada.

**Resultado da expedição sorteado na partida.** `partir` sorteia (RNG com semente do estado) o sucesso, o fragmento e já calcula o
loot final (falha = 30 % de moedas e XP, sem reputação nem fragmento), e grava tudo na expedição com o horário de volta. A volta é
só `agora >= fim`: funciona com o app fechado e fechar e reabrir não rerrola nada. O teto offline de 2 h vale para a produção, não
para expedições. O loot espera um toque em "Coletar" (decisão de game feel; o resumo offline avisa quem voltou).

**1 herói por expedição, grupo só para o chefe.** Expedições simultâneas = número de heróis. O chefe luta com todos os heróis livres
que o jogador marcar.

**Recrutamento sem encomendas.** O 1º herói é comprado (3 500 moedas, achado pelo sim para ~10 min); expedições bem-sucedidas dão
5 a 15 de reputação, que abre o 2º herói em 150; o Golem abre o 3º; o 4º espera a Taverna (fatia 4). Detalhes e alternativas no GDD §9.

**Elmo com espaço próprio** (4 espaços de equipamento) e atributos de item = `base × multQualidade × multMaterial`.

**Forno de aço.** Uma estação a mais na cadeia (`tick.ts`): pega lingotes de ferro e carvão que sobraram da fornalha e para com 60 de
aço parado. A bigorna ganhou a escolha de material; a fila e o modo automático guardam o material. Produz offline como as outras.

**Save v3.** `MIGRACOES[2]` acrescenta forno, aço, material na fila, heróis, expedições, reputação, fragmentos e chefes derrotados.

## Simulador (`npm run sim`)

`scripts/sim.ts` roda direto com `node scripts/sim.ts`: o Node 22.18+ remove os tipos TypeScript sozinho, então não precisa
de `tsx` nem de build. A única regra é escrever os imports com a extensão (`./tick.ts`).

O simulador joga N horas com a estratégia gulosa: compra sempre a melhor opção em ganho de renda por moeda (upgrades das 4
estações e contratação de ferreiros, com a alocação ótima achada por força bruta), roda a bigorna em modo automático com a
receita de melhor valor por segundo, vende os itens e o excedente de lingotes, minério e carvão. Não usa o minigame (pior
caso). Na Fatia 3 ele também poupa e contrata o 1º herói, guarda e equipa os melhores itens, manda expedições (a de maior
valor por hora com chance >= 70 %), luta com o Golem quando a previsão dá vitória e depois compra o Forno de aço e forja em aço. Imprime primeira compra, nível 10 de cada estação, bigorna desbloqueada, primeiro item incomum/raro/épico/lendário,
primeiro ferreiro, primeiro herói, primeira expedição, Golem derrotado, Forno de aço comprado, primeiro lingote de aço,
primeiro lendário (de ferro e de aço), maiores intervalos sem compra e moedas/s em 5 min, 20 min e 1 h. As metas de ritmo do GDD §4.4 (inclusive
"bigorna entre 3 e 8 min") são testes em `src/game/sim.test.ts`. Se falharem, ajuste as constantes em `constants.ts` (não o teste) e registre no GDD §4.2.

## Arte

Os sprites finais ficam em `public/sprites/` (`mina.png`, `carvoaria.png`, `fornalha.png` 32x32, `fornalha_acesa.png`
128x32 com 4 quadros, `icone_*.png` 16x16). A Fatia 2 usa também `bigorna.png` (32x32), `bigorna_batendo.png` (128x32, 4
quadros), `item_<tipo>_<material>.png` (16x16) e `ferreiro_<id>.png` (24x24). A Fatia 3 usa `heroi_<classe>.png` (24x24, classes
`guerreiro`, `guardia`, `batedor`), `heroi_<classe>_andando.png` (96x24, 4 quadros), `chefe_golem.png` (48x48), `forno_aco.png`
(32x32), `forno_aco_aceso.png` (128x32, 4 quadros), `icone_lingote_aco.png`, `icone_fragmento.png`, `icone_reputacao.png`
(16x16) e `regiao_vale.png`, `regiao_serra.png` (banners de 96x32). Enquanto não existirem, o componente `Sprite` mostra um quadrado da paleta
com a inicial.
