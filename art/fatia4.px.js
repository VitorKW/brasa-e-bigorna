// Brasa & Bigorna — arte da fatia 4 (Serpe de Cinza, construções do vilarejo, brasa e talentos).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia4.px.js
include("paleta.px.js")

// ---------- Serpe de Cinza (48×48) ----------
// Corpo de cinza fria enrolado, pescoço erguido, rachaduras de brasa por dentro.
sprite("chefe_serpe", { w: 46, h: 46, outline: "k" },
  // asa membranosa atrás do pescoço
  poly([22, 22, 6, 6, 9, 14, 3, 15, 10, 21, 5, 25, 16, 27], "C"),
  line(22, 22, 6, 6, "p"), line(19, 23, 3, 15, "p"), line(18, 25, 5, 25, "p"),
  // espiral do corpo: dois anéis empilhados, com o vão escuro dentro de cada um
  ellipse(24, 40, 20, 5, "d"), ellipse(24, 39, 20, 4, "s"), hline(8, 36, 32, "S"),
  ellipse(24, 39, 12, 2, "d"),
  ellipse(22, 34, 15, 4, "d"), ellipse(22, 33, 15, 3, "s"), hline(10, 31, 24, "S"),
  ellipse(22, 33, 7, 1, "d"),
  // cauda saindo da espiral
  line(42, 38, 45, 30, "s", 3), line(45, 30, 43, 25, "s", 2), px(43, 24, "d"),
  // pescoço em S
  line(19, 33, 20, 24, "s", 6), line(20, 24, 28, 14, "s", 6),
  // cabeça
  ellipse(33, 10, 7, 5, "s"), poly([36, 7, 45, 9, 45, 12, 37, 14], "s"),
  poly([37, 13, 44, 13, 42, 16, 36, 15], "d"),                  // mandíbula
  px(44, 12, "W"), px(41, 13, "W"),                              // presas
  // chifres de cinza
  line(30, 6, 26, 0, "S", 2), line(34, 5, 33, 0, "S"),
  // luz de cima, sombra embaixo
  light([24, 0, 22, 18]),
  // escamas do ventre ao longo do pescoço
  ...[[21, 30], [21, 27], [22, 24], [24, 21], [26, 18], [28, 16]].map(([x, y]) => hline(x, y, 3, "w")),
  // espinhos nas costas
  ...[[16, 28], [17, 24], [18, 21], [22, 17], [26, 12]].map(([x, y]) => px(x, y, "d")),
  // rachaduras de brasa
  line(7, 39, 12, 41, "r"), line(30, 41, 37, 39, "r"), px(33, 40, "o"), px(9, 40, "o"), line(28, 34, 33, 33, "r"), px(30, 34, "o"),
  // olho e baforada de cinza quente
  rect(35, 8, 2, 1, "y"), px(37, 8, "o"),
  px(45, 16, "r"), px(44, 18, "Q"), px(42, 19, "S"),
  glow("roy", { r: 3, strength: 0.5 }))

// ---------- Construções do vilarejo (32×32) ----------
// Segunda fornalha: forno-torre de tijolo com duas bocas e passarela de madeira.
sprite("construcao_segunda_fornalha", { w: 30, h: 30, outline: "k" },
  rect(5, 6, 20, 22, "E"),
  rect(4, 4, 22, 3, "F"), hline(4, 6, 22, "e"),
  rect(9, 0, 5, 4, "e"), rect(17, 1, 4, 3, "e"),                 // duas chaminés
  px(11, -1, "Q"),
  (c) => {
    for (let y = 9; y < 28; y += 3) {
      c.hline(5, y, 20, "e")
      const off = (y / 3) % 2 ? 0 : 2
      for (let x = 5 + off; x < 25; x += 4) c.px(x, y + 1, "e")
    }
  },
  light([0, 0, 10, 30]), shade([20, 0, 10, 30]),
  // duas bocas acesas
  ...[7, 16].flatMap((x) => [
    rect(x, 18, 7, 8, "d"), rect(x + 1, 19, 5, 7, "k"),
    hline(x + 1, 25, 5, "r"), px(x + 2, 24, "o"), px(x + 3, 24, "y"), px(x + 4, 24, "o"),
  ]),
  // passarela e base
  rect(0, 27, 30, 3, "p"), hline(0, 27, 30, "P"),
  rect(0, 14, 5, 1, "t"), vline(1, 15, 12, "B"), vline(3, 15, 12, "b"),
  glow("oy", { r: 2, strength: 0.4 }))

