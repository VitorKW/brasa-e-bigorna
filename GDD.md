# Brasa & Bigorna

> GDD v0.5. As decisões fechadas em 09/11/2026 estão na §9, junto com as das fatias 3 (heróis, expedições, Golem e aço), 4 (reputação com retorno decrescente, construções, Serpe, Reforjar e talentos) e 5 (encomendas, conquistas, venda automática, PWA e a recalibração do fim de jogo). Itens marcados `[suposição]` são decisões que tomei sem confirmar; todos os números são o ponto de partida e serão ajustados pelo `npm run sim`, não no chute.

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
| Encomendas | 8 moradores fixos pedem itens do inventário (tipo, material, qualidade mínima, prazo); pagam `1,5 × valor` e 10 a 50 de reputação. Até 3 abertas; vencida some sem punição (fatia 5) | 3 |
| Reputação | Limiar que libera construções do vilarejo e vagas de herói; a última construção (Muralha, com a Serpe derrotada) libera o prestígio. Cada sucesso de expedição rende `15 × horas^0,5 / (1 + reputação/1 000)` (fatias 4 e 5) e cada encomenda entregue, 10 a 50 | 2 |
| Construções | Cinco obras do vilarejo: liberadas por reputação, **pagas com moedas** `[suposição]`, cada uma com um efeito permanente (ver §5) | 2 |
| Reforjar (prestígio) | Zera produção, moedas, itens e estações; mantém Brasas Ancestrais, talentos, heróis (nível volta a 1, equipamento some), reputação, construções e chefes derrotados (detalhes na §4.2) | 1 |
| Talentos | 12 nós em 3 ramos, comprados com Brasas Ancestrais; brasa guardada dá +2 % de produção | 1 |

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
| Reputação | Expedições bem-sucedidas (retorno decrescente, fatia 4), chefes (Golem 100, Serpe 150), encomendas entregues (10 a 50 cada, fatia 5) | Não se gasta: é um limiar que libera heróis e construções |
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
| XP do ferreiro | 1 XP por item forjado na bigorna; na fornalha, 1 XP por 10 lingotes; na carvoaria, 1 por 20 carvões; no forno de aço, 1 por 10 lingotes de aço; na mina, 1 por 40 minérios `[suposição]` (divisores para os níveis subirem num ritmo parecido, ~1 XP/10 s no começo). Próximo nível em `10 × 1,7^(n−1)`, máximo nível 20. Ajustado pelo sim: com 1,3 o ferreiro chegava ao 20 em ~1 h e o épico saía aos 33 min; **1,65 -> 1,7 na fatia 5** para devolver a margem de épicos de ferro (notas da fatia 5) |
| XP do herói (n → n+1) | `50 × 1,25^(n−1)` |
| Poder base do herói | `20 × 1,12^(n−1)`, distribuído entre atributos pela classe (tabela abaixo) |
| Teto offline | 2 h; +2 h no Armazém; +2 h no talento Sono tranquilo; +4 h nos Vigias da noite. Máximo 12 h no total (`tetoOfflineSegundos`, fatia 4). Vale para a produção; expedições voltam pelo relógio |
| Inventário de itens | 30 itens, configurável no estado (`limiteInventario`) `[suposição]`. Cheio, a bigorna para (também offline), a menos que a **venda automática** (opcional, fatia 5) esteja ligada: ela vende sozinha o que não melhora nenhum herói nem serve a uma encomenda aberta |
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
- Loot no sucesso: moedas `= 15 × D^0,8 × horas^0,5` (+20 % com Batedor), XP `= D / 2`, fragmento com `10 % × horas` (+20 % com Batedor, no máximo 100 %), **reputação (fatias 4 e 5) `= 15 × horas^0,5 / (1 + reputação / 1 000)`** `[suposição]`. Falha: 30 % das moedas e do XP, sem reputação nem fragmento.
- **Reputação: por que mudou na fatia 4.** A fórmula da fatia 3 (`5 + 10 × min(1, horas/4)`, 5 numa Trilha de 2 min) rendia **765 de reputação em 2 h** só repetindo a Trilha, o que tornaria a Muralha (1 000) trivial. A solução combina dois freios: (1) **a raiz da duração** (`horas^0,5`) tira a vantagem das expedições curtas: a Trilha de 2 min rende 2,7 por sucesso (não 5), o Passo dos Ventos 15, o Pico do Corvo 42; (2) **retorno decrescente pela reputação acumulada**: o divisor `1 + reputação/1 000` corta pela metade o ganho de quem já tem 1 000 e nunca zera. K e R = 1 000 foram calibrados pelo sim (§4.4): 2 h seguidas rendem ~350 (não 765), e o jogador de sessões curtas chega a 1 000 por volta da hora da Serpe. **Fatia 5: K caiu de 17 para 15**, porque as encomendas passaram a render reputação por fora (cerca de um terço do total no sim); sem o corte a reputação 1 000 voltava a vir cedo demais. Descartado: teto diário (exige um relógio de dia, que o jogo evita por causa do exploit de adiantar o relógio, §4.5). O valor é gravado na partida, com a reputação que o jogador tinha na hora.
- **Resultado gravado na partida**: o sucesso, o fragmento e o loot final são sorteados quando o herói parte (RNG com semente do estado) e guardados com o horário de volta. Fechar e reabrir o app não rerrola; offline, a volta é decidida só pelo relógio (o teto de 2 h vale para a produção, não para expedições: uma de 8 h volta no relógio).
- **Coleta manual**: o loot só entra quando o jogador toca em "Coletar" (ou "Coletar tudo"). O herói fica "em expedição" até lá. O resumo offline lista quem voltou e o loot que espera. Escolhi manual pelo game feel (números subindo) e porque o resultado já está decidido, então esperar não perde nada.

