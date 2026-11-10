# Brasa & Bigorna

> GDD v0.3. As decisões fechadas em 09/11/2026 estão na §9, junto com as da fatia 3 (heróis, expedições, Golem e aço). Itens marcados `[suposição]` são decisões que tomei sem confirmar; todos os números são o ponto de partida e serão ajustados pelo `npm run sim`, não no chute.

## 1. Visão

**Pitch:** você herda uma forja abandonada num vilarejo de fronteira. Ela trabalha sozinha enquanto você decide o que melhorar, o que forjar e quem equipar. Os heróis que usam suas armas derrubam os chefes da região, e quando o vilarejo vira cidade você reforja tudo e recomeça mais forte.

**Pilares de design**
1. **A forja nunca para.** Toda abertura do app mostra progresso (produção offline, expedições que voltaram, encomendas novas). Sessões de 30 s já valem a pena.
2. **Cada decisão aparece no mundo.** Um upgrade muda um número *e* a cena: a fornalha brilha mais, o herói volta com a espada que você fez. A qualidade de um item é rastreável até quem o forjou.
3. **Interagir é bônus, não obrigação.** O minigame da bigorna e as encomendas recompensam quem joga ativo, mas o automático sempre avança.

**Pilar em uma frase:** *o jogador sente que construiu, peça por peça, a forja que arma os heróis da fronteira.*

**Público e plataforma**
- Jogadores casuais e de idle que jogam em pausas curtas, várias vezes ao dia; também recrutadores vendo o portfólio (precisa ser jogável e entendível em 2 min).
- PWA mobile-first, retrato, 390 px de largura, offline e instalável. Capacitor depois.

**Referências de gênero (mecânica, não conteúdo)**
- Idle incremental com prestígio: produção por segundo, custo exponencial, moeda de prestígio com bônus permanente.
- Tycoon de cadeia de produção: estações que transformam recurso A em B, gargalos que o jogador resolve.
- RPG de expedições automáticas: equipe montada fora da luta, resultado calculado por números.

## 2. Core loop

```
 minerar (idle) ──> fundir ──> forjar ──┬─> vender ──> moedas ──> upgrades/contratações ─┐
   minério+carvão     lingote    item    │                                               │
                                         └─> equipar heróis ──> expedição/chefe ──> loot, │
                                                                 XP, material raro ───────┤
                                                                                           v
                                              nova região / nova estação / mais produção ─┘
```

| Loop | Duração | O que o jogador faz | Recompensa |
|---|---|---|---|
| Curto | 30 s – 5 min | Coleta o offline, compra 2–5 upgrades, inicia forjas, joga 1–3 minigames, manda heróis em expedição | Números subindo, item raro ocasional |
| Médio | 1 – 2 dias | Cumpre encomendas, sobe ferreiros, derrota o chefe da região | Nova região, novo material, construções |
| Longo | 2 – 4 dias por ciclo | Leva o vilarejo a cidade e Reforja | Brasas Ancestrais, talentos permanentes |

## 3. Mecânicas

