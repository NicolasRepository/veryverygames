import { Piece } from '../entities/Piece.js';
import { ShapeCatalog } from '../data/ShapeCatalog.js';
import { REWARD_ELEMENT_POOL } from '../data/ElementCatalog.js';
import { pick, rnd, clamp } from '../core/utils.js';

/* ============================================================================
   RewardForge.js — forja uma Relíquia de recompensa após um Confronto.
   Quanto maior a profundidade, maior o tier máximo liberado no sorteio.
   ============================================================================ */
export const RewardForge = {
  forge(depth) {
    const maxTier = clamp(1 + Math.floor(depth / 2), 1, 4);
    const pool = Object.keys(ShapeCatalog).filter(k => ShapeCatalog[k].tier <= maxTier && ShapeCatalog[k].tier > 0);
    const shapeKey = pick(pool);
    const elementKey = pick(REWARD_ELEMENT_POOL);
    // 1 em 6 sai reforçada (potência dobrada) a partir da profundidade 3
    const power = (depth >= 3 && rnd(6) === 0) ? 2 : 1;
    return new Piece(shapeKey, elementKey, power);
  },

  forgeThree(depth) {
    return [this.forge(depth), this.forge(depth), this.forge(depth)];
  },
};
