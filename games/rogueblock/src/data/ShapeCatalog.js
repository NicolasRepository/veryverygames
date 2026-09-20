/* ============================================================================
   ShapeCatalog.js — os poliominós que dão forma às Relíquias (peças).

   Coordenadas em [linha, coluna], origem no canto superior esquerdo.
   "tier" controla a raridade no forjamento de recompensas e na loja: quanto
   maior a profundidade do mapa, maior a chance de liberar um tier alto.
   Para criar uma forma nova, basta acrescentar uma entrada aqui.
   ============================================================================ */
export const ShapeCatalog = {
  dot:    { name: 'Fragmento', tier: 0, cells: [[0, 0]] },
  duo:    { name: 'Vínculo',   tier: 0, cells: [[0, 0], [0, 1]] },
  corner: { name: 'Ângulo',    tier: 1, cells: [[0, 0], [1, 0], [1, 1]] },
  tri:    { name: 'Tríade',    tier: 1, cells: [[0, 0], [0, 1], [0, 2]] },
  square: { name: 'Núcleo',    tier: 2, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  el:     { name: 'Foice',     tier: 2, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  jay:    { name: 'Gancho',    tier: 2, cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
  tee:    { name: 'Arco',      tier: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  ess:    { name: 'Onda',      tier: 2, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  line4:  { name: 'Coluna',    tier: 2, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  zee:    { name: 'Serpente',  tier: 2, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  plus:   { name: 'Cruzeta',   tier: 3, cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  line5:  { name: 'Pilar',     tier: 3, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  wall:   { name: 'Bastião',   tier: 3, cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
  big:    { name: 'Monólito',  tier: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
};