| Mecânica | Como funciona | Pilar |
|---|---|---|
| Produção idle | Mina e Carvoaria geram recurso por segundo, também com o app fechado (teto offline) | 1 |
| Cadeia de conversão | Fornalha: 2 minério + 1 carvão → 1 lingote. Bigorna: lingotes → item. Cada estação tem nível, velocidade e fila | 2 |
| Gargalo visível | A estação mais lenta da cadeia fica destacada (metal esfriando = parada) | 2 |
| Venda | Loja vende minério, lingote ou item por moedas. Item vale muito mais que o lingote que ele usou | 2 |
| Qualidade de item | Comum → Lendário, calculada pelo ferreiro, pela bigorna, pelo material e pelo minigame opcional | 2, 3 |
| Minigame "batida" | 3 s, um marcador oscila sobre a barra de calor; tocar na zona certa. Nunca reduz qualidade | 3 |
| Ferreiros | Contratados por moedas, alocados a uma estação, sobem de nível com o uso, cada um tem 1 passiva | 2 |
| Heróis | 3 classes, 4 atributos (PV, ATQ, DEF, VEL), 4 espaços de equipamento: arma (espada ou machado), escudo, armadura e elmo. *Decidido na fatia 3: o elmo ganhou espaço próprio. Dividindo o espaço com a armadura ele nunca seria usado (a armadura sempre vence), e a receita do elmo existe desde a fatia 2* | 2 |
| Expedições | **1 herói por expedição**, por um tempo fixo; sucesso por chance calculada; volta com loot e XP. O resultado é sorteado e gravado **na partida**, a volta é decidida pelo relógio e o loot espera a coleta (um toque). Falha devolve 30 % das moedas e do XP, sem morte | 1, 3 |
| Chefe da região | Combate determinístico por rodadas, simulado na hora, com replay animado de ~6 s. Luta o grupo todo (todos os heróis livres que o jogador marcar) | 2 |
| Encomendas | NPCs pedem itens com qualidade mínima e prazo; pagam moedas extras e reputação | 3 |
| Reputação | Libera construções do vilarejo, e a última delas (Muralha) libera o prestígio | 2 |
| Reforjar (prestígio) | Zera produção, moedas, itens e estações; mantém Brasas Ancestrais, talentos e heróis (nível volta a 1, equipamento some) | 1 |

## 4. Progressão e economia

### 4.1 Recursos

| Recurso | Fonte | Sink |
|---|---|---|
| Minério de ferro | Mina | Fornalha, venda (0,2 moeda) |
| Carvão | Carvoaria | Fornalha, Forno de aço (venda 0,3) |
| Lingote de ferro | Fornalha | Bigorna, Forno de aço, venda (2 moedas) |
| Lingote de aço (região 2) | Forno de aço: 1 lingote de ferro + 2 carvão, 6 s | Bigorna (itens de aço), venda (8) |
| Item | Bigorna | Venda, equipar, encomenda |
| Moedas | Venda, encomendas, expedições | Upgrades, contratações, construções |
| Reputação | Expedições bem-sucedidas (fatia 3), chefes, encomendas (fatia 5) | Não se gasta: é um limiar que libera heróis e construções |
| Fragmento rúnico | Expedições, chefes | Encantar item (+1 nível de qualidade, V2) e talentos da região 2 |
| Brasas Ancestrais | Reforjar | Árvore de talentos (gasta) + bônus passivo das não gastas |

### 4.2 Fórmulas

`n` = nível atual da estação. `marco(n)` = ×2 a cada marco de nível 10, 25, 50, 100 (acumulativo: no nível 25 é ×4).

