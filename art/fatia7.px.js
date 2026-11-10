// Brasa & Bigorna — arte da fatia 7 (evolução visível).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia7.px.js
//
// Camadas TRANSPARENTES desenhadas nas mesmas coordenadas da arte-base (30×30 + contorno = 32×32 nas
// estações; 22×22 + contorno = 24×24 nos heróis). O jogo empilha a base e as camadas no DOM:
//   estações: base + e1 (nível 10) + e2 (25) + e3 (50) + e4 (100), cumulativas;
//   heróis:   base + armadura + elmo + escudo + arma, conforme o equipamento.
// Por serem camadas, valem também para a fornalha acesa, a bigorna batendo e o herói andando.

// As prévias carimbam a arte-base, então este arquivo inclui as fatias 1 a 3 (paleta junto).
include("fatia1.px.js")
include("fatia2.px.js")
include("fatia3.px.js")

const E = { w: 30, h: 30, outline: "k" }

// ---------- Mina ----------
// e1 "Mina escorada": lanterna pendurada e placa de madeira sobre a boca.
sprite("mina_e1", E,
  hline(3, 13, 5, "B"), vline(4, 14, 1, "s"),
  rect(3, 15, 3, 4, "h"), px(4, 16, "y"), px(4, 17, "o"), hline(3, 15, 3, "g"),
  rect(10, 8, 10, 4, "t"), hline(10, 8, 10, "A"), hline(12, 10, 6, "b"),
  glow("y", { r: 3, strength: 0.5 }))
// e2 "Mina com trilhos": monte de minério na saída e uma picareta encostada.
sprite("mina_e2", E,
  poly([22, 30, 24, 26, 27, 25, 30, 27, 30, 30], "m"),
  px(24, 27, "M"), px(26, 26, "M"), px(28, 27, "M"), px(25, 29, "M"), px(28, 29, "c"),
  line(1, 30, 4, 21, "B"),
  line(1, 21, 6, 22, "I"), px(1, 21, "j"), px(6, 22, "i"))
// e3 "Mina de pedra lavrada": pilares de pedra e verga de pedra no lugar da madeira.
sprite("mina_e3", E,
  rect(7, 13, 3, 17, "Q"), rect(20, 13, 3, 17, "Q"),
  ...[16, 20, 24, 28].flatMap((y) => [hline(7, y, 3, "p"), hline(20, y, 3, "p")]),
  rect(6, 11, 18, 3, "Q"), hline(6, 11, 18, "w"), vline(12, 11, 3, "p"), vline(18, 11, 3, "p"),
  px(14, 12, "S"), px(15, 12, "S"))
// e4 "Mina real": estandarte no alto da rocha e veios de ouro.
sprite("mina_e4", E,
  vline(15, 0, 7, "B"), px(15, 0, "G"),
  poly([16, 1, 22, 1, 22, 5, 19, 4, 16, 5], "H"), hline(16, 1, 6, "g"), px(19, 2, "G"),
  px(4, 21, "G"), px(3, 22, "g"), px(26, 18, "G"), px(27, 19, "g"), px(24, 8, "G"), px(6, 9, "g"),
  glow("G", { r: 2, strength: 0.4 }))

// ---------- Carvoaria (domo: elipse centro 13,30, raios 12 × 21) ----------
const noDomo = (x, y, folga = 0) => ((x - 13) / (12 - folga)) ** 2 + ((y - 30) / (21 - folga)) ** 2 <= 1
// e1 "Carvoaria de lenha farta": pilha de lenha mais alta.
sprite("carvoaria_e1", E,
  rect(22, 19, 8, 6, "b"),
  ...[[23, 23], [27, 23], [25, 20], [29, 20]].flatMap(([x, y]) => [circ(x, y, 1, "t"), px(x, y, "B")]))
