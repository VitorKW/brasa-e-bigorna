// Brasa & Bigorna — arte da fatia 5 (NPCs das encomendas, conquista, ícone do app).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia5.px.js
// Ícones do PWA: ver scripts no fim do arquivo (build com --scale).
include("paleta.px.js")

// Mesmo corpo dos ferreiros (fatia 2): l/L = camisa, a/A = roupa de cima, d/b = calça e botas.
sprite("_npc", { mx: true }, `
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

const npc = (nome, swap, ...extra) =>
  sprite(`npc_${nome}`, { w: 22, h: 22, outline: "k" }, stamp("_npc", 0, 0, { swap }), ...extra)

// Quitéria, taverneira: vestido vermelho, avental de linho, coque e caneca.
npc("quiteria", { a: "l", A: "L", l: "H", L: "O" },
  rect(8, 0, 6, 2, "x"), rect(9, -1, 4, 1, "X"), px(10, 0, "X"),
  rect(0, 15, 3, 4, "t"), hline(0, 15, 3, "W"), px(3, 16, "t"), px(3, 17, "t"))

// Sargento Amaro: elmo de ferro, túnica azul, bigode, lança.
npc("amaro", { a: "Z", A: "z", l: "z", L: "Z", x: "K", X: "K", u: "v", U: "V" },
  rect(3, 0, 16, 3, "I"), hline(3, 0, 16, "j"), hline(2, 3, 18, "i"), vline(10, 3, 2, "I"), vline(11, 3, 2, "I"),
  hline(8, 9, 6, "K"), px(7, 10, "K"), px(14, 10, "K"),
  vline(20, -1, 21, "B"), poly([19, -1, 20, -4, 21, -1], "j"))

// Tonico, lavrador: chapéu de palha largo, camisa de linho, suspensório, enxada.
npc("tonico", { a: "l", A: "L", u: "v", U: "V" },
  hline(0, 2, 22, "g"), rect(4, -1, 14, 3, "G"), hline(4, 1, 14, "h"),
  vline(7, 11, 7, "b"), vline(14, 11, 7, "b"),
  vline(1, 8, 12, "B"), rect(0, 7, 4, 2, "s"), hline(0, 7, 4, "S"))

// Jurema, mascate: lenço verde, pele escura, roupa marrom, saco nas costas.
npc("jurema", { a: "B", A: "b", l: "t", L: "B", x: "f", X: "q", u: "n", U: "N" },
  hline(5, 0, 12, "q"), px(17, 3, "q"), px(18, 4, "f"),
  ellipse(18, 13, 3, 4, "L"), hline(16, 10, 4, "l"), line(15, 11, 8, 17, "b"))

// Inês, caçadora: capuz verde, cabelo ruivo, colete de couro, arco.
npc("ines", { a: "a", A: "A", l: "f", L: "q", x: "r", X: "o" },
  rect(3, 0, 16, 3, "f"), hline(4, 0, 14, "q"), vline(3, 3, 6, "f"), vline(18, 3, 6, "f"),
  line(19, 5, 21, 9, "B"), vline(21, 9, 5, "B"), line(21, 14, 19, 18, "B"), vline(19, 6, 12, "l"))

// Dito, menestrel: chapéu com pena, gibão vermelho e amarelo, alaúde.
npc("dito", { a: "H", A: "O", l: "g", L: "h", x: "x", X: "X" },
  rect(4, 0, 14, 2, "O"), hline(3, 2, 16, "H"), line(15, 0, 19, -3, "W"), px(18, -2, "y"),
  ellipse(4, 16, 3, 3, "t"), px(4, 16, "b"), line(5, 14, 9, 10, "B"), hline(3, 17, 3, "B"))

// Seu Almir, prefeito: grisalho, bigode branco, casaca escura e corrente de ouro.
npc("almir", { a: "C", A: "c", l: "w", L: "S", x: "T", X: "R" },
  hline(8, 9, 6, "R"), px(7, 10, "R"), px(14, 10, "R"),
  line(6, 11, 10, 15, "g"), line(15, 11, 11, 15, "g"), px(10, 16, "G"), px(11, 16, "G"))

// Dona Zuleica, curandeira: cabelo branco longo, manto verde, frasco de remédio.
npc("zuleica", { a: "f", A: "q", l: "q", L: "f", x: "R", X: "T", u: "v", U: "V" },
  rect(3, 4, 2, 9, "R"), rect(17, 4, 2, 9, "R"),
  rect(0, 14, 3, 4, "J"), hline(0, 14, 3, "W"), rect(1, 13, 1, 1, "b"),
  glow("J", { r: 1, strength: 0.3 }))

// ---------- Conquista (16×16): medalha com fita ----------
sprite("icone_conquista", { w: 14, h: 14, outline: "k" },
  poly([3, 0, 6, 0, 7, 5, 5, 6], "H"), poly([8, 0, 11, 0, 9, 6, 7, 5], "O"),
  circ(7, 9, 4, "g"), circ(7, 9, 3, "G"), circ(7, 9, 2, "g"),
  px(7, 8, "W"), px(6, 9, "G"), shade([8, 9, 4, 4], 1, 1))

// ---------- Ícone do app ----------
// Bigorna com brasa sobre fundo carvão. Fundo opaco (ícones de PWA não ficam bem transparentes).
const iconeApp = (ox, oy) => [
  // bigorna: face larga com chifre à esquerda, cintura estreita, base larga
  poly([ox + 1, oy + 14, ox + 8, oy + 13, ox + 8, oy + 18, ox + 5, oy + 16], "s"),
  rect(ox + 8, oy + 13, 21, 5, "s"), hline(ox + 1, oy + 13, 28, "w"), hline(ox + 6, oy + 14, 23, "S"),
  hline(ox + 8, oy + 17, 21, "d"),
  rect(ox + 13, oy + 18, 10, 4, "d"), vline(ox + 13, oy + 18, 4, "s"),
  rect(ox + 9, oy + 22, 18, 4, "s"), hline(ox + 9, oy + 22, 18, "S"), hline(ox + 9, oy + 25, 18, "d"),
  // peça em brasa sobre a bigorna
  rect(ox + 12, oy + 10, 10, 3, "o"), hline(ox + 12, oy + 10, 10, "y"), hline(ox + 15, oy + 10, 3, "W"), hline(ox + 12, oy + 12, 10, "r"),
  // faíscas subindo
  px(ox + 10, oy + 6, "y"), px(ox + 23, oy + 5, "o"), px(ox + 19, oy + 2, "y"), px(ox + 14, oy + 3, "o"),
  px(ox + 26, oy + 8, "y"), px(ox + 8, oy + 3, "o"), px(ox + 17, oy + 6, "W"),
  glow("oyrW", { r: 5, strength: 0.6, where: [ox + 11, oy + 9, 12, 5] }),
]

scene("app_icone", { w: 32, h: 32, bg: "k" }, ...iconeApp(0, 2))
// Maskable: o conteúdo fica nos 80 % centrais.
scene("app_icone_maskable", { w: 40, h: 40, bg: "k" }, ...iconeApp(4, 6))
scene("app_icone_apple", { w: 36, h: 36, bg: "k" }, ...iconeApp(2, 4))

sheet("fatia5", ["npc_*", "icone_conquista"], { pad: 1 })