**Chefe (combate por rodadas)**

- Dano `= max(1, ATQ × 100 / (100 + DEF do alvo))`, arredondado ao inteiro mais próximo. Ordem por VEL (maior primeiro; empate: heróis antes do chefe). Até 30 rodadas; se o chefe não cair, a equipe recua sem perdas. Os heróis batem no chefe; o chefe bate no primeiro herói vivo da formação, que é ordenada por DEF (maior na frente). A função devolve o log de golpes para o replay e a UI mostra a previsão antes de lutar (a previsão é o próprio cálculo, então é exata).
- Chefe 1, **Golem de Escória**: ATQ 40, DEF 20, VEL 8, **PV 1 500**. *Ajustado pelo sim: com os 2 000 do rascunho, o único herói de que o jogador dispõe aos ~20 min (a 2ª vaga exige 150 de reputação) só vence com itens raros, que o sim forja a partir dos ~24 min, e o Golem caía por volta dos 27 min com 29 rodadas, no limite. Com 1 500 cai aos 24 min em 25 rodadas, com folga*. Libera região 2 e o Forno de aço.
- Chefe 2, **Serpe de Cinza**: ATQ 220 no rascunho e **6 000 na fatia 5**, DEF 120, **VEL 12**, **PV 33 000**. *Ajustado pelo sim: o rascunho de 25 000 PV caía às 3 h, porque o kit de aço épico de 3 heróis já faz ~28 000 de dano em 30 rodadas. Com 33 000, 3 heróis não bastam e 4 sim (28 rodadas): a Serpe só cai depois da **Taverna** e do 4º herói equipado, e é isso que a coloca em 18–30 h (o sim a derrota às **28 h 30 min**). O ATQ 220 mal arranhava heróis com DEF ~570: a Serpe era uma prova de dano, não de sobrevivência. **Fatia 5: ATQ 6 000** (~890 de dano por golpe em quem tem DEF ~570). No sim, aos 24 h, os 4 heróis vencem em 29 rodadas **perdendo 2 deles no caminho**, e com 3 heróis o grupo todo cai. PV e data não mudaram: o sim deu a mesma data para ATQ de 4 500 a 6 500* `[suposição]`. Fica na Serra Cinzenta (só depois do Golem), com previsão, "Tentar assim mesmo" e replay, e usa a mesma função de combate. Libera a Muralha e o Reforjar.
- Recompensa do Golem: 100 de reputação, 5 fragmentos, um machado lendário de ferro de presente. Recompensa da Serpe `[suposição]`: 150 de reputação, 10 fragmentos e uma **armadura lendária de aço** (o item que fecha o kit do herói da frente).

**Prestígio "Reforjar" (fatia 4)**

