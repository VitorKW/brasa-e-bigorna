// Brasa & Bigorna — arte da fatia 3 (heróis, Golem, forno de aço, ícones, regiões).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia3.px.js
include("paleta.px.js")

// ---------- Heróis (24×24) ----------
// Tronco comum (sem pernas): metade esquerda espelhada. Túnica em H/O, cinto em a.
sprite("_heroi_tronco", { mx: true, h: 19 }, `
  ......xxxxx
  ....xxxxxxx
  ...xxxxxxxx
  ...xxuuuuuu
  ..xxuuuuuuu
  ..xuuukuuuu
  ..xuuukuuuu
  ...uuuuuuuu
  ...uUuuuuuu
  ....UUUuuuu
  .....UUUUUU
  ...HHHHHHHH
  ..HHHOHHHHH
  .HHHHOHHHHH
  .HOHHOHHHHH
  .uOH.HHHHHH
  .uu..aaaaaa
  .....HHHHHH
  .....OOOOOO`)

// Pernas por quadro (y 19–21): parado, passo esquerdo, parado, passo direito.
const pernas = [
  [rect(6, 19, 4, 2, "d"), rect(12, 19, 4, 2, "d"), rect(5, 21, 5, 1, "b"), rect(12, 21, 5, 1, "b")],
  [rect(5, 19, 4, 2, "d"), rect(4, 21, 5, 1, "b"), rect(13, 19, 3, 1, "d"), rect(13, 20, 4, 1, "b")],
  [rect(6, 19, 4, 2, "d"), rect(12, 19, 4, 2, "d"), rect(5, 21, 5, 1, "b"), rect(12, 21, 5, 1, "b")],
  [rect(13, 19, 4, 2, "d"), rect(13, 21, 5, 1, "b"), rect(6, 19, 3, 1, "d"), rect(5, 20, 4, 1, "b")],
]

const classes = {
  // Guerreiro: túnica vermelha, espada erguida na mão direita.
  guerreiro: {
    swap: {},
    extra: [
      vline(20, 3, 12, "I"), vline(21, 3, 12, "j"), px(20, 2, "j"),
      hline(18, 15, 5, "h"), vline(20, 16, 2, "B"), px(20, 18, "g"),
    ],
  },
  // Guardiã: túnica azul de aço, elmo e escudo no braço esquerdo.
  guardia: {
    swap: { H: "Z", O: "z", x: "K", X: "K", u: "v", U: "V" },
    extra: [
      recolor({ K: "I" }, [0, 0, 22, 5]), hline(5, 0, 12, "j"), vline(10, 3, 3, "I"), vline(11, 3, 3, "I"),
      rect(0, 11, 6, 8, "z"), rect(1, 12, 4, 6, "Z"), px(2, 14, "J"), px(3, 14, "J"), px(2, 15, "J"),
    ],
  },
  // Batedor: capuz e túnica verdes, arco nas costas.
  batedor: {
    swap: { H: "q", O: "f", x: "f", X: "q", u: "n", U: "N" },
    extra: [
      line(19, 6, 21, 10, "B"), vline(21, 10, 4, "B"), line(21, 14, 19, 18, "B"),
      vline(19, 7, 11, "l"),
    ],
  },
}

for (const [nome, c] of Object.entries(classes)) {
  sprite(`heroi_${nome}`, { w: 22, h: 22, outline: "k" },
    stamp("_heroi_tronco", 0, 0, { swap: c.swap }), ...pernas[0], ...c.extra)
  anim(`heroi_${nome}_andando`, { w: 22, h: 22, outline: "k", fps: 8 },
    stamp("_heroi_tronco", 0, 0, { swap: c.swap }), ...c.extra,
    ...pernas.map((p) => frame(...p)))
}

