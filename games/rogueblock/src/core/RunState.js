import { CONFIG } from './Config.js';
import { eventBus, EVENTS } from './EventBus.js';
import { Adventurer } from '../entities/Adventurer.js';
import { Deck } from '../entities/Deck.js';
import { Piece } from '../entities/Piece.js';
import { STARTING_DECK } from '../data/StartingDeck.js';
import { EncounterManager } from '../systems/EncounterManager.js';
import { MapGenerator } from '../systems/MapGenerator.js';
import { RewardForge } from '../systems/RewardForge.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { EventSystem } from '../systems/EventSystem.js';

/* ============================================================================
   RunState.js — a fonte única de verdade da Jornada (meta-jogo).

   Guarda tudo que persiste além de um único Confronto: moeda, Baralho,
   Peregrino, profundidade no mapa e a tela atual. Delega a lógica de cada
   nó a um sistema especializado (EncounterManager, ShopSystem, EventSystem)
   e nunca toca o DOM — toda mudança é publicada em EVENTS.RUN_CHANGED para
   quem estiver ouvindo (DOMController).
   ============================================================================ */
export class RunState {
  constructor() {
    this.currencyIcon = CONFIG.CURRENCY_ICON;
    this.currencyName = CONFIG.CURRENCY_NAME;
    this._unsubscribers = [];
  }

  newRun() {
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];

    this.depth = 1;
    this.currency = 0;
    this.adventurer = new Adventurer(CONFIG.ADVENTURER_MAX_HP);
    this.deck = new Deck(STARTING_DECK, Piece);
    this.encounter = null;
    this.activeEvent = null;
    this.activeShopOffers = null;
    this.lastEventOutcome = null;
    this.screen = 'map';
    this.currentWave = MapGenerator.generateWave(this.depth);

    this._unsubscribers.push(
      eventBus.on(EVENTS.ENCOUNTER_WON, payload => this._onEncounterWon(payload)),
      eventBus.on(EVENTS.ENCOUNTER_LOST, () => this._onEncounterLost()),
    );

    this._publish();
  }

  _publish() { eventBus.emit(EVENTS.RUN_CHANGED, this); }

  addCurrency(v) { this.currency += v; this._publish(); }
  spendCurrency(v) { this.currency = Math.max(0, this.currency - v); this._publish(); }

  /* --------------------------- navegação do mapa --------------------------- */

  chooseNode(nodeId) {
    const node = this.currentWave.find(n => n.id === nodeId);
    if (!node) return;

    let resolvedType = node.type;
    if (resolvedType === 'mystery') resolvedType = MapGenerator.revealMystery(node.depth);

    if (resolvedType === 'combat' || resolvedType === 'boss') {
      this._startEncounter(resolvedType === 'boss');
    } else if (resolvedType === 'shop') {
      this.activeShopOffers = ShopSystem.generateOffers(this.depth);
      this.screen = 'shop';
      this._publish();
    } else if (resolvedType === 'event') {
      this.activeEvent = EventSystem.roll();
      this.lastEventOutcome = null;
      this.screen = 'event';
      this._publish();
    }
  }

  _startEncounter(isBoss) {
    this.encounter = new EncounterManager(this.adventurer, this.deck, this.depth, isBoss);
    this.screen = 'combat';
    this._publish();
  }

  _onEncounterWon({ depth, isBoss }) {
    const gained = CONFIG.ECONOMY.WIN_BASE + CONFIG.ECONOMY.WIN_PER_DEPTH * depth + (isBoss ? 40 : 0);
    this.currency += gained;
    this.lastRewardGain = gained;
    this.rewardOptions = RewardForge.forgeThree(depth + 1);
    this.screen = 'reward';
    this._publish();
  }

  _onEncounterLost() {
    this.screen = 'gameover';
    this._publish();
  }

  /** Escolhe (ou recusa) uma Relíquia de recompensa e avança para a próxima onda. */
  takeReward(piece) {
    if (piece) this.deck.add(piece);
    this.encounter = null;
    this.rewardOptions = null;
    this._advanceWave();
  }

  /** Sai da Loja ou de um Vestígio resolvido e volta ao mapa na próxima onda. */
  returnToMap() {
    this.activeShopOffers = null;
    this.activeEvent = null;
    this.lastEventOutcome = null;
    this._advanceWave();
  }

  _advanceWave() {
    this.depth++;
    this.currentWave = MapGenerator.generateWave(this.depth);
    this.screen = 'map';
    this._publish();
  }

  /* ------------------------------ loja ------------------------------ */

  buyPiece(piece, price) {
    if (this.currency < price) return false;
    this.spendCurrency(price);
    this.deck.add(piece);
    return true;
  }

  upgradePiece(pieceId, cost) {
    if (this.currency < cost) return false;
    const piece = this.deck.cards.find(p => p.id === pieceId);
    if (!piece) return false;
    piece.power += 1;
    this.spendCurrency(cost);
    return true;
  }

  removePiece(pieceId, cost) {
    if (this.currency < cost) return false;
    this.deck.remove(pieceId);
    this.spendCurrency(cost);
    return true;
  }

  /* ------------------------------ eventos ------------------------------ */

  resolveEventChoice(choiceIndex) {
    if (!this.activeEvent) return;
    const outcome = EventSystem.resolveChoice(this.activeEvent, choiceIndex, this);
    this.lastEventOutcome = outcome;
    this._publish();
  }
}