| O quê | Fórmula |
|---|---|
| Custo da mina (n → n+1) | `10 × 1,15^n` moedas |
| Produção da mina | `1 × n × marco(n)` minério/s |
| Custo da carvoaria | `15 × 1,15^n` |
| Produção da carvoaria | `0,5 × n × marco(n)` carvão/s |
| Custo da fornalha | `50 × 1,18^n` |
| Velocidade da fornalha | `0,25 × (1 + 0,15 × (n − 1)) × marco(n)` lingote/s |
| Custo do Forno de aço | `400 × 1,2^n` para n ≥ 1; o desbloqueio (nível 0 → 1) custa **2 500** e só existe depois do Golem. Mesmo padrão da bigorna `[suposição]` |
| Velocidade do Forno de aço | `(1/6) × (1 + 0,15 × (n − 1)) × marco(n)` lingote de aço/s (6 s no nível 1). Consome 1 lingote de ferro + 2 carvão por aço; pega o que a fornalha deixou e **para com 60 lingotes de aço parados**, para não engolir todo o ferro à toa `[suposição]`. Aceita ferreiro, só Mestre Odair |
| Custo da bigorna | `200 × 1,2^n` para n ≥ 1; o desbloqueio (nível 0 → 1) custa **500**. *Ajustado pelo sim: com 200 a bigorna saía em 3 min, abaixo da meta de ~5 min; com 500 sai em 5 min* |
| Tempo de forja do item | `base × 0,92^(n−1)`; espada 3 lingotes/10 s, machado 3/10 s `[suposição]`, escudo 4/12 s, elmo 4/12 s `[suposição]`, armadura 6/20 s |
| Valor de venda do item | `valorBase × multQualidade × multMaterial`; espada 25, escudo 30, armadura 50, machado 25 `[suposição]`, elmo 30 `[suposição]`; ferro ×1, aço ×4 |
| Custo de contratar ferreiro | `100 × 4^k` (k = ferreiros já contratados) |
| XP do ferreiro | 1 XP por item forjado na bigorna; na fornalha, 1 XP por 10 lingotes; na carvoaria, 1 por 20 carvões; no forno de aço, 1 por 10 lingotes de aço; na mina, 1 por 40 minérios `[suposição]` (divisores para os níveis subirem num ritmo parecido, ~1 XP/10 s no começo). Próximo nível em `10 × 1,65^(n−1)`, máximo nível 20. Ajustado pelo sim: com 1,3 o ferreiro chegava ao 20 em ~1 h e o épico saía aos 33 min |
| XP do herói (n → n+1) | `50 × 1,25^(n−1)` |
| Poder base do herói | `20 × 1,12^(n−1)`, distribuído entre atributos pela classe (tabela abaixo) |
| Teto offline | 2 h, +2 h no Armazém, +2 h por talento (máx. 12 h) |
| Inventário de itens | 30 itens, configurável no estado (`limiteInventario`) `[suposição]`. Cheio, a bigorna para (também offline) |
| Produção offline | 100 % da taxa, simulada em passos de 10 s (respeita gargalos e filas) `[suposição]` |

**Qualidade do item**

`Q = 2 × nívelFerreiro + ⌊nívelBigorna / 3⌋ + bônusMaterial + bônusBatida + aleatório(0..20)`

- Ajustado pelo sim: com a bigorna valendo o nível inteiro, ela (que não tem teto) dominava a fórmula e 75 % dos itens eram lendários após 2 h. Agora o teto prático no ferro, só no automático, é ~80 a 90 (épico).
- Lendário de ferro exige batida perfeita (o atalho do minigame) ou Mestre Odair no máximo com sorte. No aço (+10) o lendário automático passa a ser alcançável: é a recompensa da região 2.

- `bônusMaterial`: ferro 0, aço 10.
- `bônusBatida`: automático +5, "bom" +10, "perfeito" +20, errou +5 (nunca pior que o automático).
- Faixas: `< 30` comum (×1), `30–49` incomum (×1,5), `50–69` raro (×2,5), `70–89` épico (×4), `≥ 90` lendário (×7). O multiplicador vale para o preço e para os atributos.

**Heróis (fatia 3, `[suposição]` ajustada pelo sim)**

Cada classe divide o poder base `20 × 1,12^(n−1)` (vezes o fator da classe) entre ATQ, DEF e PV. O PV vale 10 pontos de vida por ponto de poder, porque o poder de expedição conta `PV/10`: um herói de nível 1 sem itens tem poder de expedição igual ao poder base. A VEL não entra no poder.

| Classe | ATQ | DEF | PV | Fator de poder | VEL (nível 1, +2 % por nível) | Extra |
|---|---|---|---|---|---|---|
| Guerreiro | 55 % | 20 % | 25 % | 1,0 | 10 | |
| Guardiã | 20 % | 40 % | 40 % | 1,0 | 6 | |
| Batedor | 40 % | 20 % | 40 % | 0,9 | 16 | +20 % de moedas e de chance de fragmento nas expedições |

Atributos dos itens = `base × multQualidade × multMaterial` (os mesmos multiplicadores do preço: lendário de aço rende 28× o comum de ferro). Cada atributo base > 0 rende pelo menos 1.