- Disponível com a **Muralha construída** (reputação 1 000 + Serpe derrotada + 18 M de moedas) e **pelo menos 1 brasa** para ganhar.
- `Brasas = floor( sqrt( moedasTotaisDoCiclo / 1 000 000 ) )`. A base é `moedasGanhas` (vendas e expedições coletadas; **inclui o bônus do Mercado**), que zera a cada Reforjar. Também conta o loot de expedições que já voltaram e ainda não foi coletado.
- Brasa não gasta: **+2 % de produção cada**, nas cinco estações (inclusive a velocidade da bigorna). Gastar em talento tira desse bônus: é a troca.
- **O que ZERA** `[suposição]`: mina, carvoaria e fornalha voltam ao nível 1; bigorna e Forno de aço a 0 (a Bigorna de herança segura o piso de 5); moedas (10 iniciais), minério, carvão, lingotes, itens (**inclusive os que os heróis vestem**, que somem), forja em andamento, fila e modo automático; nível e XP dos ferreiros.
- **O que FICA**: brasas e talentos; **heróis** (mesmo id, nome e classe; nível 1, sem XP e sem equipamento, por decisão do usuário) e as vagas do grupo; **ferreiros contratados** e o posto de cada um (só o nível volta a 1: re-contratar seria um clique inútil, e o custo de 100×4^k é desprezível perto de 50 milhões); **reputação, construções, chefes derrotados e regiões** (o vilarejo cresceu e não encolhe; o Forno de aço continua liberado, mas o jogador paga de novo os 2 500 pelo nível 1); fragmentos; o RNG e a numeração de itens.
- **Expedições**: o Reforjar fica **bloqueado enquanto algum herói ainda estiver na estrada**. As que já voltaram são coletadas na hora (reputação e fragmentos ficam; as moedas viram brasa, não caixa). Cancelar expedições em andamento perderia loot já sorteado e puniria quem manda o herói dormir; bloquear só pede para esperar.
- **Confirmação**: tela com a prévia (brasas, bônus antes e depois, o que se perde, o que fica) e dois passos: "Preparar o Reforjar" e depois **segurar o botão por 1,5 s** (ponteiro, ou Enter/Espaço).
- **Segundo ciclo ≤ 60 % do primeiro** (§4.4): o sim mede 46 % (52 h 30 min contra 24 h). O que acelera o segundo ciclo, em ordem de peso: as construções que ficam (Segunda fornalha, Armazém, Mercado, Taverna), os talentos do Fornalheiro e as brasas guardadas. **Achado do sim**: manter o nível dos ferreiros (testado) não encurtava o ciclo (a qualidade do item pesa pouco na renda), então eles voltam ao 1.

**Talentos (12 nós, fatia 4)** `[suposição]`: custo 1, 2, 3 e 5 brasas por tier (33 no total); o pré-requisito é o tier anterior do mesmo ramo.

| Ramo | Tier (custo) | Nó | Efeito (aplicado em funções puras, `bonus.ts`) |
|---|---|---|---|
| Fornalheiro (produção) | 1 (1) | Foles novos | Fornalha e Forno de aço +30 % de velocidade |
| | 2 (2) | Sono tranquilo | +2 h no teto offline |
| | 3 (3) | Veios generosos | Mina e Carvoaria +50 % |
| | 4 (5) | Fogo ancestral | Toda a produção +30 % |
| Mestre de forja (qualidade) | 1 (1) | Mão firme | +5 de Q em todo item |
| | 2 (2) | Bigorna de herança | A bigorna nunca fica abaixo do nível 5 (vale na compra e a cada Reforjar) |
| | 3 (3) | Escola de ofício | Ferreiros ganham +50 % de XP |
| | 4 (5) | Obra-prima | +10 de Q em todo item |
| Capitão da guilda (expedições) | 1 (1) | Bandeira da guilda | Expedições rendem +20 % de moedas e XP |
| | 2 (2) | Quinto herói | +1 vaga de herói (= +1 expedição ao mesmo tempo), sem custo |
| | 3 (3) | Rota segura | +10 pontos de chance de sucesso (limite de 95 % mantido) |
| | 4 (5) | Vigias da noite | +4 h no teto offline |

O sim mostra que o Fornalheiro vale mais: com os quatro nós a renda em 24–30 h sobe ~85 %, contra ~12 % do Mestre (a qualidade pesa pouco na renda). Foles (30 %), Veios (50 %) e Fogo (30 %) subiram do rascunho (20 %, 25 %, 25 %) para o segundo ciclo ficar abaixo de 60 %.

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

**Notas da fatia 4 (`[suposição]`)**