// ---------- Golem de Escória (48×48) ----------
sprite("chefe_golem", { w: 46, h: 46, mx: true, outline: "k" },
  rect(13, 34, 7, 8, "P"),                                    // pernas
  ellipse(23, 25, 11, 11, "P"),                               // tronco (estreito, para os braços se destacarem)
  circ(9, 15, 5, "Q"),                                        // ombro
  rect(3, 18, 7, 14, "P"), circ(6, 35, 5, "P"),               // braço solto do tronco e punho
  rect(16, 2, 8, 12, "P"), hline(17, 1, 7, "Q"),              // cabeça maior
  hline(16, 7, 8, "p"),                                       // sobrancelha de pedra
  light([0, 0, 23, 20]), shade([0, 30, 46, 4], 1, 0.5), shade([0, 34, 46, 12]),
  rect(11, 41, 10, 5, "p"), hline(11, 41, 10, "P"),           // pés (depois da sombra, para não virarem contorno)
  // juntas entre as pedras
  line(3, 25, 9, 24, "p"), line(14, 18, 19, 15, "p"), line(13, 31, 20, 33, "p"),
  // rachaduras de escória incandescente saindo do núcleo
  circ(23, 25, 3, "r"), circ(23, 25, 2, "o"), px(23, 25, "y"), px(22, 24, "W"),
  line(20, 25, 15, 21, "r"), line(15, 21, 14, 27, "r"), line(21, 29, 18, 34, "r"),
  line(6, 28, 5, 33, "r"),
  rect(19, 9, 2, 1, "y"), px(21, 9, "o"),                     // olho (espelhado = dois olhos)
  glow("roy", { r: 4, strength: 0.5 }))

// ---------- Forno de aço (32×32) ----------
sprite("_forno_aco_corpo", { w: 30, h: 30 },
  rect(0, 26, 30, 4, "p"), hline(0, 26, 30, "P"),             // plataforma
  rect(8, 4, 13, 22, "s"),                                    // torre de chapas
  vline(8, 4, 22, "S"), vline(9, 4, 22, "S"), vline(19, 4, 22, "d"), vline(20, 4, 22, "d"),
  ...[8, 14, 20].flatMap((y) => [hline(8, y, 13, "d"), px(10, y - 1, "w"), px(14, y - 1, "w"), px(18, y - 1, "w")]),
  rect(7, 2, 15, 2, "S"), hline(7, 2, 15, "w"), rect(12, 0, 5, 2, "d"),
  rect(11, 21, 7, 4, "k"),                                    // boca
  rect(18, 22, 5, 2, "d"), hline(18, 22, 5, "S"),             // bica
  rect(21, 24, 7, 2, "i"), hline(21, 24, 7, "I"),             // cadinho
  // fole de couro à esquerda, ligado à torre
  poly([0, 16, 5, 14, 6, 22, 0, 23], "a"), hline(1, 18, 5, "A"), hline(1, 20, 5, "A"),
  hline(5, 19, 3, "d"))

sprite("forno_aco", { w: 30, h: 30, outline: "k" },
  stamp("_forno_aco_corpo", 0, 0), px(13, 24, "r"), px(15, 24, "r"))

anim("forno_aco_aceso", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" },
  stamp("_forno_aco_corpo", 0, 0),
  (c) => {
    const f = c.frame
    c.rect(12, 22, 5, 3, "r"); c.hline(12, 24, 5, "o")
    c.px(13 + (f % 3), 23, "y")
    c.rect(21, 24, 7, 1, f % 2 ? "o" : "y")                   // aço derretido no cadinho
    c.px(22, 23 + (f % 2), "o")                               // fio escorrendo da bica
    c.hline(1, 18 + (f % 2) * 2, 5, "a")                      // fole respirando
  },
  glow("oyr", { r: 4, strength: 0.4, where: [11, 21, 18, 6] }))

