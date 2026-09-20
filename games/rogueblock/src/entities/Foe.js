import { clamp } from '../core/utils.js';

/* ============================================================================
   Foe.js — um Arauto do Crisol: o adversário de um Confronto.
   ============================================================================ */
export class Foe {
  constructor(data) {
    Object.assign(this, data); // name, face, title, maxHp, damage, tier, traits
    this.hp = this.maxHp;
    this.guard = 0;      // escudo temporário do Arauto
    this.corrosion = 0;  // veneno acumulado
    this.might = 0;      // buff de dano acumulado
    this.intent = null;
  }

  receiveDamage(raw) {
    const absorbed = Math.min(this.guard, raw);
    this.guard -= absorbed;
    this.hp = clamp(this.hp - (raw - absorbed), 0, this.maxHp);
    return { absorbed, taken: raw - absorbed };
  }

  get dead() { return this.hp <= 0; }
  get attackValue() { return this.damage + this.might; }

  /**
   * Sorteia a intenção do próximo turno. Pesos: ataca na maior parte das
   * vezes, para o jogador conseguir planejar; abaixo de 40% de vida fica
   * mais agressivo. Arautos-chefe (Colheitas) têm acesso ao golpe pesado.
   */
  rollIntent() {
    const pool = [
      { type: 'attack', w: 5 },
      { type: 'buff', w: this.traits.canBuff ? 2 : 0 },
      { type: 'defend', w: this.traits.canDefend ? 2 : 0 },
      { type: 'heavy', w: this.traits.isBoss ? 2 : 1 },
    ].filter(o => o.w > 0);

    if (this.hp / this.maxHp < 0.4) pool.push({ type: 'attack', w: 3 });

    let roll = Math.random() * pool.reduce((s, o) => s + o.w, 0);
    let type = pool[0].type;
    for (const o of pool) { roll -= o.w; if (roll <= 0) { type = o.type; break; } }

    if (type === 'attack') this.intent = { type, value: this.attackValue, icon: '⚔️', label: 'Investida' };
    if (type === 'heavy') this.intent = { type, value: Math.round(this.attackValue * 1.8), icon: '💥', label: 'Golpe Cataclísmico' };
    if (type === 'buff') this.intent = { type, value: 2 + Math.floor(this.tier / 2), icon: '💪', label: 'Ascensão de Poder' };
    if (type === 'defend') this.intent = { type, value: Math.round(this.maxHp * 0.12), icon: '🛡️', label: 'Blindagem' };
  }
}
