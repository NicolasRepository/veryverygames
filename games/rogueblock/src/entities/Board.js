/* ============================================================================
   Board.js — o Crisol: o tabuleiro onde as Relíquias são encaixadas.
   ============================================================================ */
export class Board {
  constructor(size) { this.size = size; this.reset(); }

  reset() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(null));
  }

  cellsAt(piece, row, col) { return piece.cells.map(([r, c]) => [row + r, col + c]); }

  canPlace(piece, row, col) {
    return this.cellsAt(piece, row, col).every(([r, c]) =>
      r >= 0 && c >= 0 && r < this.size && c < this.size && !this.grid[r][c]);
  }

  place(piece, row, col) {
    // Cada célula guarda o elemento e a potência da peça que a preencheu —
    // é isso que o elemento usa quando a linha/coluna é finalmente completada.
    this.cellsAt(piece, row, col).forEach(([r, c]) => {
      this.grid[r][c] = { elementKey: piece.elementKey, power: piece.power };
    });
  }

  /** Existe algum encaixe válido para esta peça, em qualquer rotação? */
  hasRoomFor(piece) {
    const test = piece.clone();
    for (let rot = 0; rot < 4; rot++) {
      for (let r = 0; r < this.size; r++)
        for (let c = 0; c < this.size; c++)
          if (this.canPlace(test, r, c)) return true;
      test.rotate();
    }
    return false;
  }

  /**
   * Retorna as linhas/colunas cheias (sem apagar ainda):
   * - lineCount: quantas linhas E colunas estão cheias ao mesmo tempo — vira
   *   o multiplicador do efeito (x2, x3, x4...).
   * - cells: células únicas a limpar (um cruzamento linha×coluna cheia não
   *   é contado duas vezes).
   */
  findFullLines() {
    const cellSet = new Map();
    let lineCount = 0;
    for (let r = 0; r < this.size; r++)
      if (this.grid[r].every(Boolean)) {
        lineCount++;
        for (let c = 0; c < this.size; c++) cellSet.set(`${r}:${c}`, [r, c]);
      }
    for (let c = 0; c < this.size; c++)
      if (this.grid.every(row => row[c])) {
        lineCount++;
        for (let r = 0; r < this.size; r++) cellSet.set(`${r}:${c}`, [r, c]);
      }
    return { lineCount, cells: [...cellSet.values()] };
  }

  clearCells(cells) { cells.forEach(([r, c]) => { this.grid[r][c] = null; }); }
}
