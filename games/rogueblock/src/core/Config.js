/* ============================================================================
   Config.js — todos os números ajustáveis do balanceamento em um só lugar.
   Nenhum outro módulo deve declarar "números mágicos" de jogo: se algo
   precisa de ajuste fino, ele deve morar aqui.
   ============================================================================ */
export const CONFIG = Object.freeze({
  BOARD_SIZE: 8,
  HAND_SIZE: 5,
  MAX_HAND: 7,
  ADVENTURER_MAX_HP: 60,
  LINE_CLEAR_DRAW: 1, // peças compradas por linha limpa (x nº de linhas)

  // Geração procedural dos Arautos (inimigos) — ver FoeCodex.js
  FOE_BASE_HP: 32,
  FOE_HP_GROWTH: 0.38,
  FOE_BASE_DMG: 6,
  FOE_DMG_GROWTH: 1.6,
  BOSS_EVERY: 5,      // a cada N profundidades no mapa, a onda vira um Colheita (chefe)
  BOSS_MULT: 1.55,

  MAP: {
    CHOICES_PER_WAVE: 3,
    WEIGHTS: { combat: 45, shop: 20, event: 25, mystery: 10 },
  },

  ECONOMY: {
    WIN_BASE: 18,
    WIN_PER_DEPTH: 4,
    SHOP_BUY_BASE: 45,
    SHOP_BUY_PER_DEPTH: 6,
    SHOP_UPGRADE_BASE: 35,
    SHOP_REMOVE_BASE: 30,
  },

  CURRENCY_NAME: 'Fragmentos Astrais',
  CURRENCY_ICON: '💠',
});
