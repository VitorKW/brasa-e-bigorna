// Brasa & Bigorna — arte da fatia 1 (estações e ícones).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia1.px.js
// Estações: 32×32 com contorno. Ícones: 16×16 com contorno.

include("paleta.px.js")

// ---------- Mina ----------
sprite("mina", { w: 30, h: 30, outline: "k" },
  poly([0, 30, 1, 17, 6, 9, 13, 5, 20, 6, 26, 11, 30, 19, 30, 30], "P"),
  light([0, 0, 15, 30]),
  shade([22, 0, 8, 30]),
  // fissuras da rocha, saindo da entrada
  line(6, 12, 4, 17, "p"), line(24, 12, 27, 16, "p"), line(14, 6, 16, 9, "p"),
  // veios de minério à mostra
  px(4, 22, "M"), px(5, 23, "m"), px(25, 21, "M"), px(26, 22, "m"), px(17, 8, "M"),
  // boca da mina
  poly([9, 30, 9, 16, 11, 13, 19, 13, 21, 16, 21, 30], "k"),
  // escoramento de madeira
  rect(8, 14, 2, 16, "B"), rect(20, 14, 2, 16, "B"), vline(9, 14, 16, "b"), vline(21, 14, 16, "b"),
  rect(7, 12, 16, 2, "t"), hline(7, 13, 16, "B"),
  // trilho e vagonete
  hline(10, 29, 10, "s"),
  rect(11, 23, 8, 4, "d"), hline(11, 23, 8, "s"),
  px(12, 22, "m"), px(13, 21, "M"), px(14, 22, "m"), px(15, 21, "m"), px(16, 22, "M"), px(13, 22, "m"), px(15, 22, "M"),
  px(12, 27, "s"), px(17, 27, "s"), px(12, 28, "k"), px(17, 28, "k"))

// ---------- Carvoaria (forno-colmeia de tijolo) ----------
sprite("carvoaria", { w: 30, h: 30, outline: "k" },
  clip([0, 0, 30, 30], ellipse(13, 30, 12, 21, "E")),
  // fiadas de tijolo com juntas desencontradas
  (c) => {
    for (let y = 11; y < 30; y += 3) {
      for (let x = 0; x < 26; x++) if (c.is(x, y, "E")) c.px(x, y, "e")
      const off = (y / 3) % 2 ? 0 : 2
      for (let x = off; x < 26; x += 4)
        for (let yy = y + 1; yy < y + 3; yy++) if (c.is(x, yy, "E")) c.px(x, yy, "e")
    }
  },
  light([0, 0, 10, 30]), shade([18, 0, 12, 30]),
  // chaminé no topo e fumaça
  rect(11, 8, 5, 3, "p"), hline(11, 8, 5, "P"),
  circ(15, 4, 1, "Q"), px(14, 4, "S"), circ(19, 1, 1, "S"),
  // boca com brasa
  poly([9, 30, 9, 25, 11, 23, 15, 23, 17, 25, 17, 30], "k"),
  hline(10, 29, 7, "r"), px(11, 28, "o"), px(13, 28, "y"), px(14, 28, "o"), px(15, 28, "r"),
  // pilha de lenha
  // pilha de lenha: toras vistas de topo (anel claro, miolo escuro, casca entre elas)
  rect(23, 24, 7, 6, "b"),
  ...[[24, 28], [28, 28], [26, 25]].flatMap(([x, y]) => [circ(x, y, 1, "t"), px(x, y, "B")]))