// Armazém: celeiro de tábuas com portão largo e caixotes.
sprite("construcao_armazem", { w: 30, h: 30, outline: "k" },
  poly([1, 12, 15, 2, 29, 12], "E"), hline(1, 12, 29, "e"),       // telhado
  (c) => { for (let y = 5; y < 12; y += 2) for (let x = 0; x < 30; x++) if (c.is(x, y, "E")) c.px(x, y, "e") },
  rect(3, 13, 24, 15, "B"),
  (c) => { for (let x = 5; x < 27; x += 3) c.vline(x, 13, 15, "b") },  // tábuas
  rect(10, 16, 10, 12, "b"), rect(11, 17, 8, 11, "t"),           // portão
  line(11, 17, 18, 27, "B"), line(18, 17, 11, 27, "B"), vline(15, 17, 11, "b"),
  rect(13, 7, 4, 3, "k"), px(14, 8, "t"),                        // janela do sótão
  light([0, 0, 12, 30]), shade([22, 0, 8, 30]),
  rect(0, 28, 30, 2, "p"),
  // caixotes do lado
  rect(22, 22, 7, 6, "t"), hline(22, 22, 7, "B"), line(22, 22, 28, 27, "B"),
  rect(24, 18, 5, 4, "t"), hline(24, 18, 5, "B"))

// Taverna: casa de pedra e madeira, janelas quentes e placa com caneca.
sprite("construcao_taverna", { w: 30, h: 30, outline: "k" },
  rect(3, 14, 24, 14, "P"),
  (c) => {
    for (let y = 17; y < 28; y += 3) {
      c.hline(3, y, 24, "p")
      const off = (y / 3) % 2 ? 0 : 3
      for (let x = 3 + off; x < 27; x += 6) c.vline(x, y + 1, 2, "p")
    }
  },
  rect(3, 8, 24, 6, "l"), hline(3, 8, 24, "L"),                   // andar de cima em linho/reboco
  vline(3, 8, 6, "b"), vline(26, 8, 6, "b"), vline(14, 8, 6, "b"), vline(15, 8, 6, "b"),
  line(3, 13, 14, 8, "b"), line(26, 13, 15, 8, "b"),
  poly([0, 8, 15, 0, 30, 8], "e"), hline(0, 8, 30, "E"),         // telhado
  rect(22, 1, 3, 5, "E"), px(23, 0, "Q"),
  // janelas acesas
  rect(6, 18, 4, 4, "y"), hline(6, 20, 4, "o"), vline(8, 18, 4, "b"),
  rect(20, 18, 4, 4, "y"), hline(20, 20, 4, "o"), vline(22, 18, 4, "b"),
  // porta
  rect(12, 19, 6, 9, "b"), rect(13, 20, 4, 8, "B"), px(16, 24, "g"),
  light([0, 0, 10, 30]), shade([21, 0, 9, 30]),
  // placa com caneca, pendurada
  hline(26, 12, 4, "b"), vline(28, 13, 1, "b"),
  rect(26, 14, 4, 5, "t"), rect(27, 15, 2, 3, "g"), px(29, 16, "h"), hline(27, 15, 2, "W"),
  rect(0, 28, 30, 2, "p"),
  glow("y", { r: 2, strength: 0.4 }))

// Mercado: banca com toldo listrado, caixas de lingote e saco.
sprite("construcao_mercado", { w: 30, h: 30, outline: "k" },
  // toldo listrado
  poly([1, 12, 4, 4, 26, 4, 29, 12], "H"),
  (c) => { for (let x = 0; x < 30; x += 4) for (let y = 4; y < 13; y++) for (let k = 0; k < 2; k++) if (c.is(x + k, y, "H")) c.px(x + k, y, "l") },
  ...[2, 7, 12, 17, 22, 27].map((x) => px(x, 13, "O")),          // franja
  hline(1, 12, 29, "O"),
  vline(3, 13, 15, "B"), vline(26, 13, 15, "B"),                  // estacas
  // balcão
  rect(2, 20, 26, 8, "t"), hline(2, 20, 26, "B"), hline(2, 27, 26, "b"),
  ...[8, 15, 22].map((x) => vline(x, 21, 6, "B")),
  // mercadorias: lingotes, saco de minério, espada
  rect(5, 18, 5, 2, "I"), hline(5, 18, 5, "j"), rect(6, 16, 4, 2, "Z"), hline(6, 16, 4, "J"),
  ellipse(16, 17, 3, 3, "L"), hline(14, 14, 5, "l"), px(15, 16, "M"), px(17, 17, "m"),
  line(21, 19, 25, 14, "I"), line(22, 19, 26, 14, "j"), hline(20, 18, 3, "h"),
  // moedas no balcão
  px(10, 22, "G"), px(11, 22, "g"), px(12, 23, "g"),
  shade([25, 13, 5, 15]),
  rect(0, 28, 30, 2, "p"))