// e2 "Carvoaria cintada": duas cintas de ferro abraçando o domo, com rebites.
sprite("carvoaria_e2", E,
  (c) => {
    for (const y of [15, 21]) for (let x = 0; x < 26; x++) if (noDomo(x, y) && !(y === 21 && x >= 9 && x <= 17 && false)) c.px(x, y, "s")
    for (const [x, y] of [[4, 21], [22, 21], [7, 15], [19, 15], [13, 15]]) c.px(x, y, "w")
  })
// e3 "Carvoaria dupla": chaminé de ferro mais alta e moldura de ferro na boca.
sprite("carvoaria_e3", E,
  rect(11, 3, 5, 6, "s"), hline(10, 3, 7, "S"), vline(15, 4, 5, "d"),
  poly([8, 30, 8, 25, 10, 22, 16, 22, 18, 25, 18, 30, 17, 30, 17, 25, 15, 23, 11, 23, 9, 25, 9, 30], "d"))
// e4 "Carvoaria do mestre": aro de latão na chaminé, brasas vivas na boca.
sprite("carvoaria_e4", E,
  hline(10, 3, 7, "g"), hline(10, 5, 7, "h"),
  rect(10, 26, 7, 3, "o"), px(12, 27, "y"), px(14, 26, "W"), px(15, 27, "y"),
  glow("yW", { r: 3, strength: 0.5 }))

// ---------- Fornalha ----------
// e1 "Fornalha com fole": fole de couro à esquerda soprando na boca.
sprite("fornalha_e1", E,
  poly([0, 17, 5, 15, 6, 24, 0, 25], "a"), hline(1, 19, 4, "A"), hline(1, 22, 4, "A"),
  rect(6, 20, 3, 2, "d"))
// e2 "Fornalha de ferro batido": cintas de ferro no corpo e cantoneiras rebitadas.
sprite("fornalha_e2", E,
  hline(2, 12, 26, "s"), hline(2, 13, 26, "d"),
  rect(23, 9, 5, 4, "s"), rect(2, 9, 5, 4, "s"),
  ...[[4, 12], [9, 12], [20, 12], [25, 12], [3, 10], [26, 10]].map(([x, y]) => px(x, y, "w")))
// e3 "Fornalha alta": capitel de latão na chaminé e tijolo novo.
sprite("fornalha_e3", E,
  rect(17, 0, 9, 2, "h"), hline(17, 0, 9, "G"),
  rect(18, 4, 7, 1, "F"), rect(18, 7, 7, 1, "F"))
// e4 "Alto-forno": brasão de brasa sobre a boca e moldura dourada.
sprite("fornalha_e4", E,
  poly([15, 10, 18, 13, 15, 16, 12, 13], "g"), px(15, 13, "o"), px(15, 12, "y"),
  line(8, 18, 10, 15, "G"), hline(10, 15, 11, "G"), line(20, 15, 22, 18, "G"),
  glow("oy", { r: 2, strength: 0.5 }))

// ---------- Bigorna ----------
// e1 "Bigorna com ferramentas": tenaz pendurada no chifre.
sprite("bigorna_e1", E,
  line(3, 14, 2, 22, "s"), line(5, 14, 6, 22, "s"), px(4, 14, "S"), px(2, 22, "d"), px(6, 22, "d"))
// e2 "Bigorna com tina": tina d'água para temperar.
sprite("bigorna_e2", E,
  rect(0, 24, 8, 6, "B"), hline(0, 24, 8, "t"), hline(0, 26, 8, "s"), hline(0, 29, 8, "s"),
  hline(1, 25, 6, "Z"), px(3, 25, "J"))
// e3 "Bigorna de pedra": bloco de pedra lavrada no lugar do toco.
sprite("bigorna_e3", E,
  rect(8, 21, 14, 9, "P"), hline(8, 21, 14, "Q"), hline(8, 25, 14, "p"),
  vline(13, 22, 3, "p"), vline(17, 26, 4, "p"), shade([17, 21, 5, 9]))
