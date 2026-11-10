// Brasa & Bigorna — arte da fatia 6 (cena viva da forja).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia6.px.js
// A cena é só o FUNDO (176×88). Estações, carrinho, fumaça e faíscas são postos por cima no DOM,
// para reagirem ao toque e ao estado do jogo.

include("paleta.px.js")

scene("cena_forja", { w: 176, h: 88, bg: "k" },
  // céu de fim de tarde, escurecendo para cima
  rect(0, 0, 176, 14, "k"), rect(0, 14, 176, 14, "d"), rect(0, 28, 176, 8, "p"), rect(0, 36, 176, 6, "E"), rect(0, 42, 176, 18, "e"),
  // estrelas só no alto
  px(12, 4, "S"), px(40, 9, "w"), px(71, 3, "S"), px(103, 7, "w"), px(131, 2, "S"), px(158, 10, "S"), px(150, 4, "w"),
  // lua
  circ(148, 14, 4, "l"), circ(150, 13, 4, "d"),
  // serra distante e colinas
  poly([0, 50, 16, 42, 30, 47, 48, 38, 66, 46, 84, 40, 104, 47, 124, 39, 146, 45, 162, 41, 176, 44, 176, 60, 0, 60], "C"),
  poly([0, 52, 22, 46, 46, 50, 70, 45, 96, 51, 122, 46, 150, 50, 176, 46, 176, 60, 0, 60], "c"),
  // vilarejo ao longe: casinhas com janela acesa
  ...[[56, 44], [64, 45], [118, 43], [127, 45]].flatMap(([x, y]) => [
    rect(x, y, 6, 5, "C"), poly([x - 1, y, x + 3, y - 3, x + 7, y], "e"), px(x + 2, y + 2, "o"),
  ]),
  // chão de terra batida
  rect(0, 60, 176, 28, "b"),
  rect(0, 60, 176, 2, "B"),
  // caminho de pedra até a bigorna
  ...[[120, 72], [132, 76], [144, 73], [156, 77], [168, 74]].map(([x, y]) => rect(x, y, 7, 3, "P")),
  ...[[120, 72], [132, 76], [144, 73], [156, 77], [168, 74]].map(([x, y]) => hline(x, y, 7, "Q")),
  // trilhos do carrinho: da mina até a fornalha
  hline(14, 66, 100, "s"), hline(14, 69, 100, "s"),
  ...Array.from({ length: 13 }, (_, i) => rect(16 + i * 8, 65, 2, 6, "B")),
  hline(14, 66, 100, "S"),
  // marcas de roda e pegadas que levam à bigorna
  hline(4, 80, 30, "B"), hline(40, 83, 24, "B"),
  // lenha empilhada perto da carvoaria
  ...[[58, 75], [62, 75], [60, 72]].map(([x, y]) => [rect(x, y, 4, 3, "B"), px(x, y + 1, "t")]).flat())

sprite("carrinho", { w: 14, h: 10, outline: "k" },
  // vagonete de mina com minério por cima
  poly([0, 2, 14, 2, 12, 8, 2, 8], "s"),
  hline(0, 2, 14, "S"), shade([8, 3, 6, 5]),
  rect(2, 0, 10, 2, "m"), px(4, 0, "M"), px(8, 0, "M"), px(10, 1, "M"),
  rect(2, 8, 3, 2, "c"), rect(9, 8, 3, 2, "c"), px(3, 8, "S"), px(10, 8, "S"))

sheet("fatia6", ["carrinho"], { pad: 1 })