| Item | Espaço | Base (comum de ferro) |
|---|---|---|
| Espada | Arma | ATQ 28, VEL 2 |
| Machado | Arma | ATQ 40 |
| Escudo | Escudo | DEF 18 |
| Armadura | Armadura | PV 400, DEF 10 |
| Elmo | Elmo | PV 150, DEF 7 |

Equipar tira o item do inventário e, se o espaço estava ocupado, devolve o anterior (o inventário não muda de tamanho). Desequipar devolve o item se houver espaço. Herói em expedição, ou com o loot ainda por coletar, não troca de equipamento.

**Expedições**

- Poder do herói `P = ATQ + DEF + PV/10` (já com os itens). **1 herói por expedição**: o número de expedições simultâneas é o número de heróis. O grupo todo só se junta para o chefe.
- Chance de sucesso `p = limitar(0,5 + (P − D) / (2D), 0,05, 0,95)`, onde `D` é a dificuldade da expedição.
- Região 1 (Vale da Bigorna): 2 min (D 40, Trilha do Riacho), 10 min (D 70, Moinho Abandonado), 30 min (D 110, Gruta dos Ecos). Região 2 (Serra Cinzenta, abre com o Golem): 1 h (D 300, Passo dos Ventos), 4 h (D 550, Desfiladeiro da Cinza), 8 h (D 800, Pico do Corvo).
- Loot no sucesso: moedas `= 15 × D^0,8 × horas^0,5` (+20 % com Batedor), XP `= D / 2`, fragmento com `10 % × horas` (+20 % com Batedor, no máximo 100 %), **reputação `[suposição]` de 5 a 15 por sucesso** (`5 + 10 × min(1, horas/4)`, arredondado: 5 nas curtas, 15 a partir de 4 h). Falha: 30 % das moedas e do XP, sem reputação nem fragmento.
- **Resultado gravado na partida**: o sucesso, o fragmento e o loot final são sorteados quando o herói parte (RNG com semente do estado) e guardados com o horário de volta. Fechar e reabrir o app não rerrola; offline, a volta é decidida só pelo relógio (o teto de 2 h vale para a produção, não para expedições: uma de 8 h volta no relógio).
- **Coleta manual**: o loot só entra quando o jogador toca em "Coletar" (ou "Coletar tudo"). O herói fica "em expedição" até lá. O resumo offline lista quem voltou e o loot que espera. Escolhi manual pelo game feel (números subindo) e porque o resultado já está decidido, então esperar não perde nada.

**Chefe (combate por rodadas)**

- Dano `= max(1, ATQ × 100 / (100 + DEF do alvo))`, arredondado ao inteiro mais próximo. Ordem por VEL (maior primeiro; empate: heróis antes do chefe). Até 30 rodadas; se o chefe não cair, a equipe recua sem perdas. Os heróis batem no chefe; o chefe bate no primeiro herói vivo da formação, que é ordenada por DEF (maior na frente). A função devolve o log de golpes para o replay e a UI mostra a previsão antes de lutar (a previsão é o próprio cálculo, então é exata).
- Chefe 1, **Golem de Escória**: ATQ 40, DEF 20, VEL 8, **PV 1 500**. *Ajustado pelo sim: com os 2 000 do rascunho, o único herói de que o jogador dispõe aos ~20 min (a 2ª vaga exige 150 de reputação) só vence com itens raros, que o sim forja a partir dos ~24 min, e o Golem caía por volta dos 27 min com 29 rodadas, no limite. Com 1 500 cai aos 24 min em 25 rodadas, com folga*. Libera região 2 e o Forno de aço.
- Chefe 2, **Serpe de Cinza**: PV 25 000, ATQ 220, DEF 120. Libera a Muralha (prestígio).
- Recompensa: 100 de reputação, 5 fragmentos, item lendário garantido de presente.

**Prestígio "Reforjar"**

- Disponível com a Muralha construída (reputação 1 000 e chefe 2 derrotado).
- `Brasas = floor( sqrt( moedasTotaisDoCiclo / 1 000 000 ) )`.
- Brasa não gasta: +2 % de produção cada. Talentos custam 1, 2, 3, 5, 8 brasas por tier.