// ---------- Fornalha ----------
sprite("_fornalha_corpo", { w: 30, h: 30 },
  // chaminé de tijolo
  rect(18, 0, 7, 10, "E"), hline(17, 0, 9, "F"), hline(17, 1, 9, "e"),
  (c) => { for (let y = 3; y < 10; y += 3) c.hline(18, y, 7, "e") },
  // corpo de pedra
  rect(2, 9, 26, 19, "P"),
  rect(1, 8, 28, 2, "Q"),
  (c) => {
    for (let y = 13; y < 28; y += 4) {
      c.hline(2, y, 26, "p")
      const off = (y / 4) % 2 ? 4 : 0
      for (let x = 2 + off; x < 28; x += 8) c.vline(x, y + 1, 3, "p")
    }
  },
  light([0, 8, 9, 22]), shade([22, 9, 8, 21]),
  // boca com moldura de ferro
  poly([8, 27, 8, 18, 10, 15, 20, 15, 22, 18, 22, 27], "d"),
  poly([9, 27, 9, 19, 11, 16, 19, 16, 21, 19, 21, 27], "k"),
  hline(9, 25, 13, "s"), // grelha
  // base
  rect(0, 27, 30, 3, "p"), hline(0, 27, 30, "P"))

sprite("fornalha", { w: 30, h: 30, outline: "k" },
  stamp("_fornalha_corpo", 0, 0),
  px(12, 24, "r"), px(15, 24, "r"), px(17, 23, "r"), px(14, 24, "e"))

anim("fornalha_acesa", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" },
  stamp("_fornalha_corpo", 0, 0),
  (c) => {
    const f = c.frame
    const tops = [[19, 17, 18, 19], [18, 19, 17, 18], [17, 18, 19, 17], [19, 18, 18, 17]][f]
    // chamas: 4 línguas que sobem e descem
    const xs = [10, 13, 16, 19]
    xs.forEach((x, i) => {
      const top = tops[i]
      c.poly([x - 1, 25, x + 1, top, x + 3, 25], "r")
      c.poly([x, 25, x + 1, top + 2, x + 2, 25], "o")
    })
    c.hline(10, 24, 11, "y")
    c.px(12 + (f % 2) * 4, 23, "W")
    c.hline(9, 25, 13, "s")
    // faísca subindo pela chaminé
    c.px(21 + (f % 2), 0 - 0, f === 3 ? "y" : ".")
  },
  glow("roy", { r: 5, strength: 0.45, where: [9, 16, 13, 10] }))

// ---------- Ícones (14×14 + contorno = 16×16) ----------
sprite("icone_minerio", { w: 14, h: 14, outline: "k" },
  poly([1, 13, 0, 8, 3, 3, 8, 1, 12, 3, 14, 8, 13, 13], "P"),
  light([0, 0, 7, 7]), shade([8, 7, 6, 7]),
  px(4, 5, "M"), px(5, 6, "m"), px(9, 4, "M"), px(10, 5, "m"),
  px(7, 9, "M"), px(8, 9, "m"), px(3, 10, "m"), px(11, 10, "M"), px(10, 11, "m"))

sprite("icone_carvao", { w: 14, h: 14, outline: "k" },
  poly([0, 13, 1, 8, 5, 6, 8, 8, 8, 13], "C"),
  poly([5, 13, 6, 5, 10, 2, 14, 6, 14, 13], "c"),
  line(7, 4, 9, 3, "s"), px(2, 8, "s"), px(3, 8, "S"), px(11, 4, "S"),
  line(9, 7, 12, 10, "C"))

sprite("icone_lingote", { w: 14, h: 14, outline: "k" },
  poly([2, 6, 4, 3, 14, 3, 12, 6], "w"),   // topo
  rect(2, 6, 10, 5, "S"),                  // frente
  poly([12, 6, 14, 3, 14, 8, 12, 11], "s"), // lado
  hline(2, 10, 10, "s"), px(4, 7, "w"), hline(5, 4, 5, "W"))

sprite("icone_moeda", { w: 14, h: 14, outline: "k" },
  circ(7, 7, 7, "g"),
  ring(7, 7, 5, "h"),
  light([0, 0, 6, 6]), shade([8, 8, 6, 6]),
  // bigorna gravada
  rect(4, 5, 7, 2, "h"), px(3, 5, "h"), rect(6, 7, 3, 2, "h"), rect(5, 9, 5, 1, "h"))

sheet("fatia1", ["mina", "carvoaria", "fornalha", "fornalha_acesa", "icone_*"], { pad: 1 })
