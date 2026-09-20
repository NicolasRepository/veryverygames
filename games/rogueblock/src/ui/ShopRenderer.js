import { ModalRenderer } from './ModalRenderer.js';
import { ShopSystem } from '../systems/ShopSystem.js';

/* ============================================================================
   ShopRenderer.js — desenha o Entreposto do Mercador Errante: comprar
   Relíquias novas, aprimorar ou remover Relíquias do Baralho atual.
   ============================================================================ */
export class ShopRenderer {
  constructor(root, { runState, onLeave }) {
    this.root = root;
    this.runState = runState;
    this.onLeave = onLeave;
    this.buyEl = root.querySelector('#shopBuyList');
    this.deckEl = root.querySelector('#shopDeckList');
    this.currencyEl = root.querySelector('#shopCurrency');
    this.leaveBtn = root.querySelector('#shopLeaveBtn');
    this.leaveBtn.addEventListener('click', () => this.onLeave());
  }

  render(runState) {
    this.currencyEl.textContent = `${runState.currencyIcon} ${runState.currency} ${runState.currencyName}`;

    this._renderBuyList(runState);
    this._renderDeckOps(runState);
  }

  _renderBuyList(runState) {
    this.buyEl.innerHTML = '';
    (runState.activeShopOffers || []).forEach(offer => {
      const card = document.createElement('div');
      card.className = 'reward shop-item';
      const mini = ModalRenderer.pieceMatrix(offer.piece);
      mini.style.justifyContent = 'center';
      mini.style.minHeight = '36px';
      mini.style.alignContent = 'center';
      mini.style.marginBottom = '10px';
      card.appendChild(mini);
      const name = document.createElement('div');
      name.className = 'name'; name.textContent = offer.piece.name;
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = `${offer.piece.element.icon} ${offer.piece.element.describe(offer.piece.value)}`;
      const price = document.createElement('div');
      price.className = 'shop-price';
      const affordable = runState.currency >= offer.price;
      price.textContent = `${runState.currencyIcon} ${offer.price}`;
      if (!affordable) price.classList.add('unaffordable');
      card.append(name, desc, price);
      if (affordable) {
        card.classList.add('buyable');
        card.addEventListener('click', () => {
          if (runState.buyPiece(offer.piece, offer.price)) this.render(runState);
        });
      }
      this.buyEl.appendChild(card);
    });
  }

  _renderDeckOps(runState) {
    this.deckEl.innerHTML = '';
    const upgradeCost = ShopSystem.upgradeCost(runState.depth);
    const removeCost = ShopSystem.removeCost(runState.depth);

    [...runState.deck.cards].forEach(piece => {
      const row = document.createElement('div');
      row.className = 'shop-deck-row';
      const mini = ModalRenderer.pieceMatrix(piece, { blockSize: '8px', gap: '2px' });
      const info = document.createElement('div');
      info.className = 'shop-deck-row__info';
      info.innerHTML = `<b>${piece.name}</b><span>${piece.element.icon} ${piece.element.describe(piece.value)}</span>`;
      const actions = document.createElement('div');
      actions.className = 'shop-deck-row__actions';

      const upgradeBtn = document.createElement('button');
      upgradeBtn.className = 'ghost-btn small';
      upgradeBtn.textContent = `Aprimorar (${runState.currencyIcon}${upgradeCost})`;
      upgradeBtn.disabled = runState.currency < upgradeCost;
      upgradeBtn.addEventListener('click', () => {
        if (runState.upgradePiece(piece.id, upgradeCost)) this.render(runState);
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'ghost-btn small danger';
      removeBtn.textContent = `Remover (${runState.currencyIcon}${removeCost})`;
      removeBtn.disabled = runState.currency < removeCost;
      removeBtn.addEventListener('click', () => {
        if (runState.removePiece(piece.id, removeCost)) this.render(runState);
      });

      actions.append(upgradeBtn, removeBtn);
      row.append(mini, info, actions);
      this.deckEl.appendChild(row);
    });
  }
}