- **Construções**: custam moedas além da reputação, para a compra ter peso e para a reputação não ser a única barreira. Segunda fornalha 3 K (50 rep), Armazém 25 K (150), Taverna 11 M (400), Mercado 10 M (650), Muralha 12 M (1 000 + Serpe) na fatia 4; **na fatia 5, Taverna 32 M, Mercado 9 M e Muralha 18 M** (notas da fatia 5). Os preços foram achados pelo sim: o da Taverna decide a data da Serpe (sem Taverna não há 4º herói e o kit de 3 não derruba a Serpe), e a faixa de 10,5 a 11,5 M é a única em que o resultado não muda com o passo da sim (a 10 M ela vira 15 h ou 25,5 h conforme o passo; a 14 M a Taverna sai só no dia seguinte e a Serpe cai a 37 h). Efeitos: **Segunda fornalha +50 % de velocidade da fornalha** (a ×2 deixava lingotes de sobra, a bigorna forjava ferro em paralelo ao aço e os épicos de ferro passavam de 10 % nas 3 primeiras horas); **Armazém +2 h de teto offline**; **Taverna abre a 4ª vaga**; **Mercado +15 %** no preço de recursos e itens (não nas moedas de expedição); **Muralha** libera o Reforjar.
- A reputação **não se gasta**: as obras exigem o limiar e as moedas.
- **Vagas de herói**: 1º por 3 500 moedas, 2º com 150 de reputação, 3º com o Golem, 4º com a Taverna construída, 5º com o talento Quinto herói (sem custo).
- **Padrão de jogador do sim de dias**: as primeiras 2 h de **cada ciclo** (inclusive depois de Reforjar, porque recomeçar é a parte divertida) são jogadas sem parar; depois, 16 h acordado por dia com uma **sessão de 5 min a cada 90 min** (compra, vende, coleta, equipa, luta, manda os heróis), o resto offline com o teto real (simulado pela própria `applyOffline`), e 8 h de sono por dia. Os heróis vão na expedição de maior valor **por hora de ocupação**, contando que só voltam a ser mandados na próxima sessão (antes de dormir, vai uma longa). O sim Reforja com a Muralha e 7 brasas, e compra talentos pela lista fixa Foles, Sono, Veios, Fogo, Mão firme, Bigorna de herança, Escola, Obra-prima, Capitão (compra o próximo se as brasas bastam, senão guarda). `npm run sim` imprime a tabela; `sim.dias.test.ts` falha se as metas saírem da faixa.
- **Limite de inventário offline**: com 30 itens, a bigorna parava na primeira meia hora fora. **Resolvido na fatia 5** com a venda automática opcional (notas abaixo); o limite de 30 não mudou.

**Notas da fatia 5 (`[suposição]`)**

*Encomendas*

- **Moradores.** Quitéria (taverneira), Sargento Amaro, Tônico (lavrador), Jurema (mascate), Inês (caçadora), Dito (menestrel), Prefeito Almir e Dona Zuleica (curandeira). Cada um pede 2 a 5 tipos de item que combinam com o papel, com uma fala própria por tipo ("Escudo bom segura o portão e o moral da rapaziada"). A mascate pede de tudo; o sargento e a mascate compram em volume (um a mais); o prefeito é exigente (aceita pedir uma qualidade que o jogador só acerta 25 % das vezes, os outros pedem até a que ele acerta em 50 %).
- **Sorteio.** O pedido nasce do RNG do estado (`gerarEncomenda`) e fica gravado com o prazo e a recompensa: reabrir o app não rerrola. Morador livre, tipo do morador, material, qualidade e quantidade (1: 40 %, 2: 40 %, 3: 20 %) saem da mesma semente. Há no máximo **uma** encomenda nova por abertura do app, mesmo depois de horas fora: o tempo de espera (45 a 120 min, sorteado) é o ritmo do vilarejo.
- **Acompanha o progresso.** Aço só depois do Forno (60 % dos pedidos, quando ele existe). A qualidade mínima nunca passa do que a bigorna entrega com pelo menos 50 % de chance no automático (`faixaQ`): bigorna nova só pede "qualquer qualidade"; depois do Odair no nível alto aparecem raro e épico, e o lendário de ferro continua fora de alcance.
- **Prazo.** `2 h + quantidade + (0 a 2 h)`, em timestamp. Vencido, some; só um contador (`encomendasExpiradas`) lembra. Sem multa de moedas ou de reputação.
- **Pagamento.** `1,5 × quantidade × valor do item na qualidade mínima` (fixo no cartão; o Mercado não conta) e **10 a 50 de reputação** em escala logarítmica do peso `quantidade × mult. de qualidade × mult. de material` (1 espada comum de ferro: 10; 3 itens lendários de aço: 50). As moedas entram em `moedasGanhas`, então também alimentam as brasas.
- **Entrega.** Só com itens do inventário (os equipados não contam). Gasta os `quantidade` mais baratos que servem. Aço serve a pedido de ferro, o contrário não.
- **Reforjar.** Zera as encomendas abertas e a espera (os itens e a bigorna também zeram).
- **Reputação.** No sim de dias, as encomendas rendem ~850 dos ~2 400 de reputação até o 2º Reforjar (35 %). Para a reputação não voltar a inflar, o K das expedições caiu de 17 para 15 e a espera entre pedidos é de 45 a 120 min. O 2º herói segue em 42 a 46 min.

