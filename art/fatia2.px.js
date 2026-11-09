// Brasa & Bigorna — arte da fatia 2 (bigorna, itens, ferreiros).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia2.px.js
include("paleta.px.js")

// ---------- Bigorna (32×32) ----------
sprite("_bigorna_corpo", { w: 30, h: 30 },
  // toco de madeira com anéis no topo
  rect(9, 21, 12, 9, "B"), hline(9, 21, 12, "t"), hline(10, 22, 10, "b"),
  vline(12, 23, 7, "b"), vline(17, 24, 6, "b"),
  // bigorna: chifre à esquerda, mesa, cintura, pé
  poly([2, 11, 8, 10, 8, 14, 5, 13], "I"),
  rect(8, 10, 16, 4, "I"), hline(8, 10, 16, "j"), hline(2, 11, 6, "j"),
  rect(23, 10, 2, 3, "i"),
  rect(11, 14, 8, 4, "i"),
  rect(9, 18, 12, 3, "I"), hline(9, 18, 12, "j"),
  shade([18, 10, 12, 12]))

sprite("bigorna", { w: 30, h: 30, outline: "k" },
  stamp("_bigorna_corpo", 0, 0),
  // martelo descansando no toco
  line(21, 28, 27, 20, "t"), rect(25, 17, 4, 3, "i"), hline(25, 17, 4, "I"))

// Martelo sobe, desce, bate (faíscas) e volta.
const golpes = [
  { hx: 22, hy: 2, px: 27, py: 19 },  // levantado
  { hx: 19, hy: 4, px: 26, py: 18 },  // descendo
  { hx: 13, hy: 6, px: 23, py: 17 },  // batida: cabeça encosta na peça quente (linha y 9), que a separa da bigorna
  { hx: 18, hy: 5, px: 25, py: 18 },  // ricochete
]
anim("bigorna_batendo", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" },
  stamp("_bigorna_corpo", 0, 0),
  (c) => {
    const g = golpes[c.frame]
    c.line(g.hx + 2, g.hy + 3, g.px, g.py, "t")   // cabo
    c.rect(g.hx, g.hy, 5, 3, "i")                 // cabeça
    c.hline(g.hx, g.hy, 5, "I")
    if (c.frame === 2) {
      // peça incandescente na mesa e faíscas saindo do ponto de impacto
      c.rect(12, 9, 6, 1, "o"); c.px(14, 9, "y")
      for (const [x, y, k] of [[10, 6, "y"], [8, 4, "o"], [20, 6, "y"], [22, 4, "W"], [12, 3, "W"], [18, 2, "o"]]) c.px(x, y, k)
    } else if (c.frame === 3) {
      c.rect(12, 9, 6, 1, "r")
      for (const [x, y, k] of [[7, 2, "o"], [23, 2, "y"], [11, 1, "r"]]) c.px(x, y, k)
    } else {
      c.rect(12, 9, 6, 1, "r"); c.px(15, 9, "o")
    }
  },
  glow("oyW", { r: 3, strength: 0.4 }))

// ---------- Itens (16×16). Ferro = i/I/j; aço = troca para z/Z/J. ----------
const ACO = { i: "z", I: "Z", j: "J" }

sprite("item_espada_ferro", { w: 14, h: 14, outline: "k" },
  line(5, 8, 12, 1, "I"), line(6, 8, 13, 1, "i"), line(5, 7, 11, 1, "j"), px(13, 0, "j"),
  line(2, 6, 7, 11, "h"), px(3, 7, "g"),        // guarda de latão
  line(1, 12, 4, 9, "B"), px(2, 11, "t"),       // cabo
  px(0, 13, "g"))                               // pomo

sprite("item_machado_ferro", { w: 14, h: 14, outline: "k" },
  line(2, 13, 9, 2, "B"), line(3, 13, 10, 2, "b"),          // cabo
  poly([7, 1, 11, 0, 14, 3, 13, 8, 10, 6], "I"),            // lâmina em meia-lua
  line(11, 0, 14, 3, "j"), line(14, 3, 13, 8, "j"),         // fio
  px(9, 3, "i"), px(10, 4, "i"))

sprite("item_escudo_ferro", { w: 14, h: 14, outline: "k" },
  poly([0, 0, 14, 0, 14, 7, 7, 14, 0, 7], "I"),
  poly([1, 1, 13, 1, 13, 7, 7, 13, 1, 7], "B"),
  vline(4, 1, 9, "b"), vline(9, 1, 9, "b"),                 // tábuas
  hline(1, 1, 12, "j"),
  rect(6, 4, 2, 2, "j"), px(7, 5, "I"),                     // umbo
  shade([8, 0, 6, 14]))

