// Brasa & Bigorna — arte da fatia 9 (campanha).
// Rebuild: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/fatia9.px.js
include("paleta.px.js")

// Crônica: livro de capa de couro com fecho de latão e fita marcando a página.
sprite("icone_cronica", { w: 14, h: 14, outline: "k" },
  rect(1, 1, 12, 12, "O"), vline(1, 1, 12, "H"), hline(1, 1, 12, "H"),   // capa
  rect(12, 2, 1, 10, "l"), hline(2, 12, 11, "l"),                        // miolo das páginas
  rect(1, 1, 2, 12, "a"),                                                // lombada
  rect(5, 4, 5, 4, "g"), px(7, 5, "G"), px(6, 6, "h"), px(8, 6, "h"),    // emblema da bigorna
  rect(9, 12, 2, 2, "y"))                                                // fita