**Notas da fatia 2 (`[suposição]`)**

- Fila de forja: até 5 receitas; os lingotes são gastos quando a tarefa começa. O modo automático repete a última receita enquanto houver lingotes e espaço.
- Iara: o sorteio de 10 % é gravado quando a tarefa começa; o segundo item sai igual ao primeiro, sem gastar lingotes, se houver espaço.
- Odair na bigorna: +5 % (+10 % no nível 10) de velocidade e multiplica o Q final.
- Ferreiro sem posto não dá bônus; sem ferreiro na bigorna, o nível do ferreiro conta 0 e o item sai "forjado por Você".
- "Forjar com batida" só vale com a bigorna livre (nunca entra na fila). Abandonar o minigame vale o bônus automático (+5).
- O sim joga sempre no automático (sem batida), o pior caso.

**Notas da fatia 3 (`[suposição]`)**

- O aço é um material escolhido na bigorna ("Ferro | Aço", só depois do forno). A receita gasta lingotes do material escolhido; o pedido da fila e o modo automático guardam o material. Lingote de aço vende por 8; o material aço soma +10 na qualidade e multiplica valor e atributos por 4.
- Estratégia do sim com heróis: poupa para o 1º herói assim que a bigorna existe (só compra o que se paga antes de a meta ficar pronta); a bigorna passa a priorizar o espaço de equipamento onde o item típico mais melhora o kit; guarda os N melhores itens por espaço (N = heróis); equipa ao voltar da expedição; manda a expedição de maior valor por hora com chance ≥ 70 %; luta com o Golem no primeiro retorno em que a previsão é vitória; depois compra o forno (meta de poupança) e forja em aço quando há lingotes de aço para a receita, em ferro caso contrário.
- O resultado do sim depende do kit: aos 9 min o herói com itens incomuns causa ~900 de dano em 21 rodadas (não basta); o salto vem com os primeiros itens raros (~24 min).
- Reputação, fragmentos e o item lendário do Golem não entram na renda do sim, só as moedas das expedições.

### 4.3 Primeiros 10 níveis

| n | Mina custo → n+1 | Minério/s | Carvoaria custo | Carvão/s | Fornalha custo | Lingote/s | XP do herói → n+1 | Poder base |
|---|---|---|---|---|---|---|---|---|
| 1 | 11,5 | 1 | 17,3 | 0,5 | 59 | 0,25 | 50 | 20 |
| 2 | 13,2 | 2 | 19,8 | 1,0 | 70 | 0,29 | 63 | 22 |
| 3 | 15,2 | 3 | 22,8 | 1,5 | 82 | 0,33 | 78 | 25 |
| 4 | 17,5 | 4 | 26,2 | 2,0 | 97 | 0,36 | 98 | 28 |
| 5 | 20,1 | 5 | 30,2 | 2,5 | 114 | 0,40 | 122 | 31 |
| 6 | 23,1 | 6 | 34,7 | 3,0 | 135 | 0,44 | 153 | 35 |
| 7 | 26,6 | 7 | 39,9 | 3,5 | 159 | 0,47 | 191 | 39 |
| 8 | 30,6 | 8 | 45,9 | 4,0 | 188 | 0,51 | 238 | 44 |
| 9 | 35,2 | 9 | 52,8 | 4,5 | 222 | 0,55 | 298 | 50 |
| 10 | 40,5 | 20 | 60,7 | 10,0 | 262 | 1,17 | 373 | 55 |

Leitura: a mina sobe rápido e barato, a fornalha é o gargalo de propósito. A decisão do começo é "vendo o minério sobrando barato ou junto para subir a fornalha?".

### 4.4 Metas de ritmo (viram testes do `npm run sim`)

