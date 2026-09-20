/* ============================================================================
   DragController.js — captura de ponteiro (mouse e toque) para arrastar uma
   Relíquia da mão até o Crisol. Responsabilidade única: interpretar gestos
   de ponteiro e delegar decisões de jogo ao BattleRenderer que o instancia.
   ============================================================================ */
export class DragController {
  /**
   * @param {object} hooks
   *   getPiece: () => Piece atual sendo segurada
   *   onDragStart: (piece) => void
   *   onDragMove: (row, col) => void
   *   onDragEnd: (row, col|null) => void
   *   pieceMatrixEl: (piece) => HTMLElement — desenha o "fantasma" da peça
   */
  constructor(hooks) {
    this.hooks = hooks;
  }

  startDrag(pointerDownEvent, piece) {
    if (pointerDownEvent.button === 2) return;
    let moved = false;
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';

    const paint = () => {
      ghost.innerHTML = '';
      ghost.appendChild(this.hooks.pieceMatrixEl(piece));
    };

    const move = ev => {
      if (!moved) {
        moved = true;
        this.hooks.onDragStart(piece);
        paint();
        document.body.appendChild(ghost);
      }
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top = `${ev.clientY}px`;
      const cell = this._cellUnderPointer(ev);
      this.hooks.onDragMove(cell ? +cell.dataset.r : null, cell ? +cell.dataset.c : null);
    };

    const up = ev => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      if (moved) {
        ghost.remove();
        const cell = this._cellUnderPointer(ev);
        this.hooks.onDragEnd(cell ? +cell.dataset.r : null, cell ? +cell.dataset.c : null);
      }
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  _cellUnderPointer(ev) {
    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    return target && target.closest ? target.closest('.cell') : null;
  }
}
