import { Piece } from '../entities/Piece.js';
import { ShapeCatalog } from '../data/ShapeCatalog.js';
import { REWARD_ELEMENT_POOL } from '../data/ElementCatalog.js';
import { CONFIG } from '../core/Config.js';
import { pick, clamp } from '../core/utils.js';

/* ============================================================================
   ShopSystem.js — o Entreposto do Mercador Errante.
   Gera ofertas de compra e calcula custos de aprimorar/remover Relíquias
   do Baralho. Só manipula dados (Deck, moeda); quem cobra a moeda e
   aplica a compra é sempre o RunState, mantendo uma única fonte de verdade.
   ============================================================================ */
export const ShopSystem = {
  /** Gera 3 Relíquias à venda, com preço crescente conforme a profundidade. */
  generateOffers(depth) {
    const maxTier = clamp(1 + Math.floor(depth / 2), 1, 4);
    const pool = Object.keys(ShapeCatalog).filter(k => ShapeCatalog[k].tier <= maxTier);
    return Array.from({ length: 3 }, () => {
      const shapeKey = pick(pool);
      const elementKey = pick(REWARD_ELEMENT_POOL);
      const piece = new Piece(shapeKey, elementKey, 1);
      const tier = ShapeCatalog[shapeKey].tier;
      const price = CONFIG.ECONOMY.SHOP_BUY_BASE + CONFIG.ECONOMY.SHOP_BUY_PER_DEPTH * depth + tier * 8;
      return { piece, price };
    });
  },

  upgradeCost(depth) { return CONFIG.ECONOMY.SHOP_UPGRADE_BASE + depth * 3; },
  removeCost(depth) { return CONFIG.ECONOMY.SHOP_REMOVE_BASE + depth * 2; },
};
