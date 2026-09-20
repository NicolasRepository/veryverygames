/* ============================================================================
   ModalRenderer.js — responsável apenas pelo overlay modal genérico:
   recompensas pós-Confronto, tela de fim de jogo e o Inventário de Relíquias.
   ============================================================================ */
export class ModalRenderer {
  constructor(root) {
    this.overlay = root.querySelector('#overlay');
    this.modal = root.querySelector('#modal');
  }

  show(html) { this.modal.innerHTML = html; this.overlay.hidden = false; }
  hide() { this.overlay.hidden = true; }

  /** Desenha a matriz de blocos de uma peça (reutilizado por várias telas). */
  static pieceMatrix(piece, { blockSize = '10px', gap = '3px' } = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = gap;
    wrap.style.gridTemplateColumns = `repeat(${piece.width}, auto)`;
    const filled = new Set(piece.cells.map(([r, c]) => `${r}:${c}`));
    for (let r = 0; r < piece.height; r++) {
      for (let c = 0; c < piece.width; c++) {
        const b = document.createElement('div');
        const on = filled.has(`${r}:${c}`);
        b.style.width = blockSize;
        b.style.height = blockSize;
        b.style.borderRadius = '3px';
        b.style.background = on ? piece.element.css : 'transparent';
        if (on) b.style.boxShadow = 'inset 0 -2px 0 rgba(0,0,0,.3)';
        wrap.appendChild(b);
      }
    }
    return wrap;
  }

  showRewards(depth, options, onTake) {
    this.show(`
      <h2>Profundidade ${depth - 1} superada</h2>
      <p>Escolha uma Relíquia para levar ao Baralho. Ela acompanha você pelo resto da Jornada.</p>
      <div class="rewards" id="rewards"></div>
      <button class="ghost-btn" id="skipReward">Seguir sem levar nada</button>
    `);
    const box = this.modal.querySelector('#rewards');
    options.forEach(piece => {
      const card = document.createElement('div');
      card.className = 'reward';
      card.tabIndex = 0;
      const mini = ModalRenderer.pieceMatrix(piece);
      mini.style.justifyContent = 'center';
      mini.style.minHeight = '40px';
      mini.style.alignContent = 'center';
      mini.style.marginBottom = '12px';
      card.appendChild(mini);
      const name = document.createElement('div');
      name.className = 'name'; name.textContent = piece.name;
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = `${piece.element.icon} ${piece.element.describe(piece.value)} · ${piece.size} blocos`;
      card.append(name, desc);
      const take = () => { this.hide(); onTake(piece); };
      card.addEventListener('click', take);
      card.addEventListener('keydown', ev => { if (ev.key === 'Enter') take(); });
      box.appendChild(card);
    });
    this.modal.querySelector('#skipReward').addEventListener('click', () => { this.hide(); onTake(null); });
  }

  showGameOver(depth, deckSize, onRestart) {
    this.show(`
      <h2>A Jornada termina aqui</h2>
      <p>Você caiu na profundidade ${depth} com um Baralho de ${deckSize} Relíquias.</p>
      <button class="end-turn" id="againBtn">Começar nova Jornada</button>
    `);
    this.modal.querySelector('#againBtn').addEventListener('click', () => { this.hide(); onRestart(); });
  }

  showInventory(deck) {
    this.show(`
      <h2>Baralho da Jornada</h2>
      <p>${deck.cards.length} Relíquia${deck.cards.length === 1 ? '' : 's'} carregada${deck.cards.length === 1 ? '' : 's'} atualmente.</p>
      <div class="inventory-grid" id="inventoryGrid"></div>
      <button class="ghost-btn" id="closeInventory">Fechar</button>
    `);
    const grid = this.modal.querySelector('#inventoryGrid');
    [...deck.cards]
      .sort((a, b) => a.elementKey.localeCompare(b.elementKey) || a.size - b.size)
      .forEach(piece => {
        const card = document.createElement('div');
        card.className = 'reward inventory-item';
        const mini = ModalRenderer.pieceMatrix(piece);
        mini.style.justifyContent = 'center';
        mini.style.minHeight = '36px';
        mini.style.alignContent = 'center';
        mini.style.marginBottom = '10px';
        card.appendChild(mini);
        const name = document.createElement('div');
        name.className = 'name'; name.textContent = piece.name;
        const desc = document.createElement('div');
        desc.className = 'desc';
        desc.textContent = `${piece.element.icon} ${piece.element.describe(piece.value)}`;
        card.append(name, desc);
        grid.appendChild(card);
      });
    this.modal.querySelector('#closeInventory').addEventListener('click', () => this.hide());
  }
}
