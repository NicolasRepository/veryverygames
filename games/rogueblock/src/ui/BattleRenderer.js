import { CONFIG } from '../core/Config.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { DragController } from './DragController.js';

const INTENT_HINTS = {
  attack: 'Ganhe Baluarte ou derrube a vida dele antes.',
  heavy: 'Golpe cataclísmico a caminho — vale gastar azul.',
  buff: 'Se ele ascender em poder, os próximos golpes doem mais.',
  defend: 'A Blindagem dele absorve seu próximo dano.',
};

/* ============================================================================
   BattleRenderer.js — traduz o estado de uma EncounterManager em DOM.
   Única fonte de escrita no #combatScreen. Nunca decide regras de jogo —
   apenas chama métodos públicos de EncounterManager e redesenha a partir
   dos eventos que ela publica.
   ============================================================================ */
export class BattleRenderer {
  constructor(root, { onEnd }) {
    this.root = root;
    this.onEnd = onEnd; // callback: encounter terminou (won/lost já tratado por RunState)
    this.el = {
      board: root.querySelector('#board'),
      hand: root.querySelector('#hand'),
      log: root.querySelector('#log'),
      tip: root.querySelector('#tip'),
      depthTag: root.querySelector('#depthTag'),
      pHp: root.querySelector('#pHp'), pMaxHp: root.querySelector('#pMaxHp'),
      pHpBar: root.querySelector('#pHpBar'), pChips: root.querySelector('#pChips'),
      deckCount: root.querySelector('#deckCount'), discardCount: root.querySelector('#discardCount'),
      eHp: root.querySelector('#eHp'), eMaxHp: root.querySelector('#eMaxHp'),
      eHpBar: root.querySelector('#eHpBar'), eChips: root.querySelector('#eChips'),
      eName: root.querySelector('#eName'), eFace: root.querySelector('#eFace'), eTitle: root.querySelector('#eTitle'),
      intentValue: root.querySelector('#intentValue'), intentHint: root.querySelector('#intentHint'),
      endTurnBtn: root.querySelector('#endTurnBtn'),
      rotateBtn: root.querySelector('#rotateBtn'),
    };
    this.selected = null;
    this.flashing = new Set();
    this.suppressClick = false;
    this.encounter = null;

    this._buildBoard();
    this._bindControls();
    this.drag = new DragController({
      pieceMatrixEl: piece => this._pieceMatrix(piece, { cellSize: 'var(--cell)', gap: 'var(--gap)' }),
      onDragStart: piece => { this.selected = piece; this._renderHand(); },
      onDragMove: (r, c) => { this._clearPreview(); if (r !== null) this._preview(r, c); },
      onDragEnd: (r, c) => {
        this._clearPreview();
        this.suppressClick = true;
        setTimeout(() => { this.suppressClick = false; }, 0);
        if (r !== null) this._tryPlaceAt(r, c); else this.render();
      },
    });

    eventBus.on(EVENTS.ENCOUNTER_UPDATED, encounter => {
      if (encounter === this.encounter) this.render();
    });
    eventBus.on(EVENTS.ENCOUNTER_LINES_CLEARED, ({ cells }) => this._flashCells(cells));
  }

  /** Chamado pelo DOMController ao entrar na tela de combate com um novo confronto. */
  attach(encounter) {
    this.encounter = encounter;
    this.selected = null;
    this._clearPreview();
    this.render();
  }