*Conquistas e estatísticas*

- **16 conquistas**, cada uma uma função pura do estado (`conquistas.ts`): Primeiro lingote, Cem peças, Primeira lendária, Mão de ourives (10 perfeitas seguidas), Alguém na guilda, Golem derrotado, Aço no fogo, Grupo completo, Cliente satisfeito (1ª entrega), Na hora H, Ferreiro de confiança (10 entregas), Nome conhecido (reputação 1 000), Serpe de Cinza derrotada, Vilarejo de pedra (5 obras), Primeiro Reforjar e A forja não esquece (2 Reforjars).
- **"Encomenda entregue com 1 min de sobra"** foi lida como *entregue em cima da hora* (com **no máximo** 1 min de prazo sobrando), porque "pelo menos 1 min" valeria para qualquer entrega. O nome é "Na hora H".
- **Contadores no estado** (`stats`, v5) e **fora do Reforjar**: lingotes fundidos, itens e lendários forjados, forjas totais e com batida, sequência atual e melhor sequência de perfeitas (a forja automática não quebra a sequência; "bom" e "errou" quebram), encomendas entregues e vencidas, entregas na hora H, sessões e tempo ativo. A conferência roda a cada tick e devolve o MESMO estado quando nada muda.
- **Aviso** discreto no pé da tela (4,5 s, vários viram "e mais N"), sem modal; com `prefers-reduced-motion` só aparece e some.
- **Onde fica.** Botão "Conquistas e ajustes" no topo da Guilda (sem aba nova). A folha lista as conquistas, tem o interruptor de som e, atrás de um botão, a **tela de estatísticas escondida** do §8: sessões, tempo ativo, duração média da sessão, **% de forjas com o minigame**, itens, encomendas.
- **Sessão** = abrir o app ou voltar depois de 5 min ou mais fora. O tempo ativo só soma com a aba visível.

*Venda automática (a saída para o inventário de 30 itens)*

- **Regra** (`venderInuteis`, a mesma lógica que o sim já usava): depois que a bigorna conclui um item, o jogo vende o que **não é útil**: guarda, em cada espaço, os N melhores (N = heróis, no mínimo 1) entre o inventário e o equipado, mais os itens que servem a uma encomenda aberta. Vende ao preço normal (com Mercado).
- **Por que essa e não "vender abaixo de uma raridade".** Depois do aço quase tudo é raro ou melhor: um corte por raridade deixaria o inventário encher do mesmo jeito. A regra por utilidade nunca vende o que o jogador usaria.
- **Opcional.** Desligada por padrão (o jogador novo vê a peça que forjou). A dica aparece quando o inventário passa de 70 %, e o resumo offline oferece ligar quando a bigorna parou. O resumo conta o que foi vendido sozinho.
- **O limite de 30 continua** e não foi aumentado.
- **Efeito no ritmo (achado do sim).** Offline, a bigorna deixou de parar em ~30 itens e a renda do 1º dia subiu de 14,8 M para 41,8 M (2,8 vezes), o que arrastou todo o fim de jogo (Serpe às 13 h 30, Reforjar às 28 h). Foi preciso recalibrar o fim de jogo; veja abaixo.

*Recalibração do fim de jogo (sim de dias)*

| O quê | Fatia 4 | Fatia 5 | Por quê |
|---|---|---|---|
| Taverna | 11 M | **32 M** | decide a data da Serpe; só 31 a 32 M dão Serpe entre 24 h e 28 h 36 min em todos os passos testados (0,25 a 4 s). Com 30 M o passo de 1 s antecipa a Taverna para o dia 1 (Serpe às 15 h); com 33 M o passo de 2 s empurra a Serpe para 33 h |
| Mercado | 10 M | **9 M** | o sim compra antes da Muralha só se sobra; ele paga +15 % em dezenas de horas |
| Muralha | 12 M | **18 M** | a renda do 1º dia subiu 2,8 vezes |
| Serpe | ATQ 220, PV 33 000 | **ATQ 6 000**, PV 33 000 | ela agora derruba heróis; o PV não mudou |
| XP do ferreiro | 1,65 | **1,7** | devolve a margem de épicos de ferro nas 3 primeiras horas (9,7 % -> 8,4 %) |
| K da reputação das expedições | 17 | **15** | as encomendas rendem reputação por fora |
| Brasas-alvo do sim | 7 | **12** | com a economia nova, 7 brasas levariam o 1º Reforjar a 33 h, abaixo dos 2 dias |