// Muralha: trecho de muralha com ameias, portão e estandarte.
sprite("construcao_muralha", { w: 30, h: 30, outline: "k" },
  rect(0, 9, 30, 19, "P"),
  ...[0, 6, 12, 18, 24].map((x) => rect(x, 5, 4, 4, "P")),       // ameias
  (c) => {
    for (let y = 12; y < 28; y += 4) {
      c.hline(0, y, 30, "p")
      const off = (y / 4) % 2 ? 0 : 3
      for (let x = off; x < 30; x += 6) c.vline(x, y + 1, 3, "p")
    }
  },
  light([0, 0, 8, 30]), shade([24, 0, 6, 30]),
  // portão de madeira com reforço de ferro
  poly([9, 28, 9, 19, 12, 16, 18, 16, 21, 19, 21, 28], "b"),
  poly([10, 28, 10, 20, 12, 17, 18, 17, 20, 20, 20, 28], "B"),
  ...[13, 16].map((x) => vline(x, 17, 11, "b")),
  hline(10, 21, 11, "d"), hline(10, 25, 11, "d"),
  // estandarte do vilarejo
  vline(15, 0, 9, "b"), poly([16, 0, 23, 0, 23, 6, 19, 5, 16, 6], "H"), rect(18, 2, 3, 1, "g"), px(19, 3, "g"),
  rect(0, 28, 30, 2, "p"))

// ---------- Ícones (16×16) ----------
// Brasa Ancestral: pedra de brasa lapidada com runa.
sprite("icone_brasa", { w: 14, h: 14, outline: "k" },
  poly([7, 0, 13, 5, 11, 13, 3, 13, 1, 5], "r"),
  poly([7, 0, 13, 5, 7, 7, 1, 5], "o"),
  poly([7, 7, 13, 5, 11, 13], "e"),
  px(6, 2, "W"), px(7, 2, "y"), px(5, 3, "y"),
  vline(7, 8, 4, "y"), px(6, 9, "y"), px(8, 10, "y"),
  glow("oy", { r: 2, strength: 0.5 }))

// Fornalheiro: chama.
sprite("talento_fornalheiro", { w: 14, h: 14, outline: "k" },
  poly([7, 0, 12, 7, 12, 10, 9, 13, 5, 13, 2, 10, 2, 6, 4, 8, 5, 3], "r"),
  poly([7, 4, 10, 9, 9, 12, 5, 12, 4, 9], "o"),
  poly([7, 8, 8, 11, 6, 11], "y"), px(7, 11, "W"),
  glow("oy", { r: 2, strength: 0.4 }))

// Mestre de forja: martelo sobre bigorna.
sprite("talento_mestre", { w: 14, h: 14, outline: "k" },
  rect(1, 9, 12, 2, "s"), hline(1, 9, 12, "S"), rect(4, 11, 6, 3, "d"), poly([0, 9, 1, 9, 1, 11], "s"),
  line(3, 7, 10, 1, "B"),
  rect(8, 0, 4, 3, "I"), hline(8, 0, 4, "j"),
  px(4, 8, "y"), px(6, 8, "o"))

// Capitão da guilda: escudo com espada.
sprite("talento_capitao", { w: 14, h: 14, outline: "k" },
  poly([2, 2, 12, 2, 12, 8, 7, 13, 2, 8], "z"),
  poly([3, 3, 11, 3, 11, 8, 7, 12, 3, 8], "Z"),
  vline(7, 0, 11, "j"), hline(5, 3, 5, "g"), px(7, 0, "W"),
  shade([8, 3, 4, 10], 1, 0.6))

sheet("fatia4", ["chefe_serpe", "construcao_*", "icone_*", "talento_*"], { pad: 1 })