| Marco | Alvo (estratégia gulosa simples) |
|---|---|
| Primeira compra | < 15 s |
| Maior intervalo sem nada comprável | ≤ 10 min |
| Bigorna liberada | ~5 min (teste: entre 3 e 8 min) |
| Primeiro herói | ~10 min (teste: entre 5 e 15 min; o sim contrata aos 10 min com custo de 3 500 moedas) |
| Chefe 1 | ~20 min de jogo ativo (teste: entre 15 e 40 min; o sim derrota o Golem aos 24 min) |
| Chefe 2 | 18 – 30 h (com offline) |
| Primeiro Reforjar | 2 – 4 dias, rendendo 5 – 15 brasas |
| Segundo ciclo | ≤ 60 % do tempo do primeiro |
| Primeiro épico **de ferro** | ~2 h de jogo contínuo no automático (teste aceita 1 h 30 a 2 h 45). Depois do Golem o sim forja em aço (+10 de qualidade) e o épico de aço sai aos ~47 min |
| Épicos de ferro nas primeiras 3 h | < 10 % dos itens de ferro |
| Lendário de ferro no automático | nenhum nas primeiras 3 h (só com batida perfeita ou aço). O lendário de aço no automático sai por volta de 6 h (sim de 8 h) |

### 4.5 Exploits e mitigação

| Risco | Mitigação |
|---|---|
| Adiantar o relógio do celular | Teto offline; se o relógio voltar no tempo, ignora o intervalo negativo e não pune |
| Fechar o app durante o minigame para tentar de novo | O resultado aleatório é sorteado e salvo antes do minigame começar. **Implementado:** o RNG (mulberry32) vive no estado; o aleatório da qualidade, o alvo da batida e o sorteio da Iara são gravados no início da tarefa; minigame aberto ao fechar o app vale o automático |
| Repetir expedições curtas infinitamente | XP e loot com `horas^0,5`: curtas rendem mais por hora, mas exigem presença; é o trade-off desejado. **Confirmado pelo sim:** a "melhor por hora com chance ≥ 70 %" é sempre a Trilha do Riacho (2 min). O custo é a reputação: um jogador presente ganha ~5 por 2 min por herói (765 em 2 h com 3 heróis). Reavaliar na fatia 4 antes de ligar a Muralha (1 000) à reputação |
| Reabrir o app para rerrolar uma expedição | O sucesso, o fragmento e o loot são sorteados e salvos na partida; a volta é só comparação de timestamps. Teste: o resultado coletado não muda com o relógio |
| Adiantar o relógio do celular para as expedições voltarem antes | **Em aberto (sem servidor).** O teto offline não cobre expedições, que usam o horário absoluto. O dano é limitado (o loot é pequeno perto da produção); mitigar na fatia 5 com checagem de relógio monotônico (`performance.now`/`Date.now` divergentes) se virar problema |
| Precisão de número grande | `number` (double) até ~1e15 no MVP com arredondamento só na exibição; teste que falha se algum valor do sim passar de 1e15 (aí troca para `break_infinity.js`) |
| Save corrompido | Versão no save + migrações testadas; backup do último save válido |

## 5. Conteúdo do MVP

**Estações:** Mina, Carvoaria, Fornalha, Bigorna, Forno de aço (região 2).

**Itens (× 2 materiais × 5 qualidades):** Espada, Machado, Escudo, Elmo, Armadura. Variações de material por troca de paleta.

**Receitas da bigorna (ferro; o aço entra na região 2):**

| Item | Lingotes | Tempo (nível 1) | Valor base |
|---|---|---|---|
| Espada | 3 | 10 s | 25 |
| Machado | 3 | 10 s | 25 `[suposição]` |
| Escudo | 4 | 12 s | 30 |
| Elmo | 4 | 12 s | 30 `[suposição]` |
| Armadura | 6 | 20 s | 50 |

Todas rendem 2,5 moedas/s por tempo de bigorna; a diferença está nos lingotes: espada, machado e armadura valem 8,3 por lingote, escudo e elmo 7,5.

**Ferreiros (originais):**