- **Muralha.** Antes saía 27 h depois da Serpe (55 h 30 contra 28 h 30). Agora sai **7 h 30 min depois** (31 h 30 contra 24 h 4 min): a Muralha passou à frente do Mercado na fila de compras do sim e custa menos relativamente à renda.
- **Épicos de ferro.** A margem de 9,7 % piorou para 12,9 % só porque a Taverna a 30 M deixou o sim investir mais na bigorna nas 3 primeiras horas (com 11 M ele poupava). A saída foi desacelerar o XP dos ferreiros (1,65 -> 1,7): 8,4 % e primeiro épico de ferro aos 2 h 12 min (era 2 h 03).
- **Sim.** Ele agora liga a venda automática, entrega as encomendas que consegue cumprir (guarda os itens que servem a pedidos abertos, forja a receita que falta a um pedido quando o material serve), segura os heróis em casa quando o kit já vence um chefe (senão uma expedição de 8 h atrasava a luta por horas) e compra a Muralha antes do Mercado.
- **Fragilidade que ficou.** A data da Taverna depende de a moeda chegar antes ou depois do fim das 16 h acordado de cada dia, então ela salta entre 24 h e ~30 h com pequenas mudanças; a Serpe vem junto (24 h 4 min no passo de 1 s, até 28 h 36 min em outros passos). Os testes usam o passo de 1 s.

*PWA*

- **Service worker escrito à mão** (`pwa/sw.modelo.js`, ~90 linhas) em vez de `vite-plugin-pwa` (2.0.0, que declara compatibilidade com o Vite 8): evita o workbox (centenas de pacotes) para um app de uma tela só, e deixa a estratégia à vista. Um plugin do Vite (`scripts/pwa-plugin.ts`) grava `dist/sw.js` com a lista de todos os arquivos do build e uma versão que é o hash do conteúdo.
- **Cache-primeiro** para o app e os sprites (abre offline na hora). Fontes do Google com revalidação em segundo plano (sem rede, cai para a fonte do sistema).
- **Atualização.** O service worker novo espera; o app mostra "Nova versão. Recarregar?" e só então troca. O save está no `localStorage`, que a atualização não toca, e o app grava antes de recarregar. A primeira instalação nunca recarrega a página.
- **Manifest** com nome, cores da paleta, `standalone`, retrato e os ícones 192, 512 e maskable em `public/icons/` (gerados fora do código).

*Primeira experiência e som*

- **Dicas curtas, dispensáveis e sem bloquear a tela**, gravadas no save: "Venda o minério e toque em Melhorar" (primeira tela), a bigorna (primeira peça), o herói (equipar e mandar ao Mapa), as encomendas e a venda automática.
- **Som opcional**, desligado por padrão: cinco tons curtos (moeda, batida, perfeito, entrega, conquista) gerados com Web Audio, sem arquivo de terceiros. Fica em Conquistas e ajustes.

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
| Segundo herói (150 de reputação) | 30 – 60 min (sim: 42 a 46 min conforme o passo) |
| Taverna (400 de reputação) | em algumas horas (sim: 1 h 52 min; construída às 24 h, pelo preço de 32 M) |
| Reputação 1 000 | perto da Serpe (sim: 24 h 4 min) |
| Muralha | até ~12 h depois da Serpe (era 27 h; sim: 31 h 30 min, **7 h 30 min depois**) |
| Chefe 2 | 18 – 30 h (com offline; sim de dias: **24 h 4 min**, em 29 rodadas, perdendo 2 heróis) |
| Primeiro Reforjar | 2 – 4 dias, rendendo 5 – 15 brasas (sim de dias: **52 h 30 min, 13 brasas**, com 170 milhões de moedas no ciclo) |
| Segundo ciclo | ≤ 60 % do tempo do primeiro (sim: **24 h contra 52 h 30 min, 46 %**) |
| Primeiro épico **de ferro** | ~2 h de jogo contínuo no automático (teste aceita 1 h 30 a 2 h 45). Sim: **2 h 12 min** (era 2 h 03). Depois do Golem o sim forja em aço (+10 de qualidade) e o épico de aço sai aos ~39 min |
| Épicos de ferro nas primeiras 3 h | < 10 % dos itens de ferro (sim: **8,4 %**; era 9,7 %) |
| Lendário de ferro no automático | nenhum nas primeiras 3 h (só com batida perfeita ou aço). O lendário de aço no automático sai por volta de 12 h (sim de dias: 12 h 25 min) |