// ---------- Ícones (16×16) ----------
sprite("icone_lingote_aco", { w: 14, h: 14, outline: "k" },
  poly([2, 6, 4, 3, 14, 3, 12, 6], "J"),
  rect(2, 6, 10, 5, "Z"),
  poly([12, 6, 14, 3, 14, 8, 12, 11], "z"),
  hline(2, 10, 10, "z"), px(4, 7, "J"), hline(5, 4, 5, "W"))

sprite("icone_fragmento", { w: 14, h: 14, outline: "k" },
  poly([3, 1, 10, 0, 13, 6, 9, 14, 2, 12, 0, 5], "P"),
  light([0, 0, 7, 7]), shade([8, 7, 6, 7]),
  // runa gravada que brilha
  vline(6, 3, 8, "o"), line(6, 4, 9, 6, "o"), line(6, 8, 9, 10, "o"), px(6, 3, "y"),
  glow("o", { r: 2, strength: 0.4 }))

sprite("icone_reputacao", { w: 14, h: 14, outline: "k" },
  // estandarte do vilarejo com a bigorna bordada
  vline(1, 0, 14, "B"), px(1, 0, "g"),
  poly([2, 1, 13, 1, 13, 11, 7, 9, 2, 11], "H"),
  hline(2, 1, 11, "g"), shade([9, 1, 5, 11]),
  rect(5, 4, 6, 1, "g"), rect(7, 5, 2, 1, "g"), rect(6, 6, 4, 1, "g"))

// ---------- Regiões (banners de 96×32) ----------
scene("regiao_vale", { w: 96, h: 32, bg: "W" },
  grad(0, 0, 96, 16, "Wyo", "v", 0.5),                        // fim de tarde
  poly([0, 20, 18, 12, 36, 18, 56, 10, 78, 17, 96, 12, 96, 32, 0, 32], "q"),
  poly([0, 26, 24, 20, 50, 24, 70, 19, 96, 23, 96, 32, 0, 32], "f"),
  // vilarejo: casas com telhado de telha, e a forja com fumaça
  ...[[30, 19], [38, 20], [62, 18]].flatMap(([x, y]) => [rect(x, y, 6, 5, "l"), poly([x - 1, y, x + 3, y - 3, x + 7, y], "E"), px(x + 2, y + 2, "b")]),
  rect(46, 16, 8, 7, "P"), poly([45, 16, 50, 13, 55, 16], "e"), rect(51, 9, 2, 5, "E"),
  px(50, 7, "Q"), px(52, 5, "S"), px(51, 3, "Q"), px(49, 1, "S"),
  px(49, 20, "o"), px(48, 20, "r"),
  // estrada de terra
  poly([40, 32, 46, 24, 49, 24, 50, 32], "t"))

scene("regiao_serra", { w: 96, h: 32, bg: "P" },
  grad(0, 0, 96, 20, "PQ", "v", 0.5),                         // céu de cinza, mais claro no horizonte
  poly([0, 24, 10, 16, 22, 20, 34, 12, 46, 19, 60, 13, 74, 20, 86, 15, 96, 18, 96, 32, 0, 32], "p"),   // serra ao fundo
  poly([24, 32, 44, 3, 64, 32], "c"),                          // pico principal
  poly([24, 32, 44, 3, 46, 9, 36, 32], "C"),                   // face iluminada do pico
  poly([0, 32, 0, 27, 20, 24, 40, 29, 60, 25, 80, 28, 96, 24, 96, 32], "k"),  // primeiro plano
  // veio de brasa descendo do cume (onde vive a Serpe de Cinza) e brasas no ar
  px(44, 3, "o"), px(45, 4, "y"), line(44, 5, 41, 14, "r"), px(42, 10, "o"),
  px(30, 6, "o"), px(58, 8, "r"), px(70, 4, "o"), px(15, 10, "r"), px(84, 9, "r"),
  glow("oyr", { r: 3, strength: 0.5 }))

sheet("fatia3", ["heroi_*", "chefe_golem", "forno_aco*", "icone_*"], { pad: 1 })
