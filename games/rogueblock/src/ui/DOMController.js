import { eventBus, EVENTS } from '../core/EventBus.js';
import { BattleRenderer } from './BattleRenderer.js';
import { MapRenderer } from './MapRenderer.js';
import { ShopRenderer } from './ShopRenderer.js';
import { EventRenderer } from './EventRenderer.js';
import { ModalRenderer } from './ModalRenderer.js';

/* ============================================================================
   DOMController.js — o único ponto que decide QUAL tela aparece.
   Assina EVENTS.RUN_CHANGED (emitido por RunState) e alterna a visibilidade
   das seções (#mapScreen, #combatScreen, #shopScreen, #eventScreen),
   delegando o desenho de cada uma ao renderer especializado correspondente.
   ============================================================================ */
export class DOMController {
  constructor(runState) {
    this.runState = runState;
    this.root = document.querySelector('.app');

    this.screens = {
      map: document.getElementById('mapScreen'),
      combat: document.getElementById('combatScreen'),
      shop: document.getElementById('shopScreen'),
      event: document.getElementById('eventScreen'),
    };

    this.currencyBadge = document.getElementById('currencyBadge');
    this.depthTagTop = document.getElementById('depthTagTop');

    this.modal = new ModalRenderer(this.root);
    this.battle = new BattleRenderer(this.screens.combat, {});
    this.map = new MapRenderer(this.screens.map, { onChoose: id => this.runState.chooseNode(id) });
    this.shop = new ShopRenderer(this.screens.shop, {
      runState: this.runState,
      onLeave: () => this.runState.returnToMap(),
    });
    this.event = new EventRenderer(this.screens.event, {
      onChoose: i => this.runState.resolveEventChoice(i),
      onContinue: () => this.runState.returnToMap(),
    });

    this._bindTopbar();

    eventBus.on(EVENTS.RUN_CHANGED, rs => this._onRunChanged(rs));
    eventBus.on(EVENTS.ENCOUNTER_WON, () => this._showRewardModal());
    eventBus.on(EVENTS.ENCOUNTER_LOST, () => this._showGameOverModal());
  }

  _bindTopbar() {
    document.getElementById('restartBtn').addEventListener('click', () => {
      this.modal.hide();
      this.runState.newRun();
    });
    document.getElementById('inventoryBtn').addEventListener('click', () => {
      this.modal.showInventory(this.runState.deck);
    });
  }

  _onRunChanged(runState) {
    this._showScreen(runState.screen);
    this.currencyBadge.textContent = `${runState.currencyIcon} ${runState.currency}`;
    this.depthTagTop.textContent = `Profundidade ${runState.depth}`;

    if (runState.screen === 'map') this.map.render(runState);
    if (runState.screen === 'combat') this.battle.attach(runState.encounter);
    if (runState.screen === 'shop') this.shop.render(runState);
    if (runState.screen === 'event') this.event.render(runState);
  }

  _showScreen(name) {
    // 'reward' e 'gameover' são modais sobre a última tela ativa (combate).
    const visibleKey = (name === 'reward' || name === 'gameover') ? 'combat' : name;
    Object.entries(this.screens).forEach(([key, el]) => { el.hidden = key !== visibleKey; });
  }

  _showRewardModal() {
    const rs = this.runState;
    this.modal.showRewards(rs.depth, rs.rewardOptions, piece => rs.takeReward(piece));
  }

  _showGameOverModal() {
    const rs = this.runState;
    this.modal.showGameOver(rs.depth, rs.deck.cards.length, () => rs.newRun());
  }
}