### 4.5 Exploits e mitigação

| Risco | Mitigação |
|---|---|
| Adiantar o relógio do celular | Teto offline; se o relógio voltar no tempo, ignora o intervalo negativo e não pune |
| Fechar o app durante o minigame para tentar de novo | O resultado aleatório é sorteado e salvo antes do minigame começar. **Implementado:** o RNG (mulberry32) vive no estado; o aleatório da qualidade, o alvo da batida e o sorteio da Iara são gravados no início da tarefa; minigame aberto ao fechar o app vale o automático |
| Repetir expedições curtas infinitamente | XP e loot com `horas^0,5`: curtas rendem mais por hora, mas exigem presença; é o trade-off desejado. **Confirmado pelo sim:** a "melhor por hora com chance ≥ 70 %" é sempre a Trilha do Riacho (2 min). **Resolvido na fatia 4:** a reputação por sucesso passou a `K × horas^0,5 / (1 + reputação/1 000)` (K = 17; 15 na fatia 5); 2 h seguidas de Trilha rendem ~350 (eram 765) e a Muralha deixou de ser trivial (§4.2) |
| Reabrir o app para rerrolar uma expedição | O sucesso, o fragmento e o loot são sorteados e salvos na partida; a volta é só comparação de timestamps. Teste: o resultado coletado não muda com o relógio |
| Reabrir o app para rerrolar uma encomenda | O pedido é sorteado com o RNG do estado e gravado com o prazo (timestamp) e a espera até o próximo; reabrir o app não muda nada (teste). Adiantar o relógio só faz o pedido vencer, sem punição; atrasá-lo prolonga um pedido já aberto, o que não rende nada além do próprio pedido |
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

**Construções (reputação + moedas):** Segunda fornalha (50 de reputação, 3 K moedas, +50 % de velocidade da fornalha), Armazém (150, 25 K, +2 h offline), Taverna (400, 32 M, 4º herói), Mercado (650, 9 M, +15 % no preço de venda), Muralha (1 000 e a Serpe derrotada, 18 M, libera o Reforjar). Detalhes e justificativa nas notas da fatia 4 (§4.2).

**Encomendas (fatia 5):** 8 moradores fixos (Quitéria, Sargento Amaro, Tônico, Jurema, Inês, Dito, Prefeito Almir, Dona Zuleica) com pedidos sorteados, por exemplo "2 espadas de ferro, incomuns ou melhores, em 3 h". Pagam `1,5 × valor` + 10 a 50 de reputação. Até 3 abertas ao mesmo tempo. Regras completas nas notas da fatia 5 (§4.2).

**Talentos (árvore com 3 ramos, 12 nós):** Fornalheiro (produção), Mestre de forja (qualidade), Capitão da guilda (expedições). Tabela completa na §4.2: +2 h e +4 h de teto offline, bigorna sempre no nível 5 ou mais, +1 vaga de herói (a "+1 expedição").

**Conquistas (16, fatia 5):** Primeiro lingote, Cem peças, Primeira lendária, Mão de ourives (10 batidas perfeitas seguidas), Alguém na guilda, Golem derrotado, Aço no fogo, Grupo completo, Cliente satisfeito, Na hora H (encomenda entregue com 1 min ou menos de prazo sobrando), Ferreiro de confiança (10 entregas), Nome conhecido (1 000 de reputação), Serpe de Cinza derrotada, Vilarejo de pedra, Primeiro Reforjar e A forja não esquece (2 Reforjars).

## 6. Estética e UX

- **Visual:** mesma linguagem do Forja: escala de calor do metal como informação (cinza frio = parado, laranja = trabalhando, branco-amarelo = no máximo), painéis de aço, Barlow / Barlow Condensed, sem caixa alta, sem emoji como ícone, um único momento animado por tela.
- **Paleta base** `[suposição]`: carvão `#1b1618`, aço escuro `#2e2a30`, aço `#5b5662`, brasa `#e2582a`, laranja `#f29a3a`, amarelo-quente `#ffd47a`, texto `#f3e9dc` (contraste ≥ 4,5:1 sobre carvão e aço escuro, verificar no teste de acessibilidade).
- **Arte:** tudo em `art/*.px.js` com `pxl-pixel-art`. Personagens 24×24, estações 32×32, ícones 16×16, animações de 4–6 quadros (martelo, fornalha, herói andando).
- **Tom de texto:** pt-BR, caloroso e de vilarejo, frases curtas. Ex.: "A fornalha esfriou. Falta carvão."
- **Juice:** números subindo do objeto que produziu, faíscas no golpe da bigorna, vibração de 15 ms no "perfeito", som curto opcional (desligado por padrão; feito na fatia 5 com Web Audio gerado, sem arquivo de terceiros). Com `prefers-reduced-motion`: sem partículas nem tremor, números aparecem sem subir.
- **Alvos de toque** ≥ 44 px, ações principais na metade de baixo da tela.