sprite("item_elmo_ferro", { w: 14, h: 14, outline: "k" },
  circ(7, 6, 6, "I"), rect(1, 6, 13, 7, "I"),
  hline(2, 7, 11, "k"), vline(7, 7, 5, "i"),                // viseira e protetor nasal
  hline(1, 12, 13, "i"),
  light([0, 0, 6, 7]), shade([9, 0, 5, 14]))

sprite("item_armadura_ferro", { w: 14, h: 14, outline: "k" },
  poly([0, 1, 4, 0, 5, 2, 9, 2, 10, 0, 14, 1, 14, 6, 12, 6, 12, 14, 2, 14, 2, 6, 0, 6], "I"),
  vline(7, 3, 11, "i"),
  hline(2, 10, 10, "B"), px(7, 10, "g"),                     // cinto
  light([0, 0, 6, 9]), shade([9, 0, 5, 14]))

for (const t of ["espada", "machado", "escudo", "elmo", "armadura"])
  sprite(`item_${t}_aco`, { base: `item_${t}_ferro`, swap: ACO })

// ---------- Ferreiros (24×24) ----------
// Corpo comum: escreve a metade esquerda e espelha.
sprite("_ferreiro", { mx: true }, `
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
  ...lllaaaaa
  ..lllLaAAaa
  .llllLaAAAa
  .lLlLaaAAAa
  .uLl.aaAAAa
  .uu..aaAAAa
  .....aaAAAa
  .....dddddd
  .....dddd..
  .....bbbb..
  ....bbbbb..`)

// Ferramenta pendurada na mão esquerda (x 1–2, y 15–16) ou direita (x 19–20).
const martelo = [vline(1, 16, 4, "t"), rect(0, 19, 3, 2, "i"), hline(0, 19, 3, "I")]
const marteloDir = [vline(20, 16, 4, "t"), rect(19, 19, 3, 2, "i"), hline(19, 19, 3, "I")]

// Tito, aprendiz: jovem, cabelo castanho curto, martelo na mão.
sprite("ferreiro_tito", { w: 22, h: 22, outline: "k" },
  stamp("_ferreiro", 0, 0), ...martelo)

// Dona Cida: grisalha, lenço vermelho na cabeça, pele média.
sprite("ferreiro_cida", { w: 22, h: 22, outline: "k" },
  stamp("_ferreiro", 0, 0, { swap: { x: "T", X: "R", u: "v", U: "V" } }),
  recolor({ T: "r" }, [0, 0, 22, 3]), hline(6, 0, 10, "o"), px(4, 2, "o"),
  px(16, 3, "r"), px(17, 4, "r"),                                   // nó do lenço
  ...martelo)

// Benê Carvoeiro: pele escura, cabelo e barba pretos, fuligem no avental.
sprite("ferreiro_bene", { w: 22, h: 22, outline: "k" },
  stamp("_ferreiro", 0, 0, { swap: { x: "K", X: "K", u: "n", U: "N" } }),
  rect(5, 8, 12, 2, "K"), rect(7, 10, 8, 1, "K"), hline(9, 8, 4, "N"),
  px(13, 14, "c"), px(15, 16, "c"), px(8, 15, "c"),
  vline(20, 13, 6, "t"), rect(19, 18, 3, 3, "s"), hline(19, 18, 3, "S"))   // pá de carvão

// Iara do Malho: pele média, trança longa caindo no ombro.
sprite("ferreiro_iara", { w: 22, h: 22, outline: "k" },
  stamp("_ferreiro", 0, 0, { swap: { x: "K", X: "K", u: "v", U: "V" } }),
  rect(17, 5, 2, 9, "K"), ...[6, 8, 10, 12].map((y) => px(17, y, "C")), hline(17, 14, 2, "r"),
  ...marteloDir)

// Mestre Odair: careca, barba branca longa, avental mais escuro.
sprite("ferreiro_odair", { w: 22, h: 22, outline: "k" },
  stamp("_ferreiro", 0, 0, { swap: { a: "b", A: "a" } }),
  rect(6, 0, 10, 3, "_"), rect(5, 1, 12, 2, "u"), hline(7, 0, 8, "u"),   // careca
  px(3, 3, "R"), px(18, 3, "R"),
  rect(5, 8, 12, 3, "R"), rect(7, 11, 8, 2, "R"), hline(9, 13, 4, "R"), hline(9, 8, 4, "U"),
  ...martelo)

sheet("fatia2", ["bigorna", "bigorna_batendo", "item_*", "ferreiro_*"], { pad: 1 })
