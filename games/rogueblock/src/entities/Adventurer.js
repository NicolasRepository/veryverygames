import { clamp } from '../core/utils.js';

/* ============================================================================
   Adventurer.js — o Peregrino que atravessa o Crisol do Éter.
   Persiste durante toda a Jornada: vida e Baluarte não são recriados a cada
   Confronto (apenas o Baluarte zera no início de cada turno).
   ============================================================================ */
export class Adventurer {
  constructor(maxHp) {
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.ward = 0; // Baluarte Cinético — escudo temporário
  }

  restore(v) { this.hp = clamp(this.hp + v, 0, this.maxHp); }

  receiveDamage(raw) {
    const absorbed = Math.min(this.ward, raw);
    this.ward -= absorbed;
    this.hp = clamp(this.hp - (raw - absorbed), 0, this.maxHp);
    return { absorbed, taken: raw - absorbed };
  }

  get dead() { return this.hp <= 0; }
}