| Nome | Estação | Passiva |
|---|---|---|
| Tito, aprendiz | Fornalha | +15 % velocidade |
| Dona Cida | Bigorna | +10 Q ao forjar |
| Benê Carvoeiro | Carvoaria | +25 % produção |
| Iara do Malho | Bigorna | 10 % de chance de forjar 2 itens |
| Mestre Odair | Qualquer | +5 % em tudo da estação, dobra no nível 10 |

**Heróis (classes):** Guerreiro (ATQ), Guardiã (DEF/PV), Batedor (VEL, +20 % loot). O 1º é **contratado por moedas (3 500, achado pelo sim para ~10 min)**; o 2º chega com 150 de reputação (sem custo em moedas), o 3º ao derrotar o Golem e o 4º com a Taverna (fatia 4). As vagas abrem em ordem: o 3º só aparece depois do 2º. O jogador escolhe a classe ao recrutar; nomes (Bento, Tadeu, Heitor, Olavo; Dalva, Marlene, Cleide, Odete; Zeca, Tião, Nenê, Juca) saem em ordem. Ver §9 para o porquê.

**Construções (reputação):** Segunda fornalha (50), Armazém (+2 h offline, 150), Taverna (4º herói, 400), Mercado (+15 % preço, 650), Muralha (libera Reforjar, 1 000).

**Encomendas (modelos):** 8 NPCs fixos com pedidos sorteados, por exemplo "2 espadas de ferro, incomum ou melhor, em 2 h". Pagam `1,5 × valor` + 10 a 50 de reputação. Até 3 abertas ao mesmo tempo.

**Talentos (árvore com 3 ramos, 12 nós):** Fornalheiro (produção), Mestre de forja (qualidade), Capitão da guilda (expedições). Exemplos: +2 h de teto offline, começar com bigorna nível 5, +1 espaço de expedição.

**Conquistas (exemplos):** Primeiro lingote, Primeira lendária, 100 itens forjados, Golem derrotado, 10 batidas perfeitas seguidas, Primeiro Reforjar, Encomenda entregue com 1 min de sobra.

## 6. Estética e UX

- **Visual:** mesma linguagem do Forja: escala de calor do metal como informação (cinza frio = parado, laranja = trabalhando, branco-amarelo = no máximo), painéis de aço, Barlow / Barlow Condensed, sem caixa alta, sem emoji como ícone, um único momento animado por tela.
- **Paleta base** `[suposição]`: carvão `#1b1618`, aço escuro `#2e2a30`, aço `#5b5662`, brasa `#e2582a`, laranja `#f29a3a`, amarelo-quente `#ffd47a`, texto `#f3e9dc` (contraste ≥ 4,5:1 sobre carvão e aço escuro, verificar no teste de acessibilidade).
- **Arte:** tudo em `art/*.px.js` com `pxl-pixel-art`. Personagens 24×24, estações 32×32, ícones 16×16, animações de 4–6 quadros (martelo, fornalha, herói andando).
- **Tom de texto:** pt-BR, caloroso e de vilarejo, frases curtas. Ex.: "A fornalha esfriou. Falta carvão."
- **Juice:** números subindo do objeto que produziu, faíscas no golpe da bigorna, vibração de 15 ms no "perfeito", som curto opcional (desligado por padrão). Com `prefers-reduced-motion`: sem partículas nem tremor, números aparecem sem subir.
- **Alvos de toque** ≥ 44 px, ações principais na metade de baixo da tela.

**Telas (barra inferior com 5 abas)**
1. **Forja** (inicial): cena com as estações em cadeia, toque numa estação para melhorar.
2. **Guilda:** heróis, equipamento, inventário.
3. **Mapa:** expedições e chefes.
4. **Vilarejo:** encomendas e construções.
5. **Reforjar:** talentos (bloqueada com cadeado até a Muralha).

Ao abrir o app: modal "Enquanto você estava fora" com o resumo do offline → Forja.

## 7. Escopo

