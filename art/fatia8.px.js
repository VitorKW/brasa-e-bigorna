// Brasa & Bigorna — arte da fatia 8 (vilarejo vivo e ícones de som).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia8.px.js
//
// cena_vilarejo é o FUNDO (176×88): manhã no vale, estrada de terra, poço e três casebres que sempre
// existiram. As obras (sprites 32×32 da fatia 4) entram por cima no DOM, cada uma no seu lote
// (x = 6, 48, 96, 138; base em y = 63). cena_muralha é uma camada transparente do mesmo tamanho,
// posta entre o fundo e as obras quando a Muralha é construída.

include("fatia4.px.js")

const casebre = (x, y) => [
  rect(x, y, 10, 7, "l"), rect(x, y + 5, 10, 2, "L"),
  poly([x - 1, y, x + 5, y - 5, x + 11, y], "A"), line(x - 1, y, x + 5, y - 5, "a"),
  rect(x + 4, y + 3, 2, 4, "b"), px(x + 8, y + 2, "x"),
]
const arvore = (x, y) => [rect(x + 2, y + 6, 2, 5, "b"), circ(x + 3, y + 3, 4, "f"), circ(x + 2, y + 2, 2, "q")]
const poco = () => [
  rect(84, 58, 9, 6, "P"), hline(84, 58, 9, "Q"), hline(84, 61, 9, "p"),
  vline(84, 52, 6, "b"), vline(92, 52, 6, "b"), poly([82, 52, 88, 48, 95, 52], "E"), px(88, 55, "s"),
]
// O que fica do lado de dentro: é redesenhado por cima da muralha, que passa por trás.
const dentro = () => [...casebre(38, 55), ...casebre(128, 55), ...casebre(82, 49), ...arvore(120, 46), ...poco()]

scene("cena_vilarejo", { w: 176, h: 88, bg: "J" },
  // céu da manhã em faixas chapadas, sol baixo
  rect(0, 0, 176, 12, "Z"), rect(0, 34, 176, 12, "W"),
  circ(30, 16, 6, "G"), circ(30, 16, 4, "W"),
  // nuvens
  rect(96, 8, 16, 3, "W"), rect(100, 6, 8, 2, "W"), rect(140, 18, 12, 2, "W"), rect(143, 16, 6, 2, "W"),
  // serras e colinas
  poly([0, 44, 20, 34, 40, 42, 62, 30, 86, 41, 110, 33, 132, 42, 154, 35, 176, 40, 176, 60, 0, 60], "Q"),
  poly([0, 50, 26, 43, 54, 49, 82, 44, 112, 50, 140, 45, 176, 49, 176, 60, 0, 60], "q"),
  // gramado do vilarejo
  rect(0, 56, 176, 32, "q"), rect(0, 56, 176, 1, "f"),
  // estrada de terra batida com marcas de roda
  rect(0, 68, 176, 10, "t"), hline(0, 68, 176, "B"), hline(0, 77, 176, "B"),
  hline(8, 72, 26, "B"), hline(60, 74, 30, "B"), hline(118, 71, 34, "B"),
  // casebres antigos, árvores e cerca
  ...arvore(0, 47), ...arvore(168, 48), ...dentro(),
  ...[20, 26, 32].flatMap((x) => [vline(x, 81, 4, "b")]), hline(18, 82, 18, "B"),
  // flores e tufos de capim no gramado da frente
  ...[[10, 84, "y"], [48, 82, "H"], [70, 85, "y"], [104, 83, "W"], [132, 85, "H"], [160, 82, "y"], [150, 86, "W"]].map(([x, y, k]) => px(x, y, k)),
  ...[[4, 80], [58, 86], [96, 81], [124, 80], [170, 85]].flatMap(([x, y]) => [px(x, y, "f"), px(x + 1, y - 1, "f"), px(x + 2, y, "f")]))

// Muralha ao fundo, de torre a torre, com portão e estandartes.
sprite("cena_muralha", { w: 176, h: 88 },
  rect(0, 44, 176, 14, "P"), hline(0, 44, 176, "Q"),
  ...Array.from({ length: 22 }, (_, i) => rect(i * 8, 41, 5, 3, "P")),
  ...Array.from({ length: 22 }, (_, i) => hline(i * 8, 41, 5, "Q")),
  (c) => {
    for (let y = 48; y < 58; y += 4) {
      c.hline(0, y, 176, "p")
      const off = (y / 4) % 2 ? 0 : 4
      for (let x = off; x < 176; x += 8) c.vline(x, y + 1, 3, "p")
    }
  },
  // torres nas pontas
  ...[0, 162].flatMap((x) => [
    rect(x, 32, 14, 26, "P"), vline(x, 32, 26, "Q"), vline(x + 13, 32, 26, "p"),
    rect(x, 29, 4, 3, "P"), rect(x + 5, 29, 4, 3, "P"), rect(x + 10, 29, 4, 3, "P"),
    rect(x + 5, 40, 3, 5, "k"),
    vline(x + 7, 20, 9, "b"), poly([x + 8, 20, x + 14, 20, x + 14, 25, x + 11, 24, x + 8, 25], "H"), px(x + 10, 22, "g"),
  ]),
  // portão no centro
  poly([98, 58, 98, 49, 102, 45, 110, 45, 114, 49, 114, 58], "b"),
  poly([99, 58, 99, 50, 102, 46, 110, 46, 113, 50, 113, 58], "B"),
  vline(104, 46, 12, "b"), vline(108, 46, 12, "b"), hline(99, 52, 15, "d"),
  ...dentro())

// Lote vazio: estacas, corda e uma placa de "obra".
sprite("lote", { w: 30, h: 30, outline: "k" },
  rect(2, 24, 2, 6, "B"), rect(26, 24, 2, 6, "B"), rect(8, 20, 2, 5, "B"), rect(20, 20, 2, 5, "B"),
  line(3, 25, 8, 21, "l"), line(9, 21, 20, 21, "l"), line(21, 21, 26, 25, "l"),
  rect(14, 12, 2, 12, "b"), rect(9, 8, 12, 7, "t"), hline(9, 8, 12, "A"), hline(11, 11, 8, "b"), hline(12, 13, 6, "b"),
  // tábuas e pedras esperando a obra
  rect(4, 27, 9, 2, "t"), hline(4, 27, 9, "A"), rect(18, 26, 4, 3, "P"), px(18, 26, "Q"), rect(22, 27, 3, 2, "p"))

// Ícones de som (14×14 + contorno): alto-falante com ondas, e riscado.
sprite("icone_som", { w: 14, h: 14, outline: "k" },
  rect(1, 5, 3, 4, "w"), poly([4, 5, 8, 1, 8, 13, 4, 9], "w"), vline(8, 1, 12, "S"),
  vline(10, 5, 4, "y"), px(11, 3, "y"), vline(12, 4, 6, "y"), px(11, 10, "y"))
sprite("icone_mudo", { w: 14, h: 14, outline: "k" },
  rect(1, 5, 3, 4, "S"), poly([4, 5, 8, 1, 8, 13, 4, 9], "S"), vline(8, 1, 12, "s"),
  line(10, 4, 13, 9, "H"), line(13, 4, 10, 9, "H"))

// Prévia: a cidade completa (não vai para o jogo).
scene("previa_vilarejo", { w: 176, h: 88 },
  stamp("cena_vilarejo", 0, 0), stamp("cena_muralha", 0, 0),
  stamp("construcao_segunda_fornalha", 6, 31), stamp("construcao_armazem", 48, 31),
  stamp("construcao_taverna", 96, 31), stamp("lote", 138, 31))
