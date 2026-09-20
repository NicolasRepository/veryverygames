import { CONFIG } from '../core/Config.js';
import { uid, weightedPick } from '../core/utils.js';

/* ============================================================================
   MapGenerator.js — gera as ondas de rotas do mapa. Remove a progressão
   linear: a cada onda, o Peregrino recebe sempre 3 opções de caminho
   (exceto em ondas de Colheita, forçadas e únicas).

   Tipos de nó:
   • combat  — Confronto padrão contra um Arauto.
   • shop    — Entreposto do Mercador Errante.
   • event   — Vestígio narrativo de risco/recompensa.
   • mystery — Véu Nebuloso: revelado apenas ao entrar (combat/shop/event).
   • boss    — Colheita: nó único e forçado a cada CONFIG.BOSS_EVERY.
   ============================================================================ */
const NODE_META = {
  combat: { icon: '👹', label: 'Confronto' },
  shop: { icon: '💰', label: 'Entreposto do Mercador' },
  event: { icon: '📜', label: 'Vestígio do Caminho' },
  mystery: { icon: '❓', label: 'Véu Nebuloso' },
  boss: { icon: '👑', label: 'Colheita' },
};

export const MapGenerator = {
  nodeMeta(type) { return NODE_META[type]; },

  /** Gera a lista de nós disponíveis para a profundidade informada. */
  generateWave(depth) {
    if (depth > 0 && depth % CONFIG.BOSS_EVERY === 0) {
      return [this._makeNode('boss', depth)];
    }
    const count = CONFIG.MAP.CHOICES_PER_WAVE;
    return Array.from({ length: count }, () => {
      const type = weightedPick(CONFIG.MAP.WEIGHTS);
      return this._makeNode(type, depth);
    });
  },

  /** Resolve o tipo real por trás de um Véu Nebuloso, ao ser escolhido. */
  revealMystery(depth) {
    const weights = { combat: CONFIG.MAP.WEIGHTS.combat, shop: CONFIG.MAP.WEIGHTS.shop, event: CONFIG.MAP.WEIGHTS.event };
    return weightedPick(weights);
  },

  _makeNode(type, depth) {
    const meta = NODE_META[type];
    return { id: uid('node'), type, depth, icon: meta.icon, label: meta.label };
  },
};
