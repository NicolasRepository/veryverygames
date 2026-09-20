import { Foe } from '../entities/Foe.js';
import { FOE_ARCHETYPES, FOE_PREFIXES, BOSS_PREFIX } from '../data/FoeArchetypes.js';
import { CONFIG } from '../core/Config.js';
import { pick } from '../core/utils.js';

/* ============================================================================
   FoeCodex.js — geração procedural dos Arautos que guardam o Crisol.

   Regras (todas ajustáveis em CONFIG):
   • Vida  = FOE_BASE_HP * (1 + FOE_HP_GROWTH)^(profundidade-1) * ruído
   • Dano  = FOE_BASE_DMG + FOE_DMG_GROWTH * (profundidade-1), com ruído
   • Colheita (chefe) = ganha BOSS_MULT de vida, +25% de dano e acesso
     garantido ao Golpe Cataclísmico.
   • Traços = sorteados a partir da profundidade 2 (Blindagem/Ascensão).
   • Nome   = prefixo + arquétipo; o arquétipo decide o rosto, então o
     visual sempre combina com o nome.
   ============================================================================ */
export const FoeCodex = {
  create(depth, { isBoss = false } = {}) {
    const arch = pick(FOE_ARCHETYPES);

    const hpNoise = 0.9 + Math.random() * 0.25;
    let maxHp = CONFIG.FOE_BASE_HP
      * Math.pow(1 + CONFIG.FOE_HP_GROWTH, depth - 1)
      * arch.bias.hp * hpNoise;

    let damage = CONFIG.FOE_BASE_DMG + CONFIG.FOE_DMG_GROWTH * (depth - 1);
    damage = damage * arch.bias.dmg + (Math.random() * 2 - 1);

    if (isBoss) { maxHp *= CONFIG.BOSS_MULT; damage *= 1.25; }

    const namePrefix = isBoss ? BOSS_PREFIX : `${pick(FOE_PREFIXES)} `;

    return new Foe({
      name: `${namePrefix}${arch.name}`,
      face: arch.face,
      title: arch.title,
      tier: depth,
      maxHp: Math.round(maxHp),
      damage: Math.max(3, Math.round(damage)),
      traits: {
        isBoss,
        canDefend: depth >= 2 && !!arch.bias.defend,
        canBuff: depth >= 2 && !!arch.bias.buff,
      },
    });
  },
};