// e4 "Bigorna do mestre": filete de ouro na mesa e ponta do chifre dourada.
sprite("bigorna_e4", E,
  hline(9, 11, 13, "G"), px(2, 11, "G"), px(3, 11, "g"), px(14, 16, "g"), px(15, 16, "G"),
  glow("G", { r: 2, strength: 0.35 }))

// ---------- Equipamento visível nos heróis (22×22 + contorno) ----------
const MAT = { ferro: {}, aco: { i: "z", I: "Z", j: "J" } }
const H = { w: 22, h: 22, outline: "k" }

for (const [m, swap] of Object.entries(MAT)) {
  // Elmo: calota sobre o cabelo, abas laterais e nasal.
  sprite(`equip_elmo_${m}`, { ...H, swap },
    rect(5, 0, 12, 3, "I"), hline(6, 0, 10, "j"), rect(3, 2, 16, 2, "i"),
    rect(3, 4, 2, 3, "i"), rect(17, 4, 2, 3, "i"), vline(10, 3, 3, "I"), vline(11, 3, 3, "I"))
  // Armadura: peitoral sobre a túnica e ombreiras.
  sprite(`equip_armadura_${m}`, { ...H, swap },
    rect(4, 11, 14, 5, "I"), hline(4, 11, 14, "j"), vline(10, 12, 4, "i"), vline(11, 12, 4, "i"),
    rect(1, 11, 4, 3, "i"), rect(17, 11, 4, 3, "i"), hline(1, 11, 4, "I"), hline(17, 11, 4, "I"),
    px(6, 13, "j"), px(15, 13, "j"))
  // Escudo no braço esquerdo (lado esquerdo da tela).
  sprite(`equip_escudo_${m}`, { ...H, swap },
    rect(0, 11, 6, 8, "i"), rect(1, 12, 4, 6, "I"), hline(0, 11, 6, "j"), px(2, 14, "j"), px(3, 15, "j"),
    hline(1, 17, 4, "i"))
  // Espada erguida na mão direita.
  sprite(`equip_espada_${m}`, { ...H, swap },
    vline(20, 3, 12, "I"), vline(21, 3, 12, "j"), px(20, 2, "j"),
    hline(18, 15, 5, "h"), vline(20, 16, 2, "B"), px(20, 18, "g"))
  // Machado: cabo comprido e lâmina larga no alto.
  sprite(`equip_machado_${m}`, { ...H, swap },
    vline(20, 4, 15, "B"), vline(21, 5, 13, "b"),
    poly([15, 4, 20, 3, 20, 9, 15, 8], "I"), vline(15, 4, 5, "j"), px(16, 6, "i"))
}

// ---------- Prévias (não vão para o jogo) ----------
const EST = ["mina", "carvoaria", "fornalha", "bigorna"]
scene("previa_estagios", { w: 5 * 36, h: 4 * 36, bg: "d" },
  ...EST.flatMap((base, linha) =>
    [0, 1, 2, 3, 4].flatMap((n) => [
      stamp(base, 2 + n * 36, 2 + linha * 36),
      ...[1, 2, 3, 4].filter((k) => k <= n).map((k) => stamp(`${base}_e${k}`, 2 + n * 36, 2 + linha * 36)),
    ])))

const KITS = [
  [],
  ["equip_espada_ferro"],
  ["equip_armadura_ferro", "equip_espada_ferro"],
  ["equip_armadura_ferro", "equip_elmo_ferro", "equip_escudo_ferro", "equip_machado_ferro"],
  ["equip_armadura_aco", "equip_elmo_aco", "equip_escudo_aco", "equip_espada_aco"],
]
scene("previa_herois", { w: 5 * 28, h: 3 * 28, bg: "d" },
  ...["guerreiro", "guardia", "batedor"].flatMap((c, linha) =>
    KITS.flatMap((kit, n) => [stamp(`heroi_${c}`, 2 + n * 28, 2 + linha * 28), ...kit.map((k) => stamp(k, 2 + n * 28, 2 + linha * 28))])))