**MVP (5 fatias jogáveis)**
1. Mina + Carvoaria + Fornalha + venda, idle, progresso offline, save. `npm run sim` básico.
2. Bigorna, itens com qualidade, minigame da batida, ferreiros.
3. Heróis, equipamento, expedições, Golem de Escória, região 2 e Forno de aço.
4. Serpe de Cinza, construções, Reforjar e árvore de talentos.
5. Encomendas, polimento, PWA instalável e offline, README de portfólio.

**V2**
- Região 3 e um terceiro material.
- Encantamento com fragmentos.
- Ponte com o Forja (ver §9).
- Capacitor (Android), sincronização na nuvem.

**Fora de escopo**
- Monetização, anúncios, loot box com dinheiro real.
- Multiplayer, ranking online, servidor no MVP.
- Combate jogado em tempo real.

## 8. Métricas de sucesso

Sem servidor, as métricas são locais (tela de estatísticas escondida) e de playtest:
- Simulador cumpre todas as metas de §4.4.
- Playtest com 3–5 pessoas: entendem o loop sem tutorial longo em ≤ 2 min; voltam ≥ 3 vezes no primeiro dia.
- Sessão mediana de 1–4 min; ≥ 30 % das forjas com minigame (se for perto de 0, o minigame não está valendo a pena; se for perto de 100, está obrigatório demais).
- Lighthouse PWA ok, 60 fps no celular médio, primeira carga < 2 s.

## 9. Riscos e perguntas em aberto

| Item | Situação |
|---|---|
| Ponte com o Forja | **Decidido: V2.** Com código diário exibido no app Forja após um treino; o jogo valida pelo hash da data e dá "Fôlego" (+20 % de produção por 2 h, 1 vez por dia). Sem o app, a mesma recompensa vem de um desafio diário dentro do jogo, para não punir quem não treina. |
| Equilíbrio entre automático e minigame | **Decidido:** o minigame é um atalho. O automático chega a lendário com ferreiro alto; a batida só encurta o caminho. |
| Punição de falha | **Decidido:** sem punição (volta com 30 % do loot e do XP). Se o sim mostrar que ficou fácil demais, reavaliar com "cansaço". |
| Heróis no Reforjar | **Decidido:** ficam, voltam ao nível 1 e perdem o equipamento. |
| Como recrutar sem encomendas (fatia 3) | **Decidido:** o GDD ligava o 2º herói a 150 de reputação, mas a reputação vinha de encomendas (fatia 5) e o 1º herói era "por volta de 10 min". Solução: (1) o 1º herói é comprado com moedas (3 500, achado pelo sim); (2) toda expedição bem-sucedida dá 5 a 15 de reputação, então os 150 do 2º herói saem das expedições (o sim os alcança aos 32 min); (3) o Golem (+100 de reputação) abre o 3º; (4) o 4º continua esperando a Taverna. Alternativas descartadas: dar o 1º herói de graça (tira a primeira compra de peso) e pôr o 2º também por moedas (a reputação deixaria de fazer sentido) |
| Elmo com espaço próprio | **Decidido:** 4 espaços (arma, escudo, armadura, elmo) em vez de 3. No espaço único com a armadura, o elmo seria sempre pior e a receita ficaria sem uso. Custo: um painel a mais na Guilda |
| Equipe para expedição | **Decidido:** 1 herói por expedição (expedições simultâneas = heróis). Equipe só para o chefe |
| Coleta do loot | **Decidido:** manual, com "Coletar tudo". Se virar atrito para quem joga pouco, V2: coleta automática na abertura do app |
| Reputação das expedições vs. Muralha | Aberto. Um jogador presente acumula reputação de sobra (765 em 2 h no sim). Na fatia 4, trocar para retornos decrescentes ou limitar por dia antes de a Muralha usar a reputação como limiar |
| Escopo de 5 fatias em ~2 semanas | Apertado. Se atrasar, a fatia 4 corta a árvore para 6 nós e a fatia 5 corta encomendas para 4 NPCs. |
| Números até 1e15 | Monitorado pelo teste do sim. |