**Telas (barra inferior com 5 abas)**
1. **Forja** (inicial): cena com as estações em cadeia, toque numa estação para melhorar.
2. **Guilda:** heróis, equipamento, recrutamento e, no topo, o botão "Conquistas e ajustes" (conquistas, som e a tela de estatísticas escondida).
3. **Mapa:** expedições e chefes.
4. **Vilarejo:** construções (reputação, efeito e preço) e, abaixo, as encomendas: até 3 cartões com o morador, a fala, o pedido, o prazo e o botão Entregar.
5. **Reforjar:** com a Muralha, a prévia (brasas, o que se perde, o que fica) e a confirmação por segurar o botão; sempre, a árvore de talentos. Sem a Muralha a aba mostra "trancada" e a lista do que falta.

Ao abrir o app: modal "Enquanto você estava fora" com o resumo do offline → Forja.

## 7. Escopo

**MVP (5 fatias jogáveis)**
1. Mina + Carvoaria + Fornalha + venda, idle, progresso offline, save. `npm run sim` básico.
2. Bigorna, itens com qualidade, minigame da batida, ferreiros.
3. Heróis, equipamento, expedições, Golem de Escória, região 2 e Forno de aço.
4. Serpe de Cinza, construções, Reforjar e árvore de talentos. **(feita)**
5. Encomendas, polimento, PWA instalável e offline, README de portfólio. **(feita)**

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

Sem servidor, as métricas são locais (tela de estatísticas escondida: Guilda > Conquistas e ajustes > Estatísticas, feita na fatia 5) e de playtest:
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
| Reputação das expedições vs. Muralha | **Decidido (fatia 4):** `15 × horas^0,5 / (1 + reputação/1 000)` por sucesso (K era 17 até a fatia 4): raiz da duração mais retorno decrescente. 2 h seguidas rendem ~350 (eram 765); com as encomendas por fora, o jogador de sessões curtas chega a 1 000 às 24 h, junto da Serpe. Teto diário descartado (exige relógio de dia, §4.5) |
| O que o Reforjar zera e mantém | **Decidido (fatia 4):** zera economia, itens e nível de ferreiros e heróis; mantém brasas, talentos, heróis, ferreiros contratados, reputação, construções, chefes e fragmentos; bloqueia com expedição na estrada (§4.2) |
| Preço da Taverna e data da Serpe | **Decidido (fatia 4, revisto na 5):** a Serpe só cai com 4 heróis equipados, então o preço da Taverna calibra a data. Fatia 5: 32 M, Serpe às 24 h 4 min; faixa estável de 31 a 32 M entre os passos do sim |
| Ferreiros no Reforjar | **Decidido:** continuam contratados e voltam ao nível 1. Testei manter o nível: o segundo ciclo não encurtou, porque a qualidade do item pesa pouco na renda |
| Escopo de 5 fatias em ~2 semanas | **Fechado.** As cinco fatias saíram, com os 8 moradores inteiros e as 16 conquistas |
| Inventário de 30 itens trava a bigorna offline | **Decidido (fatia 5):** venda automática opcional, por utilidade (guarda o kit dos heróis e o que as encomendas pedem). Efeito: a renda do 1º dia subiu 2,8 vezes e o fim de jogo foi recalibrado (Taverna, Mercado, Muralha, Serpe) |
| Margem de épicos de ferro | **Resolvido (fatia 5):** de 9,7 % para 8,4 %, com o XP dos ferreiros em 1,7 |
| Serpe sem ameaça | **Decidido (fatia 5):** ATQ 6 000; ela derruba heróis e a data não mudou |
| Espera vazia entre a Serpe e a Muralha | **Resolvido (fatia 5):** 7 h 30 min (era 27 h) |
| Relógio do celular (expedições e encomendas) | **Em aberto:** continua sem servidor para conferir; o dano é limitado (§4.5) |
| Lighthouse PWA, 60 fps e primeira carga < 2 s | **A conferir no navegador:** não há medição automática no repositório |
| Números até 1e15 | Monitorado pelo teste do sim. |