  _buildBoard() {
    const n = CONFIG.BOARD_SIZE;
    this.el.board.style.gridTemplateColumns = `repeat(${n}, var(--cell))`;
    this.el.board.innerHTML = '';
    this.cells = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const d = document.createElement('div');
        d.className = 'cell';
        d.dataset.r = r; d.dataset.c = c;
        this.el.board.appendChild(d);
        this.cells.push(d);
      }
    }
    this.el.board.addEventListener('click', e => {
      if (this.suppressClick) return;
      const cell = e.target.closest('.cell');
      if (cell) this._tryPlaceAt(+cell.dataset.r, +cell.dataset.c);
    });
    this.el.board.addEventListener('mousemove', e => {
      const cell = e.target.closest('.cell');
      if (cell) this._preview(+cell.dataset.r, +cell.dataset.c);
    });
    this.el.board.addEventListener('mouseleave', () => this._clearPreview());
  }

  _bindControls() {
    this.el.endTurnBtn.addEventListener('click', () => this.encounter?.endTurn());
    this.el.rotateBtn.addEventListener('click', () => this._rotateSelected());
    document.addEventListener('keydown', e => {
      if (this.root.hidden) return;
      if (e.key === 'r' || e.key === 'R') this._rotateSelected();
      if (e.key === 'Escape') { this.selected = null; this._clearPreview(); this.render(); }
      if (e.key === ' ' && this.encounter?.state === 'playing' && e.target === document.body) {
        e.preventDefault(); this.encounter.endTurn();
      }
    });
  }

  _rotateSelected() {
    if (!this.selected) return;
    this.selected.rotate();
    this._clearPreview();
    this.render();
  }

  _cellAt(r, c) { return this.cells[r * CONFIG.BOARD_SIZE + c]; }

  _preview(row, col) {
    this._clearPreview();
    if (!this.selected || this.encounter?.state !== 'playing') return;
    const ok = this.encounter.board.canPlace(this.selected, row, col);
    this.selected.cells.forEach(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      if (r < CONFIG.BOARD_SIZE && c < CONFIG.BOARD_SIZE) {
        const el = this._cellAt(r, c);
        if (el) el.classList.add(ok ? 'preview-ok' : 'preview-bad');
      }
    });
  }
  _clearPreview() { this.cells.forEach(c => c.classList.remove('preview-ok', 'preview-bad')); }

  _tryPlaceAt(row, col) {
    if (!this.selected) { this.el.tip.textContent = 'Escolha uma Relíquia da mão primeiro.'; return; }
    const piece = this.selected;
    if (this.encounter.playPiece(piece, row, col)) {
      this.selected = null;
      this._clearPreview();
      this.render();
    } else {
      this.el.tip.textContent = 'Não cabe aí. Gire a Relíquia (R) ou tente outro espaço.';
    }
  }

  _flashCells(cells) {
    cells.forEach(([r, c]) => {
      const el = this._cellAt(r, c);
      if (!el) return;
      const data = this.encounter.board.grid[r][c];
      this.flashing.add(`${r}:${c}`);
      el.className = 'cell filled clearing';
      if (data) el.style.background = this._elementCss(data.elementKey);
      setTimeout(() => {
        this.flashing.delete(`${r}:${c}`);
        el.className = 'cell';
        el.style.background = '';
      }, 320);
    });
  }

  _elementCss(elementKey) {
    // pequena indireção local para não importar ElementCatalog aqui e manter
    // este módulo focado só em DOM; a cor já está em variável CSS pelo nome.
    return `var(--${elementKey})`;
  }

  _pieceMatrix(piece, { cellSize = '16px', gap = '3px' } = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = gap;
    wrap.style.gridTemplateColumns = `repeat(${piece.width}, ${cellSize})`;
    const filled = new Set(piece.cells.map(([r, c]) => `${r}:${c}`));
    for (let r = 0; r < piece.height; r++) {
      for (let c = 0; c < piece.width; c++) {
        const b = document.createElement('div');
        const on = filled.has(`${r}:${c}`);
        b.className = 'blk' + (on ? '' : ' off');
        b.style.width = cellSize;
        b.style.height = cellSize;
        b.style.borderRadius = '4px';
        if (on) { b.style.background = piece.element.css; b.style.boxShadow = 'inset 0 -2px 0 rgba(0,0,0,.3)'; }
        wrap.appendChild(b);
      }
    }
    return wrap;
  }

  _renderHand() {
    const hand = this.el.hand;
    hand.innerHTML = '';
    this.encounter.hand.forEach(piece => {
      const node = document.createElement('div');
      node.className = 'piece';
      node.tabIndex = 0;
      node.title = `${piece.name} — ativa ${piece.element.describe(piece.value)} ao completar linha/coluna`;
      node.setAttribute('aria-label', node.title);
      if (this.selected && this.selected.id === piece.id) node.classList.add('selected');
      if (!this.encounter.board.hasRoomFor(piece)) node.classList.add('unplayable');
      node.appendChild(this._pieceMatrix(piece));

      const select = () => {
        this.selected = (this.selected && this.selected.id === piece.id) ? null : piece;
        this._clearPreview();
        this.el.tip.textContent = this.selected
          ? `${piece.name}: ativa ${piece.element.describe(piece.value)} ao completar linha/coluna. Clique no Crisol para encaixar.`
          : 'Clique numa Relíquia e depois no Crisol — ou arraste.';
        this.render();
      };
      node.addEventListener('click', select);
      node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
      node.addEventListener('pointerdown', e => {
        if (this.encounter.state === 'playing') this.drag.startDrag(e, piece);
      });
      hand.appendChild(node);
    });
  }

  _renderBoard() {
    for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
      for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
        if (this.flashing.has(`${r}:${c}`)) continue;
        const el = this._cellAt(r, c);
        const v = this.encounter.board.grid[r][c];
        el.className = 'cell' + (v ? ' filled' : '');
        el.style.background = v ? this._elementCss(v.elementKey) : '';
      }
    }
  }

  _chip(container, cls, icon, text) {
    const s = document.createElement('span');
    s.className = `chip ${cls} pop`;
    s.textContent = `${icon} ${text}`;
    container.appendChild(s);
  }

  render() {
    if (!this.encounter) return;
    const enc = this.encounter, p = enc.adventurer, f = enc.foe;

    this.el.depthTag.textContent = `Profundidade ${enc.depth}${enc.isBoss ? ' — Colheita' : ''}`;
    this.el.pHp.textContent = p.hp;
    this.el.pMaxHp.textContent = p.maxHp;
    this.el.pHpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.el.pChips.innerHTML = '';
    if (p.ward > 0) this._chip(this.el.pChips, 'block', '🛡️', `${p.ward} de Baluarte`);

    this.el.deckCount.textContent = enc.deck.drawPile.length;
    this.el.discardCount.textContent = enc.deck.discard.length;

    this.el.eName.textContent = f.name;
    this.el.eFace.textContent = f.face;
    this.el.eTitle.textContent = f.title;
    this.el.eHp.textContent = f.hp;
    this.el.eMaxHp.textContent = f.maxHp;
    this.el.eHpBar.style.width = `${(f.hp / f.maxHp) * 100}%`;
    this.el.eChips.innerHTML = '';
    if (f.guard > 0) this._chip(this.el.eChips, 'block', '🛡️', `${f.guard} de Blindagem`);
    if (f.corrosion > 0) this._chip(this.el.eChips, 'poison', '☠️', `${f.corrosion} de Corrosão`);
    if (f.might > 0) this._chip(this.el.eChips, 'power', '💪', `+${f.might} de dano`);

    if (f.intent) {
      this.el.intentValue.innerHTML = `<span>${f.intent.icon}</span> ${f.intent.label} <b>${f.intent.value}</b>`;
      this.el.intentHint.textContent = INTENT_HINTS[f.intent.type] || '';
    }

    this._renderBoard();
    this._renderHand();
    this.el.log.innerHTML = enc.logs.map(l => `<p>${l}</p>`).join('');
    this.el.endTurnBtn.disabled = enc.state !== 'playing';

    if (enc.state === 'playing' && enc.hand.length && !enc.hand.some(p2 => enc.board.hasRoomFor(p2))) {
      this.el.tip.textContent = 'Sem espaço para nenhuma Relíquia. Passe o turno para descartar a mão e comprar de novo.';
    }
  }
}
