import { Board } from '../entities/Board.js';
import { CONFIG } from '../core/Config.js';
import { ElementCatalog } from '../data/ElementCatalog.js';
import { FoeCodex } from './FoeCodex.js';
import { eventBus, EVENTS } from '../core/EventBus.js';

/* ============================================================================
   EncounterManager.js — a máquina de estados de UM Confronto.

   Não sabe nada sobre DOM. Toda mudança relevante é publicada no EventBus;
   quem estiver ouvindo (BattleRenderer) decide como desenhar. O estado
   persistente entre Confrontos (vida do Peregrino, Baralho, moeda) vive em
   RunState — esta classe só orquestra uma batalha isolada.
   ============================================================================ */
export class EncounterManager {
  /**
   * @param {Adventurer} adventurer — persiste entre Confrontos, não é recriado aqui.
   * @param {Deck} deck — o Baralho da Jornada; o monte de compra é reembaralhado.
   * @param {number} depth — profundidade atual do mapa (afeta dificuldade/recompensa).
   * @param {boolean} isBoss — true quando este nó é uma Colheita (chefe).
   */
  constructor(adventurer, deck, depth, isBoss = false) {
    this.adventurer = adventurer;
    this.deck = deck;
    this.depth = depth;
    this.isBoss = isBoss;

    this.foe = FoeCodex.create(depth, { isBoss });
    this.board = new Board(CONFIG.BOARD_SIZE);
    this.deck.reset();
    this.hand = [];
    this.logs = [];
    this.state = 'playing'; // playing | reward | lost

    this.log(`<b>${isBoss ? 'Uma Colheita se anuncia' : 'Confronto'}</b> — ${this.foe.name} aparece.`);
    this.startPlayerTurn();
  }

  log(html) {
    this.logs.unshift(html);
    if (this.logs.length > 40) this.logs.pop();
  }

  startPlayerTurn() {
    this.state = 'playing';
    this.adventurer.ward = 0; // Baluarte não acumula entre turnos
    this._discardHand();
    this.hand = this.deck.draw(CONFIG.HAND_SIZE);
    this.foe.rollIntent();
    eventBus.emit(EVENTS.ENCOUNTER_UPDATED, this);
  }

  _discardHand() {
    this.deck.discard.push(...this.hand);
    this.hand = [];
  }

  strikeFoe(v) {
    const { absorbed, taken } = this.foe.receiveDamage(v);
    this.log(`Você causa <b>${taken}</b> de dano${absorbed ? ` (${absorbed} bloqueado)` : ''}.`);
    this._checkFoeDeath();
  }

  /**
   * Joga uma Relíquia da mão no Crisol. Ela não faz nada sozinha — apenas
   * grava elemento e potência nas células. Retorna true se encaixou.
   */
  playPiece(piece, row, col) {
    if (this.state !== 'playing') return false;
    if (!this.board.canPlace(piece, row, col)) return false;

    this.board.place(piece, row, col);
    this.hand = this.hand.filter(p => p.id !== piece.id);
    this.deck.discard.push(piece);

    this._resolveLineClears();

    if (this.state === 'playing') eventBus.emit(EVENTS.ENCOUNTER_UPDATED, this);
    return true;
  }

  /**
   * Efeitos só disparam aqui, quando uma ou mais linhas/colunas fecham.
   * Todo elemento presente nas células limpas soma seu valor e o total é
   * multiplicado por lineCount — limpar 2 linhas de uma vez dobra o
   * efeito, 3 triplica, e assim por diante.
   */
  _resolveLineClears() {
    const { lineCount, cells } = this.board.findFullLines();
    if (lineCount === 0) return;

    eventBus.emit(EVENTS.ENCOUNTER_LINES_CLEARED, { cells, board: this.board });

    const totals = {};
    cells.forEach(([r, c]) => {
      const data = this.board.grid[r][c];
      const perBlock = ElementCatalog[data.elementKey].perBlock;
      totals[data.elementKey] = (totals[data.elementKey] || 0) + perBlock * data.power;
    });

    this.board.clearCells(cells);

    this.log(`<b>${lineCount} linha${lineCount > 1 ? 's' : ''} limpa${lineCount > 1 ? 's' : ''}!</b>` +
      (lineCount > 1 ? ` Multiplicador x${lineCount}.` : ''));

    for (const elementKey of Object.keys(totals)) {
      const value = Math.round(totals[elementKey] * lineCount);
      if (value > 0) ElementCatalog[elementKey].apply(this, value);
      if (this.state !== 'playing') return; // o Arauto pode morrer no meio da soma
    }

    const room = CONFIG.MAX_HAND - this.hand.length;
    const drawn = this.deck.draw(Math.min(room, CONFIG.LINE_CLEAR_DRAW * lineCount));
    this.hand.push(...drawn);
  }

  _checkFoeDeath() {
    if (this.foe.dead && this.state === 'playing') {
      this.state = 'reward';
      this.log(`<b>${this.foe.name} foi derrotado.</b>`);
      eventBus.emit(EVENTS.ENCOUNTER_WON, { depth: this.depth, isBoss: this.isBoss });
    }
  }

  endTurn() {
    if (this.state !== 'playing') return;

    // Corrosão age no fim do turno do Peregrino e perde 1 de intensidade
    if (this.foe.corrosion > 0) {
      const p = this.foe.corrosion;
      this.foe.hp = Math.max(0, this.foe.hp - p);
      this.foe.corrosion = Math.max(0, p - 1);
      this.log(`Corrosão Astral causa <b>${p}</b> de dano.`);
      this._checkFoeDeath();
      if (this.state !== 'playing') return;
    }

    this._foeTurn();
    if (this.state !== 'playing') return;
    this.startPlayerTurn();
  }

  _foeTurn() {
    this.foe.guard = 0;
    const it = this.foe.intent;
    if (!it) return;

    if (it.type === 'attack' || it.type === 'heavy') {
      const { absorbed, taken } = this.adventurer.receiveDamage(it.value);
      this.log(`${this.foe.name} ataca: <b>${taken}</b> de dano${absorbed ? ` (${absorbed} no Baluarte)` : ''}.`);
    } else if (it.type === 'buff') {
      this.foe.might += it.value;
      this.log(`${this.foe.name} ascende em poder (+${it.value} de dano).`);
    } else if (it.type === 'defend') {
      this.foe.guard += it.value;
      this.log(`${this.foe.name} se blinda (+${it.value} de escudo).`);
    }

    if (this.adventurer.dead) {
      this.state = 'lost';
      eventBus.emit(EVENTS.ENCOUNTER_LOST, { depth: this.depth });
    }
  }
}
