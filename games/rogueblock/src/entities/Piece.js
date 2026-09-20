import { ShapeCatalog } from '../data/ShapeCatalog.js';
import { ElementCatalog } from '../data/ElementCatalog.js';
import { uid } from '../core/utils.js';

/* ============================================================================
   Piece.js — uma Relíquia: forma + elemento + potência.
   Entidade pura de dados/comportamento geométrico. Não conhece o DOM.
   ============================================================================ */
export class Piece {
  constructor(shapeKey, elementKey, power = 1) {
    this.id = uid('relic');
    this.shapeKey = shapeKey;
    this.elementKey = elementKey;
    this.power = power; // multiplicador do efeito elemental
    this.cells = ShapeCatalog[shapeKey].cells.map(c => [...c]); // cópia rotacionável
  }

  get size() { return this.cells.length; }
  get element() { return ElementCatalog[this.elementKey]; }
  get value() { return Math.round(this.size * this.element.perBlock * this.power); }
  get name() {
    const base = `${ShapeCatalog[this.shapeKey].name} de ${this.element.label}`;
    return this.power > 1 ? `${base} (Reforçada x${this.power})` : base;
  }
  get height() { return Math.max(...this.cells.map(c => c[0])) + 1; }
  get width() { return Math.max(...this.cells.map(c => c[1])) + 1; }

  /** Rotaciona 90° horário e renormaliza a origem para (0,0). */
  rotate() {
    const h = this.height;
    this.cells = this.cells.map(([r, c]) => [c, h - 1 - r]);
    const minR = Math.min(...this.cells.map(c => c[0]));
    const minC = Math.min(...this.cells.map(c => c[1]));
    this.cells = this.cells.map(([r, c]) => [r - minR, c - minC]);
  }

  /** Clona com um novo id — usado ao popular o monte de compra a partir do baralho. */
  clone() {
    const p = new Piece(this.shapeKey, this.elementKey, this.power);
    p.cells = this.cells.map(c => [...c]);
    return p;
  }
}
