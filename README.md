# Brasa & Bigorna

RPG idle + tycoon mobile (PWA) sobre uma forja de vilarejo de fronteira. Veja o `GDD.md` para a visão completa.
Estado atual: **Fatia 1** (Mina, Carvoaria, Fornalha, venda, idle, progresso offline, save e simulador).

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
fica oculta. O formato tem `version`; `src/game/save.ts` tem o registro de migrações (vazio, só existe a v1) e um teste que
mostra a cadeia v1 -> v2 -> v3.

## Simulador (`npm run sim`)

`scripts/sim.ts` roda direto com `node scripts/sim.ts`: o Node 22.18+ remove os tipos TypeScript sozinho, então não precisa
de `tsx` nem de build. A única regra é escrever os imports com a extensão (`./tick.ts`).

O simulador joga N horas com a estratégia gulosa: compra sempre o upgrade de melhor retorno por moeda, vende lingotes e o
excedente de minério e carvão. Imprime primeira compra, nível 10 de cada estação, maiores intervalos sem compra e
moedas/s em 5 min, 20 min e 1 h. As metas de ritmo do GDD §4.4 que valem para a fatia 1 são testes em
`src/game/sim.test.ts`. Se falharem, ajuste as constantes em `constants.ts` (não o teste) e registre no GDD §4.2.

## Arte

Os sprites finais ficam em `public/sprites/` (`mina.png`, `carvoaria.png`, `fornalha.png` 32x32, `fornalha_acesa.png`
128x32 com 4 quadros, `icone_*.png` 16x16). Enquanto não existirem, o componente `Sprite` mostra um quadrado da paleta
com a inicial.
