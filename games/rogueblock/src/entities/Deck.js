/* ============================================================================
   Deck.js — o Baralho de Relíquias do Peregrino. Persiste durante toda a
   Jornada (run); a cada Confronto, o monte de compra é reembaralhado a
   partir de `cards` (ver EncounterManager.startEncounter).
   ============================================================================ */
export class Deck {
  constructor(entries, PieceClass) {
    this.Piece = PieceClass;
    this.cards = entries.map(([shape, element]) => new PieceClass(shape, element));
    this.drawPile = [];
    this.discard = [];
  }

  /** Reembaralha o monte de compra a partir das cartas base do baralho. */
  reset() {
    this.drawPile = this.cards.map(p => p.clone());
    this.discard = [];
    this.shuffle();
  }

  shuffle() {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  draw(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!this.drawPile.length) {
        if (!this.discard.length) break;
        this.drawPile = this.discard;
        this.discard = [];
        this.shuffle();
      }
      out.push(this.drawPile.pop());
    }
    return out;
  }

  add(piece) { this.cards.push(piece); }

  remove(pieceId) {
    this.cards = this.cards.filter(p => p.id !== pieceId);
  }
}
